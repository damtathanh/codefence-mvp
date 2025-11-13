import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { FileUploader } from "../../components/ui/FileUploader";
import { Send, Download, File, Megaphone } from "lucide-react";
import { useAuth } from "../../features/auth";
import {
  formatMessageTimestamp,
  formatMessageTimestampWithName,
} from "../../utils/formatTimestamp";
import { uploadFile } from "../../utils/uploadFile";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../components/ui/Toast";
import type { Message, UserProfile } from "../../types/supabase";

interface ConversationUser {
  id: string;
  email: string;
  full_name: string | null;
  lastMessage: Message | null;
  unreadCount: number;
}

export const AdminMessagePage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationUser[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [adminProfiles, setAdminProfiles] = useState<Map<string, UserProfile>>(
    new Map()
  );
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Load admins (id list + profile map)
  useEffect(() => {
    let mounted = true;
    const loadAdmins = async () => {
      try {
        const { data } = await supabase
          .from("users_profile")
          .select("id, email, full_name, role")
          .or("role.eq.admin,email.ilike.%@codfence.com");

        if (!mounted) return;
        if (data) {
          const map = new Map<string, UserProfile>();
          const ids: string[] = [];
          data.forEach((a: any) => {
            map.set(a.id, {
              id: a.id,
              email: a.email,
              full_name: a.full_name,
              role: a.role || "admin",
              phone: null,
              company_name: null,
              avatar_url: null,
              created_at: new Date().toISOString(),
            } as UserProfile);
            ids.push(a.id);
          });
          setAdminProfiles(map);
          setAdminIds(ids);
        }
      } catch (err) {
        console.error("Error loading admins:", err);
      }
    };
    loadAdmins();
    return () => {
      mounted = false;
    };
  }, []);

  // ------------------------
  // Fetch inbox conversations (group by user)
  // ------------------------
  const fetchInbox = useCallback(async () => {
    if (!adminUser) return;
    setLoadingConversations(true);
    try {
      // 1) user -> admin messages (receiver_id IS NULL)
      const { data: fromUsers, error: userErr } = await supabase
        .from("messages")
        .select("*")
        .is("receiver_id", null)
        .order("created_at", { ascending: false });

      if (userErr) throw userErr;

      const userMessages = fromUsers || [];

      // 2) get user ids from those messages, excluding admin ids
      const userIds = Array.from(
        new Set(userMessages.map((m: Message) => m.sender_id).filter((id) => !adminIds.includes(id)))
      );

      if (userIds.length === 0) {
        setConversations([]);
        setLoadingConversations(false);
        return;
      }

      // 3) fetch all messages where receiver_id IN userIds (these include admin replies)
      const { data: replies, error: replyErr } = await supabase
        .from("messages")
        .select("*")
        .in("receiver_id", userIds)
        .order("created_at", { ascending: false });

      if (replyErr) throw replyErr;

      const all = [...userMessages, ...(replies || [])];

      // 4) group by user id
      const map = new Map<string, Message[]>();
      all.forEach((m: Message) => {
        let uid: string | null = null;
        if (m.receiver_id === null) {
          // user -> admin
          uid = m.sender_id;
        } else if (adminIds.includes(m.sender_id) && userIds.includes(m.receiver_id)) {
          // admin -> user
          uid = m.receiver_id;
        }
        if (!uid) return;
        if (!map.has(uid)) map.set(uid, []);
        map.get(uid)!.push(m);
      });

      // 5) fetch profiles for those users
      const { data: profiles } = await supabase
        .from("users_profile")
        .select("id, email, full_name")
        .in("id", Array.from(map.keys()));

      const pmap = new Map<string, any>();
      profiles?.forEach((p: any) => pmap.set(p.id, p));

      // 6) build conversation list
      const convs: ConversationUser[] = Array.from(map.entries()).map(([userId, msgs]) => {
        msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const unreadCount = msgs.filter((m) => m.receiver_id === null && !m.read && m.sender_id === userId).length;
        const profile = pmap.get(userId);
        return {
          id: userId,
          email: profile?.email || userId,
          full_name: profile?.full_name || null,
          lastMessage: msgs[0] || null,
          unreadCount,
        };
      });

      convs.sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      });

      setConversations(convs);
    } catch (err) {
      console.error("fetchInbox error:", err);
      showError("Failed to load conversations.");
    } finally {
      setLoadingConversations(false);
    }
  }, [adminUser, adminIds, showError]);

  // initial inbox + realtime subscription for inbox-level changes
  useEffect(() => {
    fetchInbox();

    // Realtime: listen for INSERT/UPDATE on messages and refresh inbox when relevant:
    const channel = supabase
      .channel("messages_admin_inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          // Conditions to refresh inbox:
          // 1) user -> admin (receiver_id === null)
          // 2) admin reply to a user (sender_id is admin AND receiver_id is a user)
          if (!msg) return;
          const isUserMessage = msg.receiver_id === null;
          const isAdminReplyToUser = adminIds.includes(msg.sender_id) && msg.receiver_id && !adminIds.includes(msg.receiver_id);
          if (isUserMessage || isAdminReplyToUser) {
            fetchInbox();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInbox, adminIds]);

  // ------------------------
  // Fetch messages for selectedUser (conversation detail)
  // ------------------------
  const fetchMessagesForUser = useCallback(async (userId: string | null) => {
    if (!adminUser || !userId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    try {
      // user messages (sender = user, receiver = null)
      const { data: userMsgs, error: uerr } = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", userId)
        .is("receiver_id", null)
        .order("created_at", { ascending: true });

      if (uerr) throw uerr;

      // admin replies (receiver = userId)
      const { data: adminReplies, error: rerr } = await supabase
        .from("messages")
        .select("*")
        .eq("receiver_id", userId)
        .order("created_at", { ascending: true });

      if (rerr) throw rerr;

      const all = [...(userMsgs || []), ...(adminReplies || [])];
      all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(all);

      // mark unread user->admin messages as read (so admin marking seen)
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", userId)
        .is("receiver_id", null)
        .eq("read", false);
      // refresh inbox after marking read
      fetchInbox();
    } catch (err) {
      console.error("fetchMessagesForUser error:", err);
      showError("Failed to load messages.");
    } finally {
      setMessagesLoading(false);
    }
  }, [adminUser, fetchInbox, showError]);

  // when selectedUser changes, fetch messages + setup realtime for this conversation
  useEffect(() => {
    fetchMessagesForUser(selectedUser);

    if (!selectedUser) return;

    const channel = supabase
      .channel(`messages_conversation_${selectedUser}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (!msg) return;
          // Relevant if:
          // - user sent message to admin (sender_id === selectedUser && receiver_id === null)
          // - admin replied to this user (receiver_id === selectedUser)
          if ((msg.sender_id === selectedUser && msg.receiver_id === null) || msg.receiver_id === selectedUser) {
            fetchMessagesForUser(selectedUser);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser, fetchMessagesForUser]);

  // auto-scroll when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ------------------------
  // Send admin reply
  // ------------------------
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminUser || !selectedUser) return;
    if (!newMessage.trim() && !selectedFile) return;

    setUploading(true);
    try {
      let attachmentUrl: string | null = null;
      if (selectedFile) {
        attachmentUrl = await uploadFile(selectedFile);
      }

      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: adminUser.id,
          receiver_id: selectedUser,
          message: newMessage.trim() || null,
          attachment_url: attachmentUrl,
          read: false,
          system_message: false,
          broadcast: false,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      setNewMessage("");
      setSelectedFile(null);

      // We rely on realtime subscription to refresh messages for both admin & user.
      // But to improve UX we optimistically append the message locally:
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          sender_id: adminUser.id,
          receiver_id: selectedUser,
          message: newMessage.trim() || null,
          attachment_url: attachmentUrl,
          read: false,
          system_message: false,
          broadcast: false,
          created_at: new Date().toISOString(),
        } as unknown as Message,
      ]);
      fetchInbox(); // update inbox quick
    } catch (err) {
      console.error("send reply error:", err);
      showError("Failed to send message. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ------------------------
  // Broadcast
  // ------------------------
  const handleBroadcast = async () => {
    if (!adminUser) return;
    if (!broadcastMessage.trim() && !broadcastFile) return;
    setUploading(true);
    try {
      let attachmentUrl: string | null = null;
      if (broadcastFile) {
        attachmentUrl = await uploadFile(broadcastFile);
      }

      // get all users (exclude admins)
      const { data: allUsers, error: usersErr } = await supabase
        .from("users_profile")
        .select("id, email, role");

      if (usersErr) throw usersErr;

      const users = (allUsers || []).filter(
        (u: any) => u.role !== "admin" && !(u.email || "").toLowerCase().endsWith("@codfence.com")
      );

      if (users.length === 0) {
        showError("No users found to broadcast to.");
        setUploading(false);
        return;
      }

      const inserts = users.map((u: any) => ({
        sender_id: adminUser.id,
        receiver_id: u.id,
        message: broadcastMessage.trim() || null,
        attachment_url: attachmentUrl,
        read: false,
        system_message: false,
        broadcast: true,
        created_at: new Date().toISOString(),
      }));

      const { error: insertErr } = await supabase.from("messages").insert(inserts);
      if (insertErr) throw insertErr;

      showSuccess(`Broadcast sent to ${users.length} user(s).`);
      setBroadcastFile(null);
      setBroadcastMessage("");
    } catch (err) {
      console.error("broadcast error:", err);
      showError("Failed to broadcast message.");
    } finally {
      setUploading(false);
    }
  };

  // Helper: get admin name by id
  const getAdminName = (adminId?: string) => {
    if (!adminId) return "Admin";
    const p = adminProfiles.get(adminId);
    return p?.full_name || p?.email || "Admin";
  };

  return (
    <div className="flex h-full gap-4">
      {/* Left Panel - Inbox */}
      <div className="w-80 flex-shrink-0 border-r border-[#1E223D]">
        <Card className="h-full rounded-none border-0">
          <CardHeader className="border-b border-[#1E223D]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Inbox</CardTitle>
              <Button size="sm" onClick={() => {
                // show broadcast by toggling a simple UI. We'll reuse broadcast state by toggling a dedicated modal UX if needed.
                // For simplicity, we set broadcastMessage focus by opening a minimal inline form below.
                setBroadcastMessage("");
              }} className="button-gradient">
                <Megaphone size={16} className="mr-1" /> Broadcast
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingConversations ? (
              <div className="p-4 text-center text-[#E5E7EB]/70">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-[#E5E7EB]/70">No conversations yet</div>
            ) : (
              <div className="divide-y divide-[#1E223D]">
                {conversations.map((conv) => {
                  const isSelected = conv.id === selectedUser;
                  const hasUnread = conv.unreadCount > 0;
                  const lastText = conv.lastMessage?.message || (conv.lastMessage?.attachment_url ? "Attachment" : "");
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedUser(conv.id)}
                      className={`w-full text-left p-4 hover:bg-[#1E223D]/50 transition ${
                        isSelected ? "bg-[#2E3661] shadow-blue-400/30" : hasUnread ? "bg-[#17203a]" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{conv.full_name || conv.email}</p>
                          {conv.lastMessage && (
                            <p className="text-sm text-[#E5E7EB]/70 truncate mt-1">{lastText}</p>
                          )}
                        </div>
                        {hasUnread && (
                          <span className="flex-shrink-0 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-[#AAB0C8] mt-1">
                          {formatMessageTimestamp(conv.lastMessage.created_at)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Conversation */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <Card className="h-full rounded-none border-0 flex flex-col">
            <CardHeader className="border-b border-[#1E223D] flex-shrink-0">
              <CardTitle>
                {conversations.find(c => c.id === selectedUser)?.full_name ||
                  conversations.find(c => c.id === selectedUser)?.email ||
                  "User"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col !p-0 min-h-0">
              {/* messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0B0F28]">
                {messagesLoading ? (
                  <div className="text-center text-[#E5E7EB]/70 py-8">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-[#E5E7EB]/70 py-8">No messages yet</div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = adminIds.includes(m.sender_id);
                    const isImage = !!m.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    const isSystem = m.system_message;
                    const adminName = isAdmin ? getAdminName(m.sender_id) : undefined;
                    return (
                      <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isSystem ? "bg-[#2A2E45] text-[#9CA3AF] italic" : isAdmin ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white" : "bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] text-white"}`}>
                          {m.attachment_url && (
                            <div className="mb-2">
                              {isImage ? (
                                <img src={m.attachment_url} alt="Attachment" className="max-w-[200px] max-h-[200px] rounded-lg object-cover" />
                              ) : (
                                <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/90 hover:text-white transition">
                                  <File size={16} />
                                  <span className="text-sm truncate">{m.attachment_url.split("/").pop()}</span>
                                  <Download size={14} />
                                </a>
                              )}
                            </div>
                          )}
                          {m.message && <p className="text-sm">{m.message}</p>}
                          <p className={`text-xs mt-1 ${isSystem ? "text-[#9CA3AF]" : "text-white/70"} ${isAdmin ? "text-right" : ""}`}>
                            {isAdmin && !isSystem ? formatMessageTimestampWithName(m.created_at, adminName || "Admin") : formatMessageTimestamp(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* input */}
              <div className="border-t border-[#1E223D] p-3 bg-[#0B0F28] flex-shrink-0 space-y-2">
                <FileUploader onFileSelect={setSelectedFile} onRemove={() => setSelectedFile(null)} selectedFile={selectedFile} />
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input placeholder="Type your message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1" disabled={uploading} />
                  <Button type="submit" size="sm" disabled={uploading || (!newMessage.trim() && !selectedFile)} className="button-gradient">
                    <Send size={18} />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full rounded-none border-0">
            <CardContent className="p-12 text-center">
              <p className="text-[#E5E7EB]/70">Select a conversation to start messaging</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Broadcast minimal panel (inline modal can be improved in UI) */}
      <div className="w-80">
        <Card className="rounded-none border-0">
          <CardHeader className="border-b border-[#1E223D]">
            <CardTitle>Broadcast</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploader onFileSelect={setBroadcastFile} onRemove={() => setBroadcastFile(null)} selectedFile={broadcastFile} />
            <Input value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder="Broadcast message..." />
            <div className="flex gap-2 justify-end mt-3">
              <Button variant="outline" onClick={() => { setBroadcastMessage(""); setBroadcastFile(null); }} disabled={uploading}>Cancel</Button>
              <Button onClick={handleBroadcast} disabled={uploading || (!broadcastMessage.trim() && !broadcastFile)} className="button-gradient">
                {uploading ? "Sending..." : "Send Broadcast"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminMessagePage;

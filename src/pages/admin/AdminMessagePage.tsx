import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { FileUploader } from "../../components/ui/FileUploader";
import { Send, Download, File } from "lucide-react";
import { useAuth } from "../../features/auth";
import { formatMessageTimestamp, formatMessageTimestampWithName } from "../../utils/formatTimestamp";
import { uploadFile } from "../../utils/uploadFile";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../components/ui/Toast";
import type { Message, UserProfile } from "../../types/supabase";

const SYSTEM_BOT_ID = "75ece53b-1a93-451d-87ee-5e19427eb741";

interface ConversationUser {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  displayName: string;
}

export const AdminMessagePage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [adminProfiles, setAdminProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [adminIds, setAdminIds] = useState<string[]>([]);

  const [conversations, setConversations] = useState<ConversationUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedDisplayName, setSelectedDisplayName] = useState<string | null>(null);
  const messagesCache = useRef<Record<string, Message[]>>({});
  const lastFetchUser = useRef<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const inboxDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load admin ids & profiles
  useEffect(() => {
    const loadAdmins = async () => {
      try {
        const { data } = await supabase
          .from("users_profile")
          .select("id,email,full_name,company_name,role")
          .eq("role", "admin");

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
              company_name: a.company_name,
              avatar_url: null,
              created_at: new Date().toISOString(),
            } as UserProfile);
            ids.push(a.id);
          });
          
          // Add system-bot to admin profiles map
          map.set(SYSTEM_BOT_ID, {
            id: SYSTEM_BOT_ID,
            email: "noreply@codfence.com",
            full_name: "CodFence Support Bot",
            role: "admin",
            phone: null,
            company_name: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
          } as UserProfile);
          ids.push(SYSTEM_BOT_ID);
          
          setAdminProfiles(map);
          setAdminIds(ids);
        }
      } catch (err) {
        console.error("loadAdmins error", err);
      }
    };
    loadAdmins();
  }, []);

  // Utility to build inbox (grouping by user)
  const fetchInbox = useCallback(async () => {
    if (!adminUser) return;
    setLoadingConversations(true);
    try {
      // 1) user -> admin (receiver_id IS NULL)
      const { data: userMsgs, error: userErr } = await supabase
        .from("messages")
        .select("*")
        .is("receiver_id", null)
        .order("created_at", { ascending: false });

      if (userErr) throw userErr;
      const fromUsers = userMsgs || [];

      // 2) collect user ids (exclude admins and system bot)
      const userIds = Array.from(
        new Set(
          fromUsers
            .map((m: Message) => m.sender_id)
            .filter((id) => id && id !== SYSTEM_BOT_ID && !adminIds.includes(id))
        )
      );

      if (userIds.length === 0) {
        setConversations([]);
        setLoadingConversations(false);
        return;
      }

      // 3) fetch messages where receiver_id IN userIds (admin/system-bot replies to users)
      const senderIds = [...adminIds, SYSTEM_BOT_ID];
      const { data: replies, error: repliesErr } = await supabase
        .from("messages")
        .select("*")
        .in("receiver_id", userIds)
        .in("sender_id", senderIds)
        .order("created_at", { ascending: false });

      if (repliesErr) throw repliesErr;

      const allMessages = [...fromUsers, ...(replies || [])];

      // 4) group by user id
      const userMap = new Map<string, Message[]>();
      allMessages.forEach((m: Message) => {
        let uid: string | null = null;
        if (m.receiver_id === null) {
          uid = m.sender_id; // user -> admin
        } else if ((adminIds.includes(m.sender_id) || m.sender_id === SYSTEM_BOT_ID) && userIds.includes(m.receiver_id)) {
          uid = m.receiver_id; // admin/system-bot -> user
        }
        if (!uid) return;
        if (!userMap.has(uid)) userMap.set(uid, []);
        userMap.get(uid)!.push(m);
      });

      // 5) load user profiles
      const userIdsArray = Array.from(userMap.keys());
      let profiles: any[] = [];
      if (userIdsArray.length > 0) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from("users_profile")
          .select("id, email, full_name, company_name")
          .in("id", userIdsArray);

        if (profilesErr) {
          console.error("fetchInbox: error loading profiles", profilesErr);
        }
        profiles = profilesData || [];
      }

      // build profileMap
      const profileMap = new Map<string, any>();
      profiles.forEach((p: any) => profileMap.set(p.id, p));

      // 6) build conversation list
      const convs: ConversationUser[] = Array.from(userMap.entries()).map(([uid, msgs]) => {
        msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const unread = msgs.filter((m) => m.receiver_id === null && !m.read && m.sender_id === uid).length;
        const p = profileMap.get(uid);
        let displayName = "User";
        if (p) {
          if (p.company_name && p.company_name.trim() !== "") {
            displayName = p.company_name;
          } else if (p.full_name && p.full_name.trim() !== "") {
            displayName = p.full_name;
          } else if (p.email && p.email.trim() !== "") {
            displayName = p.email;
          }
        }
        return {
          id: uid,
          email: p?.email ?? "",
          full_name: p?.full_name ?? null,
          company_name: p?.company_name ?? null,
          lastMessage: msgs[0] ?? null,
          unreadCount: unread,
          displayName,
        };
      });

      convs.sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      });

      setConversations(convs);
    } catch (err) {
      console.error("fetchInbox error", err);
      showError("Failed to load conversations.");
    } finally {
      setLoadingConversations(false);
    }
  }, [adminUser, adminIds, showError]);

  const debouncedFetchInbox = useCallback(() => {
    if (inboxDebounceRef.current) {
      clearTimeout(inboxDebounceRef.current);
    }
    inboxDebounceRef.current = setTimeout(() => {
      fetchInbox();
    }, 150);
  }, [fetchInbox]);

  // Fetch messages for a selected user (detail)
  const fetchMessagesForUser = useCallback(async (userId: string | null) => {
    if (!adminUser || !userId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    try {
      const { data: userMsgs, error: userErr } = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", userId)
        .is("receiver_id", null)
        .order("created_at", { ascending: true });
      if (userErr) throw userErr;

      // Fetch admin/system-bot replies to this user
      const senderIds = [...adminIds, SYSTEM_BOT_ID];
      const { data: adminReplies, error: replyErr } = await supabase
        .from("messages")
        .select("*")
        .eq("receiver_id", userId)
        .in("sender_id", senderIds)
        .order("created_at", { ascending: true });
      if (replyErr) throw replyErr;

      const all = [...(userMsgs || []), ...(adminReplies || [])];
      all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(all);
      messagesCache.current[userId] = all;

      // mark unread user->admin messages as read (admin opened)
      const { error: markErr } = await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", userId)
        .is("receiver_id", null)
        .eq("read", false);

      if (markErr) {
        console.error("fetchMessagesForUser mark read error", markErr);
        const { error: markErr2 } = await supabase
          .from("messages")
          .update({ read: true })
          .match({ sender_id: userId, receiver_id: null, read: false });
        if (markErr2) {
          console.error("fetchMessagesForUser mark read retry failed", markErr2);
          showError("Unable to mark messages as read. Likely RLS issue.");
        }
      }

      setConversations((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, unreadCount: 0 } : c))
      );

      await new Promise((res) => setTimeout(res, 100)); // wait for database sync
      debouncedFetchInbox();
    } catch (err) {
      console.error("fetchMessagesForUser error", err);
      showError("Failed to load messages.");
    } finally {
      setMessagesLoading(false);
    }
  }, [adminUser, adminIds, debouncedFetchInbox, showError]);

  const safeFetchMessagesForUser = useCallback(
    async (userId: string | null) => {
      if (!userId) return;
      if (lastFetchUser.current === userId) return;
      lastFetchUser.current = userId;

      try {
        await fetchMessagesForUser(userId);
      } finally {
        setTimeout(() => {
          if (lastFetchUser.current === userId) {
            lastFetchUser.current = null;
          }
        }, 500);
      }
    },
    [fetchMessagesForUser]
  );

  // keep selected display name in sync with latest profile data
  useEffect(() => {
    if (!selectedUser) {
      setSelectedDisplayName(null);
      return;
    }
    const match = conversations.find((c) => c.id === selectedUser);
    if (match) {
      setSelectedDisplayName((prev) =>
        prev === match.displayName ? prev : match.displayName
      );
    }
  }, [selectedUser, conversations]);

  useEffect(() => {
    if (adminIds.length > 0) {
      fetchInbox();
    }
  }, [adminIds, fetchInbox]);

  // Fetch messages when selectedUser changes (with cache guard)
  useEffect(() => {
    if (!selectedUser) return;
    const cached = messagesCache.current[selectedUser];
    const convo = conversations.find((c) => c.id === selectedUser);
    const cachedLast = cached?.[cached.length - 1] ?? null;
    const convoLast = convo?.lastMessage ?? null;
    const needsRefresh =
      !cached ||
      !convo ||
      (convo?.unreadCount ?? 0) > 0 ||
      (convoLast && (!cachedLast || cachedLast.id !== convoLast.id));

    if (cached) {
      setMessages(cached);
    }

    if (needsRefresh) {
      safeFetchMessagesForUser(selectedUser);
    }
  }, [selectedUser, conversations, safeFetchMessagesForUser]);

  // initial fetch + realtime subscription
  useEffect(() => {
    if (adminIds.length === 0) {
      return;
    }
    const channel = supabase
      .channel("messages_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (!selectedUser) {
            debouncedFetchInbox();
          } else if (
            msg &&
            (msg.sender_id === selectedUser || msg.receiver_id === selectedUser)
          ) {
            safeFetchMessagesForUser(selectedUser);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (!selectedUser) {
            debouncedFetchInbox();
          } else if (
            msg &&
            (msg.sender_id === selectedUser || msg.receiver_id === selectedUser)
          ) {
            safeFetchMessagesForUser(selectedUser);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminIds, debouncedFetchInbox, safeFetchMessagesForUser, selectedUser]);

  // Visibility-based polling fallback
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // Tab NOT active → enable fallback polling
        if (!pollingRef.current) {
          pollingRef.current = setInterval(() => {
            debouncedFetchInbox();
          }, 3000); // every 3 seconds
        }
      } else {
        // Tab active → stop polling and refresh immediately
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        debouncedFetchInbox();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [debouncedFetchInbox]);

  // auto-scroll on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (inboxDebounceRef.current) {
        clearTimeout(inboxDebounceRef.current);
      }
    };
  }, []);

  // send admin reply
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

      const { error } = await supabase.from("messages").insert({
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

      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        sender_id: adminUser.id,
        receiver_id: selectedUser,
        message: newMessage.trim() || null,
        attachment_url: attachmentUrl,
        read: false,
        system_message: false,
        broadcast: false,
        created_at: new Date().toISOString(),
      } as unknown as Message;

      setMessages((prev) => {
        const next = [...prev, optimisticMessage] as Message[];
        messagesCache.current[selectedUser] = next;
        return next;
      });
      setNewMessage("");
      setSelectedFile(null);
      debouncedFetchInbox();
    } catch (err) {
      console.error("admin send error", err);
      showError("Failed to send message. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // broadcast
  const handleBroadcast = async () => {
    if (!adminUser) return;
    if (!broadcastMessage.trim() && !broadcastFile) return;
    setUploading(true);
    try {
      let attachmentUrl: string | null = null;
      if (broadcastFile) {
        attachmentUrl = await uploadFile(broadcastFile);
      }

      const { data: allUsers, error: usersErr } = await supabase.from("users_profile").select("id,email,role");
      if (usersErr) throw usersErr;

      const users = (allUsers || []).filter((u: any) => u.role !== "admin" && !(u.email || "").toLowerCase().endsWith("@codfence.com"));
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
      debouncedFetchInbox();
    } catch (err) {
      console.error("broadcast error", err);
      showError("Failed to broadcast message.");
    } finally {
      setUploading(false);
    }
  };

  // helper: get admin name
  const getAdminName = (id?: string) => {
    if (!id) return "Admin";
    const p = adminProfiles.get(id);
    return p?.full_name || p?.email || "Admin";
  };

  return (
    <div className="flex h-full gap-4">
      {/* Left: Inbox */}
      <div className="w-80 flex-shrink-0 border-r border-[#1E223D]">
        <Card className="h-full rounded-none border-0">
          <CardHeader className="border-b border-[#1E223D]">
            <CardTitle className="text-lg">Inbox</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingConversations ? (
              <div className="p-4 text-center text-[#E5E7EB]/70">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-[#E5E7EB]/70">No conversations</div>
            ) : (
              <div className="divide-y divide-[#1E223D]">
                {conversations.map((c) => {
                  const isSel = c.id === selectedUser;
                  const hasUnread = c.unreadCount > 0;
                  const lastText = c.lastMessage?.message || (c.lastMessage?.attachment_url ? "Attachment" : "");
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedUser(c.id);
                        setSelectedDisplayName(c.displayName);
                        setConversations((prev) =>
                          prev.map((x) =>
                            x.id === c.id ? { ...x, unreadCount: 0 } : x
                          )
                        );
                      }}
                      className={`w-full text-left p-4 rounded-sm transition-all duration-150 
                        ${
                          isSel
                            ? "bg-[#28315f] border-l-4 border-blue-400 shadow-inner"
                            : hasUnread
                              ? "bg-[#1c274a] border-l-4 border-blue-600 shadow-[0_0_12px_rgba(0,0,0,0.25)]"
                              : "hover:bg-[#1a2038]"
                        }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`truncate ${
                            hasUnread ? "font-bold text-white" : "font-medium text-[#E5E7EB]"
                          }`}>
                            {c.displayName}
                          </p>
                          {c.lastMessage && <p className="text-sm text-[#E5E7EB]/70 truncate mt-1">{lastText}</p>}
                        </div>
                        {hasUnread && <span className="flex-shrink-0 bg-blue-500 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">{c.unreadCount}</span>}
                      </div>
                      {c.lastMessage && <p className="text-xs text-[#AAB0C8] mt-1">{formatMessageTimestamp(c.lastMessage.created_at)}</p>}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <Card className="h-full rounded-none border-0 flex flex-col">
            <CardHeader className="border-b border-[#1E223D]">
              <CardTitle>
                {selectedDisplayName ??
                  conversations.find((x) => x.id === selectedUser)?.displayName ??
                  "User"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col !p-0 min-h-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0B0F28]">
                {messagesLoading ? (
                  <div className="text-center text-[#E5E7EB]/70 py-8">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-[#E5E7EB]/70 py-8">No messages</div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = adminIds.includes(m.sender_id) || m.sender_id === SYSTEM_BOT_ID;
                    const isSystem = m.system_message;
                    const isImage = !!m.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    const adminName = isAdmin ? getAdminName(m.sender_id) : undefined;
                    return (
                      <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isSystem ? "bg-[#2A2E45] text-[#9CA3AF] italic" : isAdmin ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white" : "bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] text-white"}`}>
                          {m.attachment_url && (
                            <div className="mb-2">
                              {isImage ? <img src={m.attachment_url} alt="att" className="max-w-[200px] max-h-[200px] rounded-lg object-cover" /> :
                                <a href={m.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-white/90 hover:text-white">
                                  <File size={16} /><span className="text-sm truncate">{m.attachment_url.split("/").pop()}</span> <Download size={14} />
                                </a>}
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

              <div className="border-t border-[#1E223D] p-3 bg-[#0B0F28]">
                <FileUploader onFileSelect={setSelectedFile} onRemove={() => setSelectedFile(null)} selectedFile={selectedFile} />
                <form onSubmit={handleSend} className="flex gap-2 mt-2">
                  <Input placeholder="Type your reply..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1" disabled={uploading} />
                  <Button type="submit" size="sm" disabled={uploading || (!newMessage.trim() && !selectedFile)} className="button-gradient"><Send size={18} /></Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full rounded-none border-0">
            <CardContent className="p-12 text-center text-[#E5E7EB]/70">Select a conversation to start messaging</CardContent>
          </Card>
        )}
      </div>

      {/* Broadcast panel removed - functionality kept in handleBroadcast for future use */}
    </div>
  );
};

export default AdminMessagePage;

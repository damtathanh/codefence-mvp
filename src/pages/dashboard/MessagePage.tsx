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
import { Send, Bot, Download, File as FileIcon } from "lucide-react";
import { useAuth } from "../../features/auth";
import { formatMessageTimestamp } from "../../utils/formatTimestamp";
import { uploadFile } from "../../utils/uploadFile";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../components/ui/Toast";
import type { Message } from "../../types/supabase";

export const MessagePage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch messages for user (both user->admin and admin->user)
  const fetchMessages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Query: (sender_id = user.id AND receiver_id IS NULL) OR (receiver_id = user.id)
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.is.null),receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark unread admin -> user messages as read (user opened conversation)
      // Update messages where receiver_id = user.id and read = false
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("receiver_id", user.id)
        .eq("read", false);
    } catch (err) {
      console.error("fetchMessages error:", err);
      showError("Failed to load messages. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [user, showError]);

  // initial fetch + realtime subscriptions
  useEffect(() => {
    if (!user) return;
    fetchMessages();

    const channel = supabase
      .channel(`user_messages_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (!msg) return;
          // Refresh if:
          // - user sent (sender_id === user.id && receiver_id === null)
          // - admin sent to user (receiver_id === user.id)
          // - broadcast to this user (broadcast === true && receiver_id === user.id)
          if (
            msg.sender_id === user.id ||
            msg.receiver_id === user.id ||
            (msg.broadcast && msg.receiver_id === user.id)
          ) {
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMessages]);

  // auto-scroll when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // send message (user -> admin)
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    if (!newMessage.trim() && !selectedFile) return;

    setUploading(true);
    try {
      let attachmentUrl: string | null = null;
      if (selectedFile) {
        attachmentUrl = await uploadFile(selectedFile);
      }

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: null,
        message: newMessage.trim() || null,
        attachment_url: attachmentUrl,
        read: false,
        system_message: false,
        broadcast: false,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      showSuccess("Your message has been sent to CodFence support. We will reply shortly.");
      setNewMessage("");
      setSelectedFile(null);

      // optimistic append for better UX
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          sender_id: user.id,
          receiver_id: null,
          message: newMessage.trim() || null,
          attachment_url: attachmentUrl,
          read: false,
          system_message: false,
          broadcast: false,
          created_at: new Date().toISOString(),
        } as unknown as Message,
      ]);
    } catch (err) {
      console.error("send message error:", err);
      showError("Failed to send message. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col h-full">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[#E5E7EB]/70">Please log in to use messaging.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[#E5E7EB]/70">Loading messages...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-start justify-center min-h-0 pt-2">
        <Card className="flex flex-col h-full max-h-[600px] w-full overflow-hidden rounded-2xl shadow-2xl border-2 border-[#1E223D]/50">
          <CardHeader className="!pt-2 !pb-2 !px-4 lg:!px-6 border-b border-[#1E223D]/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot size={18} />
              Chat with CodFence Support Team
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col !p-0 min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-3 bg-[#0B0F28]">
              {messages.length === 0 ? (
                <div className="text-center text-[#E5E7EB]/70 py-8">No messages yet. Start a conversation!</div>
              ) : (
                messages.map((m) => {
                  const isUser = m.sender_id === user.id;
                  const isImage = !!m.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  const isSystem = m.system_message;
                  const isUnread = !m.read && m.receiver_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isSystem ? "bg-[#2A2E45] text-[#9CA3AF] italic" : isUser ? "bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] text-white" : "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white"} ${isUnread ? "ring-2 ring-blue-400/50" : ""}`}>
                        {m.attachment_url && (
                          <div className="mb-2">
                            {isImage ? (
                              <img src={m.attachment_url} alt="Attachment" className="max-w-[200px] max-h-[200px] rounded-lg object-cover" />
                            ) : (
                              <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/90 hover:text-white transition">
                                <FileIcon size={16} />
                                <span className="text-sm truncate">{m.attachment_url.split("/").pop()}</span>
                                <Download size={14} />
                              </a>
                            )}
                          </div>
                        )}
                        {m.message && <p className="text-sm">{m.message}</p>}
                        <p className={`text-xs mt-1 ${isSystem ? "text-[#9CA3AF]" : "text-white/70"}`}>{formatMessageTimestamp(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#1E223D] p-3 lg:p-4 bg-[#0B0F28] flex-shrink-0 space-y-2">
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
      </div>
    </div>
  );
};

export default MessagePage;

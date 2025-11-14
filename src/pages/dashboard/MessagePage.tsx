import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { FileUploader } from "../../components/ui/FileUploader";
import ImageModal from "../../components/ImageModal";
import { Send, Bot, Download, File as FileIcon } from "lucide-react";
import { useAuth } from "../../features/auth";
import { formatMessageTimestamp } from "../../utils/formatTimestamp";
import { uploadFile } from "../../utils/uploadFile";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../components/ui/Toast";
import type { Message, UserProfile } from "../../types/supabase";

const SYSTEM_BOT_ID = "75ece53b-1a93-451d-87ee-5e19427eb741";
const SYSTEM_REPLY_TEXT = "Thanks for reaching out! Our support team will reply soon.";
const SYSTEM_COOLDOWN_MINUTES = 15;

export const MessagePage: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScroll = useRef(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(cb, 0);

    const container = messagesContainerRef.current;
    if (container) {
      raf(() => {
        raf(() => {
          try {
            container.scrollTo({ top: container.scrollHeight, behavior });
          } catch {
            container.scrollTop = container.scrollHeight;
          }
        });
      });
    } else {
      raf(() => {
        messagesEndRef.current?.scrollIntoView({ behavior });
      });
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("users_profile")
          .select("id, company_name, full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.error("load user profile error", error);
          setUserProfile({
            id: user.id,
            company_name: null,
            full_name: null,
            email: user.email ?? "",
            role: "user",
            phone: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
          } as UserProfile);
          return;
        }

        if (data) {
          setUserProfile({
            id: data.id,
            company_name: data.company_name ?? null,
            full_name: data.full_name ?? null,
            email: user.email ?? "",
            role: "user",
            phone: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
          } as UserProfile);
        } else {
          setUserProfile({
            id: user.id,
            company_name: null,
            full_name: null,
            email: user.email ?? "",
            role: "user",
            phone: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
          } as UserProfile);
        }
      } catch (err) {
        console.error("load user profile error", err);
        if (!isMounted) return;
        setUserProfile({
          id: user.id,
          company_name: null,
          full_name: null,
          email: user.email ?? "",
          role: "user",
          phone: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
        } as UserProfile);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // fetch messages for user
  const fetchMessages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.is.null),receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      shouldAutoScroll.current = true;
      scrollToBottom("auto");

      // mark admin->user messages as read (including system-bot messages)
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("receiver_id", user.id)
        .eq("read", false);
    } catch (err) {
      console.error("fetchMessages error", err);
      showError("Failed to load messages. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [user, showError]);

  useEffect(() => {
    if (!user) return;
    fetchMessages();

    const channel = supabase
      .channel("messages_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          fetchMessages?.();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          fetchMessages?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMessages]);

  // Visibility-based polling fallback
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // Tab NOT active → enable fallback polling
        if (!pollingRef.current) {
          pollingRef.current = setInterval(() => {
            fetchMessages();
          }, 3000); // every 3 seconds
        }
      } else {
        // Tab active → stop polling and refresh immediately
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        fetchMessages(); // refresh instantly when tab becomes active
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchMessages]);

  useLayoutEffect(() => {
    if (!shouldAutoScroll.current) return;
    scrollToBottom("auto");
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const images = container.querySelectorAll<HTMLImageElement>(".chat-image");
    if (images.length === 0) return;

    let loaded = 0;
    const maybeScroll = () => {
      loaded += 1;
      if (loaded === images.length && shouldAutoScroll.current) {
        scrollToBottom("smooth");
      }
    };

    const cleanups: Array<() => void> = [];
    images.forEach((img) => {
      if (img.complete) {
        maybeScroll();
      } else {
        const handleLoad = () => {
          maybeScroll();
          img.removeEventListener("load", handleLoad);
        };
        img.addEventListener("load", handleLoad);
        cleanups.push(() => img.removeEventListener("load", handleLoad));
      }
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [messages, scrollToBottom]);

  // helper: check admin replies since timestamp
  const hasAdminReplySince = async (sinceIso: string) => {
    // load admin ids
    const { data: admins } = await supabase
      .from("users_profile")
      .select("id")
      .or("role.eq.admin,email.ilike.%@codfence.com");

    const adminIds = (admins || []).map((a: any) => a.id);
    if (adminIds.length === 0) return false;

    const { data } = await supabase
      .from("messages")
      .select("id,created_at")
      .in("sender_id", adminIds)
      .eq("receiver_id", user?.id)
      .gt("created_at", sinceIso)
      .limit(1);

    return (data && data.length > 0);
  };

  // helper: check last system message time for this user (from system-bot)
  const lastSystemMessage = async () => {
    const { data } = await supabase
      .from("messages")
      .select("created_at")
      .eq("sender_id", SYSTEM_BOT_ID)
      .eq("receiver_id", user?.id)
      .eq("system_message", true)
      .order("created_at", { ascending: false })
      .limit(1);
    return (data && data[0]) ? data[0].created_at : null;
  };

  // insert system reply if allowed (cooldown + no admin reply)
  const maybeInsertSystemReply = async (lastUserMessageCreatedAtIso: string) => {
    if (!user) return;

    try {
      const lastSys = await lastSystemMessage();
      const now = new Date();
      if (lastSys) {
        const lastSysTime = new Date(lastSys);
        const diffMin = (now.getTime() - lastSysTime.getTime()) / 60000;
        if (diffMin < SYSTEM_COOLDOWN_MINUTES) {
          // cooldown not passed
          return;
        }
      }

      // If admin already replied since user's message, do not insert system reply
      const adminReplied = await hasAdminReplySince(lastUserMessageCreatedAtIso);
      if (adminReplied) return;

      // Insert system reply as admin message (from system-bot to user)
      const { error } = await supabase.from("messages").insert({
        sender_id: SYSTEM_BOT_ID,
        receiver_id: user.id,
        message: SYSTEM_REPLY_TEXT,
        attachment_url: null,
        read: false,
        system_message: true,
        broadcast: false,
        created_at: new Date().toISOString(),
      });
      if (error) {
        console.error("insert system reply error", error);
      } else {
        // refresh UI
        fetchMessages();
      }
    } catch (err) {
      console.error("maybeInsertSystemReply error", err);
    }
  };

  // send user message (user -> admin)
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    if (!newMessage.trim() && !selectedFile) return;

    setUploading(true);
    try {
      let attachmentUrl: string | null = null;
      if (selectedFile) {
        const profileForUpload =
          userProfile ?? {
            id: user.id,
            company_name: null,
            full_name:
              typeof user.user_metadata?.full_name === "string"
                ? user.user_metadata.full_name
                : user.email ?? null,
          };
        attachmentUrl = await uploadFile(selectedFile, profileForUpload);
      }

      const nowIso = new Date().toISOString();

      // insert user message
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: null,
        message: newMessage.trim() || null,
        attachment_url: attachmentUrl,
        read: false,
        system_message: false,
        broadcast: false,
        created_at: nowIso,
      });
      if (error) throw error;

      // optimistic append
      setMessages((prev) => {
        const next = [
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
            created_at: nowIso,
          } as unknown as Message,
        ];
        return next;
      });
      shouldAutoScroll.current = true;
      scrollToBottom("smooth");

      // After sending: maybe insert system reply (immediate, but subject to cooldown and if admin hasn't replied)
      await maybeInsertSystemReply(nowIso);

      setNewMessage("");
      setSelectedFile(null);
      // Removed success toast - user sees message appended optimistically
    } catch (err) {
      console.error("send error", err);
      showError("Failed to send message. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col h-full">
        <Card><CardContent className="p-12 text-center"><p className="text-[#E5E7EB]/70">Please log in to use messaging.</p></CardContent></Card>
      </div>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <Card><CardContent className="p-12 text-center"><p className="text-[#E5E7EB]/70">Loading messages...</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full min-w-0">
      <div className="flex-1 flex w-full min-h-0 min-w-0">
        <Card className="flex flex-col h-full w-full overflow-hidden rounded-2xl shadow-2xl border-2 border-[#1E223D]/50">
          <CardHeader className="!pt-2 !pb-2 !px-4 lg:!px-6 border-b border-[#1E223D]/30">
            <CardTitle className="flex items-center gap-2 text-base"><Bot size={18} />Chat with CodFence Support Team</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col !p-0 min-h-0">
            <div
              className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-3 bg-[#0B0F28]"
              ref={messagesContainerRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                shouldAutoScroll.current =
                  el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
              }}
            >
              {messages.length === 0 ? (
                <div className="text-center text-[#E5E7EB]/70 py-8">No messages yet. Start a conversation!</div>
              ) : (
                messages.map((m) => {
                  const isUser = m.sender_id === user.id;
                  const isSystem = m.system_message;
                  const isImage = !!m.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  const isUnread = !m.read && m.receiver_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isSystem ? "bg-[#2A2E45] text-[#9CA3AF] italic" : isUser ? "bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] text-white" : "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white"} ${isUnread ? "ring-2 ring-blue-400/50" : ""}`}>
                        {m.attachment_url && (
                          <div className="mb-2">
                            {isImage ? (
                              <img
                                src={m.attachment_url}
                                alt="attachment"
                                className="chat-image max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer"
                                onClick={() => setPreviewSrc(m.attachment_url || null)}
                              />
                            ) : (
                              <a href={m.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-white/90 hover:text-white">
                                <FileIcon size={16} /><span className="text-sm truncate">{m.attachment_url.split("/").pop()}</span><Download size={14} />
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

            <div className="border-t border-[#1E223D] p-3 lg:p-4 bg-[#0B0F28]">
              <FileUploader onFileSelect={setSelectedFile} onRemove={() => setSelectedFile(null)} selectedFile={selectedFile} />
              <form onSubmit={handleSend} className="flex gap-2 mt-2">
                <Input placeholder="Type your message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1" disabled={uploading} />
                <Button type="submit" size="sm" disabled={uploading || (!newMessage.trim() && !selectedFile)} className="button-gradient"><Send size={18} /></Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
      {previewSrc && (
        <ImageModal
          src={previewSrc}
          alt="preview"
          onClose={() => setPreviewSrc(null)}
        />
      )}
    </div>
  );
};

export default MessagePage;

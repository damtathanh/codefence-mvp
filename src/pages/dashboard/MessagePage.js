import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { FileUploader } from "../../components/ui/FileUploader";
import ImageModal from "../../components/ImageModal";
import { Send, Bot, Download, File as FileIcon } from "lucide-react";
import { useAuth } from "../../features/auth";
import { formatMessageTimestamp } from "../../utils/formatTimestamp";
import { uploadFile } from "../../utils/fileUpload";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../components/ui/Toast";
import { SYSTEM_BOT_ID, SYSTEM_REPLY_TEXT, SYSTEM_COOLDOWN_MINUTES } from "../../constants/messages";
import { useMessageScroll } from "../../utils/messageScroll";
import { useImageLoadScroll } from "../../hooks/useImageLoadScroll";
export const MessagePage = () => {
    const { user } = useAuth();
    const { showError } = useToast();
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const isUserScrollingUp = useRef(false);
    const [userProfile, setUserProfile] = useState(null);
    const [previewSrc, setPreviewSrc] = useState(null);
    const { scrollToBottom, handleScroll } = useMessageScroll(messagesContainerRef, isUserScrollingUp, 80);
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
                if (!isMounted)
                    return;
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
                    });
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
                    });
                }
                else {
                    setUserProfile({
                        id: user.id,
                        company_name: null,
                        full_name: null,
                        email: user.email ?? "",
                        role: "user",
                        phone: null,
                        avatar_url: null,
                        created_at: new Date().toISOString(),
                    });
                }
            }
            catch (err) {
                console.error("load user profile error", err);
                if (!isMounted)
                    return;
                setUserProfile({
                    id: user.id,
                    company_name: null,
                    full_name: null,
                    email: user.email ?? "",
                    role: "user",
                    phone: null,
                    avatar_url: null,
                    created_at: new Date().toISOString(),
                });
            }
        };
        loadProfile();
        return () => {
            isMounted = false;
        };
    }, [user]);
    // fetch messages for user
    const fetchMessages = useCallback(async () => {
        if (!user)
            return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .or(`and(sender_id.eq.${user.id},receiver_id.is.null),receiver_id.eq.${user.id}`)
                .order("created_at", { ascending: true });
            if (error)
                throw error;
            setMessages(data || []);
            isUserScrollingUp.current = false;
            scrollToBottom("auto");
            // mark admin->user messages as read (including system-bot messages)
            await supabase
                .from("messages")
                .update({ read: true })
                .eq("receiver_id", user.id)
                .eq("read", false);
        }
        catch (err) {
            console.error("fetchMessages error", err);
            showError("Failed to load messages. Please refresh the page.");
        }
        finally {
            setLoading(false);
        }
    }, [user, showError]);
    useEffect(() => {
        if (!user)
            return;
        fetchMessages();
        const channel = supabase
            .channel("messages_realtime")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
            fetchMessages?.();
        })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
            fetchMessages?.();
        })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchMessages]);
    useEffect(() => {
        if (!messages || messages.length === 0)
            return;
        if (!isUserScrollingUp.current)
            scrollToBottom("auto");
    }, [messages, scrollToBottom]);
    // Auto-scroll when images load (to account for layout shifts)
    useImageLoadScroll(messagesContainerRef, isUserScrollingUp, scrollToBottom, [messages, scrollToBottom]);
    /**
     * Checks if any admin has replied to the user since a given timestamp
     * Used to prevent system bot from auto-replying when an admin has already responded
     * @param sinceIso - ISO timestamp to check from
     * @returns true if admin replied, false otherwise
     */
    const hasAdminReplySince = async (sinceIso) => {
        // Load all admin user IDs (role=admin or email ends with @codfence.com)
        const { data: admins } = await supabase
            .from("users_profile")
            .select("id")
            .or("role.eq.admin,email.ilike.%@codfence.com");
        const adminIds = (admins || []).map((a) => a.id);
        if (adminIds.length === 0)
            return false;
        // Check if any admin sent a message to this user after the timestamp
        const { data } = await supabase
            .from("messages")
            .select("id,created_at")
            .in("sender_id", adminIds)
            .eq("receiver_id", user?.id)
            .gt("created_at", sinceIso)
            .limit(1);
        return (data && data.length > 0);
    };
    /**
     * Gets the timestamp of the last system bot message for this user
     * Used to enforce cooldown between auto-replies
     * @returns ISO timestamp of last system message, or null if none exists
     */
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
    /**
     * Conditionally inserts a system bot reply to the user's message
     * Only inserts if:
     * 1. Cooldown period (SYSTEM_COOLDOWN_MINUTES) has passed since last system message
     * 2. No admin has replied since the user's message
     * @param lastUserMessageCreatedAtIso - Timestamp of the user's message that triggered this check
     */
    const maybeInsertSystemReply = async (lastUserMessageCreatedAtIso) => {
        if (!user)
            return;
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
            if (adminReplied)
                return;
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
            }
            else {
                // refresh UI
                fetchMessages();
            }
        }
        catch (err) {
            console.error("maybeInsertSystemReply error", err);
        }
    };
    // send user message (user -> admin)
    const handleSend = async (e) => {
        if (e)
            e.preventDefault();
        if (!user)
            return;
        if (!newMessage.trim() && !selectedFile)
            return;
        setUploading(true);
        try {
            let attachmentUrl = null;
            if (selectedFile) {
                const profileForUpload = userProfile ?? {
                    id: user.id,
                    company_name: null,
                    full_name: typeof user.user_metadata?.full_name === "string"
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
            if (error)
                throw error;
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
                    },
                ];
                return next;
            });
            isUserScrollingUp.current = false;
            scrollToBottom("smooth");
            // After sending: maybe insert system reply (immediate, but subject to cooldown and if admin hasn't replied)
            await maybeInsertSystemReply(nowIso);
            setNewMessage("");
            setSelectedFile(null);
            // Removed success toast - user sees message appended optimistically
        }
        catch (err) {
            console.error("send error", err);
            showError("Failed to send message. Please try again.");
        }
        finally {
            setUploading(false);
        }
    };
    if (!user) {
        return (_jsx("div", { className: "flex flex-col h-full", children: _jsx(Card, { children: _jsx(CardContent, { className: "p-12 text-center", children: _jsx("p", { className: "text-[#E5E7EB]/70", children: "Please log in to use messaging." }) }) }) }));
    }
    if (loading && messages.length === 0) {
        return (_jsx("div", { className: "flex flex-col h-full", children: _jsx(Card, { children: _jsx(CardContent, { className: "p-12 text-center", children: _jsx("p", { className: "text-[#E5E7EB]/70", children: "Loading messages..." }) }) }) }));
    }
    return (_jsxs("div", { className: "flex flex-col h-full p-6", children: [_jsxs(Card, { className: "flex flex-col flex-1 min-h-0 rounded-2xl shadow-2xl border-2 border-[#1E223D]/50", children: [_jsx(CardHeader, { className: "!pt-2 !pb-2 !px-4 lg:!px-6 border-b border-[#1E223D]/30", children: _jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [_jsx(Bot, { size: 18 }), "Chat with CodFence Support Team"] }) }), _jsx(CardContent, { className: "flex flex-col flex-1 min-h-0 !p-0", children: _jsxs("div", { className: "flex flex-col flex-1 min-h-0", children: [_jsxs("div", { className: "flex-1 overflow-y-auto p-4 lg:p-5 space-y-4 pr-2 bg-[#0B0F28]", ref: messagesContainerRef, onScroll: handleScroll, children: [messages.length === 0 ? (_jsx("div", { className: "text-center text-[#E5E7EB]/70 py-8", children: "No messages yet. Start a conversation!" })) : (messages.map((m) => {
                                            const isUser = m.sender_id === user.id;
                                            const isSystem = m.system_message;
                                            const isImage = !!m.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                            const isUnread = !m.read && m.receiver_id === user.id;
                                            return (_jsx("div", { className: `flex ${isUser ? "justify-end" : "justify-start"}`, children: _jsxs("div", { className: `max-w-[70%] rounded-2xl px-4 py-2 ${isSystem ? "bg-[#2A2E45] text-[#9CA3AF] italic" : isUser ? "bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] text-white" : "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white"} ${isUnread ? "ring-2 ring-blue-400/50" : ""}`, children: [m.attachment_url && (_jsx("div", { className: "mb-2", children: isImage ? (_jsx("img", { src: m.attachment_url, alt: "attachment", className: "chat-image max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer", onClick: () => setPreviewSrc(m.attachment_url || null) })) : (_jsxs("a", { href: m.attachment_url, target: "_blank", rel: "noreferrer", className: "flex items-center gap-2 text-white/90 hover:text-white", children: [_jsx(FileIcon, { size: 16 }), _jsx("span", { className: "text-sm truncate", children: m.attachment_url.split("/").pop() }), _jsx(Download, { size: 14 })] })) })), m.message && _jsx("p", { className: "text-sm", children: m.message }), _jsx("p", { className: `text-xs mt-1 ${isSystem ? "text-[#9CA3AF]" : "text-white/70"}`, children: formatMessageTimestamp(m.created_at) })] }) }, m.id));
                                        })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("div", { className: "pt-4 border-t border-white/5 p-3 lg:p-4 bg-[#0B0F28]", children: [_jsx(FileUploader, { onFileSelect: setSelectedFile, onRemove: () => setSelectedFile(null), selectedFile: selectedFile }), _jsxs("form", { onSubmit: handleSend, className: "flex gap-2 mt-2", children: [_jsx(Input, { placeholder: "Type your message...", value: newMessage, onChange: (e) => setNewMessage(e.target.value), className: "flex-1", disabled: uploading }), _jsx(Button, { type: "submit", size: "sm", disabled: uploading || (!newMessage.trim() && !selectedFile), className: "button-gradient", children: _jsx(Send, { size: 18 }) })] })] })] }) })] }), previewSrc && (_jsx(ImageModal, { src: previewSrc, alt: "preview", onClose: () => setPreviewSrc(null) }))] }));
};
export default MessagePage;

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { FileUploader } from "../../components/ui/FileUploader";
import ImageModal from "../../components/ImageModal";
import { Send, Download, File } from "lucide-react";
import { useAuth } from "../../features/auth";
import { formatMessageTimestamp, formatMessageTimestampWithName } from "../../utils/formatTimestamp";
import { uploadFile } from "../../utils/fileUpload";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../components/ui/Toast";
import { SYSTEM_BOT_ID } from "../../constants/messages";
import { useMessageScroll } from "../../utils/messageScroll";
import { useImageLoadScroll } from "../../hooks/useImageLoadScroll";
export const AdminMessagePage = () => {
    const { user: adminUser } = useAuth();
    const { showSuccess, showError } = useToast();
    const [adminProfiles, setAdminProfiles] = useState(new Map());
    const [adminIds, setAdminIds] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedDisplayName, setSelectedDisplayName] = useState(null);
    const messagesCache = useRef({});
    const lastFetchUser = useRef(null);
    const [messages, setMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [broadcastFile, setBroadcastFile] = useState(null);
    const [previewSrc, setPreviewSrc] = useState(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const pollingRef = useRef(null);
    const inboxDebounceRef = useRef(null);
    const isUserScrollingUp = useRef(false);
    const { scrollToBottom, handleScroll } = useMessageScroll(messagesContainerRef, isUserScrollingUp, 80);
    // Load admin ids & profiles
    useEffect(() => {
        const loadAdmins = async () => {
            try {
                const { data } = await supabase
                    .from("users_profile")
                    .select("id,email,full_name,company_name,role")
                    .eq("role", "admin");
                if (data) {
                    const map = new Map();
                    const ids = [];
                    data.forEach((a) => {
                        map.set(a.id, {
                            id: a.id,
                            email: a.email,
                            full_name: a.full_name,
                            role: a.role || "admin",
                            phone: null,
                            company_name: a.company_name,
                            avatar_url: null,
                            created_at: new Date().toISOString(),
                        });
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
                    });
                    ids.push(SYSTEM_BOT_ID);
                    setAdminProfiles(map);
                    setAdminIds(ids);
                }
            }
            catch (err) {
                console.error("loadAdmins error", err);
            }
        };
        loadAdmins();
    }, []);
    // Utility to build inbox (grouping by user)
    const fetchInbox = useCallback(async () => {
        if (!adminUser)
            return;
        setLoadingConversations(true);
        try {
            // 1) user -> admin (receiver_id IS NULL)
            const { data: userMsgs, error: userErr } = await supabase
                .from("messages")
                .select("*")
                .is("receiver_id", null)
                .order("created_at", { ascending: false });
            if (userErr)
                throw userErr;
            const fromUsers = userMsgs || [];
            // 2) collect user ids (exclude admins and system bot)
            const userIds = Array.from(new Set(fromUsers
                .map((m) => m.sender_id)
                .filter((id) => id && id !== SYSTEM_BOT_ID && !adminIds.includes(id))));
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
            if (repliesErr)
                throw repliesErr;
            const allMessages = [...fromUsers, ...(replies || [])];
            // 4) group by user id
            const userMap = new Map();
            allMessages.forEach((m) => {
                let uid = null;
                if (m.receiver_id === null) {
                    uid = m.sender_id; // user -> admin
                }
                else if ((adminIds.includes(m.sender_id) || m.sender_id === SYSTEM_BOT_ID) && userIds.includes(m.receiver_id)) {
                    uid = m.receiver_id; // admin/system-bot -> user
                }
                if (!uid)
                    return;
                if (!userMap.has(uid))
                    userMap.set(uid, []);
                userMap.get(uid).push(m);
            });
            // 5) load user profiles
            const userIdsArray = Array.from(userMap.keys());
            let profiles = [];
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
            const profileMap = new Map();
            profiles.forEach((p) => profileMap.set(p.id, p));
            // 6) build conversation list
            const convs = Array.from(userMap.entries()).map(([uid, msgs]) => {
                msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const unread = msgs.filter((m) => m.receiver_id === null && !m.read && m.sender_id === uid).length;
                const p = profileMap.get(uid);
                let displayName = "User";
                if (p) {
                    if (p.company_name && p.company_name.trim() !== "") {
                        displayName = p.company_name;
                    }
                    else if (p.full_name && p.full_name.trim() !== "") {
                        displayName = p.full_name;
                    }
                    else if (p.email && p.email.trim() !== "") {
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
                if (!a.lastMessage)
                    return 1;
                if (!b.lastMessage)
                    return -1;
                return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
            });
            setConversations(convs);
        }
        catch (err) {
            console.error("fetchInbox error", err);
            showError("Failed to load conversations.");
        }
        finally {
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
    const fetchMessagesForUser = useCallback(async (userId) => {
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
            if (userErr)
                throw userErr;
            // Fetch admin/system-bot replies to this user
            const senderIds = [...adminIds, SYSTEM_BOT_ID];
            const { data: adminReplies, error: replyErr } = await supabase
                .from("messages")
                .select("*")
                .eq("receiver_id", userId)
                .in("sender_id", senderIds)
                .order("created_at", { ascending: true });
            if (replyErr)
                throw replyErr;
            const all = [...(userMsgs || []), ...(adminReplies || [])];
            all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            setMessages(all);
            messagesCache.current[userId] = all;
            isUserScrollingUp.current = false;
            scrollToBottom("auto");
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
            setConversations((prev) => prev.map((c) => (c.id === userId ? { ...c, unreadCount: 0 } : c)));
        }
        catch (err) {
            console.error("fetchMessagesForUser error", err);
            showError("Failed to load messages.");
        }
        finally {
            setMessagesLoading(false);
        }
    }, [adminUser, adminIds, debouncedFetchInbox, showError]);
    const safeFetchMessagesForUser = useCallback(async (userId) => {
        if (!userId)
            return;
        if (lastFetchUser.current === userId)
            return;
        lastFetchUser.current = userId;
        try {
            await fetchMessagesForUser(userId);
        }
        finally {
            setTimeout(() => {
                if (lastFetchUser.current === userId) {
                    lastFetchUser.current = null;
                }
            }, 500);
        }
    }, [fetchMessagesForUser]);
    // keep selected display name in sync with latest profile data
    useEffect(() => {
        if (!selectedUser) {
            setSelectedDisplayName(null);
            return;
        }
        const match = conversations.find((c) => c.id === selectedUser);
        if (match) {
            setSelectedDisplayName((prev) => prev === match.displayName ? prev : match.displayName);
        }
    }, [selectedUser, conversations]);
    useEffect(() => {
        if (adminIds.length > 0) {
            fetchInbox();
        }
    }, [adminIds, fetchInbox]);
    // Auto-scroll when conversation is selected
    useEffect(() => {
        if (!selectedUser)
            return;
        isUserScrollingUp.current = false;
        scrollToBottom("auto");
    }, [selectedUser, scrollToBottom]);
    // Fetch messages when selectedUser changes (with cache guard)
    useEffect(() => {
        if (!selectedUser)
            return;
        const cached = messagesCache.current[selectedUser];
        const convo = conversations.find((c) => c.id === selectedUser);
        const cachedLast = cached?.[cached.length - 1] ?? null;
        const convoLast = convo?.lastMessage ?? null;
        const needsRefresh = !cached ||
            !convo ||
            (convo?.unreadCount ?? 0) > 0 ||
            (convoLast && (!cachedLast || cachedLast.id !== convoLast.id));
        if (cached) {
            isUserScrollingUp.current = false;
            setMessages(cached);
            scrollToBottom("auto");
        }
        if (needsRefresh) {
            safeFetchMessagesForUser(selectedUser);
        }
    }, [selectedUser, conversations, safeFetchMessagesForUser, scrollToBottom]);
    // initial fetch + realtime subscription
    useEffect(() => {
        if (adminIds.length === 0) {
            return;
        }
        const channel = supabase
            .channel("messages_realtime")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
            const msg = payload.new;
            if (!selectedUser) {
                debouncedFetchInbox();
            }
            else if (msg &&
                (msg.sender_id === selectedUser || msg.receiver_id === selectedUser)) {
                safeFetchMessagesForUser(selectedUser);
            }
        })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
            const msg = payload.new;
            if (!selectedUser) {
                debouncedFetchInbox();
            }
            else if (msg &&
                (msg.sender_id === selectedUser || msg.receiver_id === selectedUser)) {
                safeFetchMessagesForUser(selectedUser);
            }
        })
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
            }
            else {
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
    // Auto-scroll on messages change
    useEffect(() => {
        if (!messages || messages.length === 0)
            return;
        if (!isUserScrollingUp.current)
            scrollToBottom("auto");
    }, [messages, scrollToBottom]);
    useEffect(() => {
        return () => {
            if (inboxDebounceRef.current) {
                clearTimeout(inboxDebounceRef.current);
            }
        };
    }, []);
    // Auto-scroll when images load (to account for layout shifts)
    useImageLoadScroll(messagesContainerRef, isUserScrollingUp, scrollToBottom, [messages, scrollToBottom]);
    // send admin reply
    const handleSend = async (e) => {
        if (e)
            e.preventDefault();
        if (!adminUser || !selectedUser)
            return;
        if (!newMessage.trim() && !selectedFile)
            return;
        setUploading(true);
        try {
            let attachmentUrl = null;
            if (selectedFile) {
                const receiverProfile = conversations.find((c) => c.id === selectedUser);
                attachmentUrl = await uploadFile(selectedFile, {
                    id: receiverProfile?.id || selectedUser,
                    company_name: receiverProfile?.company_name || null,
                    full_name: receiverProfile?.full_name || null,
                });
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
            if (error)
                throw error;
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
            };
            isUserScrollingUp.current = false;
            setMessages((prev) => {
                const next = [...prev, optimisticMessage];
                messagesCache.current[selectedUser] = next;
                return next;
            });
            setNewMessage("");
            setSelectedFile(null);
            debouncedFetchInbox();
        }
        catch (err) {
            console.error("admin send error", err);
            showError("Failed to send message. Please try again.");
        }
        finally {
            setUploading(false);
        }
    };
    // broadcast
    const handleBroadcast = async () => {
        if (!adminUser)
            return;
        if (!broadcastMessage.trim() && !broadcastFile)
            return;
        setUploading(true);
        try {
            let attachmentUrl = null;
            if (broadcastFile) {
                const adminProfile = adminProfiles.get(adminUser.id) ?? {
                    id: adminUser.id,
                    company_name: null,
                    full_name: typeof adminUser.user_metadata?.full_name === "string"
                        ? adminUser.user_metadata.full_name
                        : adminUser.email ?? null,
                };
                attachmentUrl = await uploadFile(broadcastFile, adminProfile);
            }
            const { data: allUsers, error: usersErr } = await supabase.from("users_profile").select("id,email,role");
            if (usersErr)
                throw usersErr;
            const users = (allUsers || []).filter((u) => u.role !== "admin" && !(u.email || "").toLowerCase().endsWith("@codfence.com"));
            if (users.length === 0) {
                showError("No users found to broadcast to.");
                setUploading(false);
                return;
            }
            const inserts = users.map((u) => ({
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
            if (insertErr)
                throw insertErr;
            showSuccess(`Broadcast sent to ${users.length} user(s).`);
            setBroadcastFile(null);
            setBroadcastMessage("");
            debouncedFetchInbox();
        }
        catch (err) {
            console.error("broadcast error", err);
            showError("Failed to broadcast message.");
        }
        finally {
            setUploading(false);
        }
    };
    // helper: get admin name
    const getAdminName = (id) => {
        if (!id)
            return "Admin";
        const p = adminProfiles.get(id);
        return p?.full_name || p?.email || "Admin";
    };
    return (_jsxs("div", { className: "flex flex-col h-full space-y-2", children: [_jsxs("div", { className: "flex-1 grid grid-cols-[minmax(260px,320px)_minmax(0,1fr)] gap-6 min-h-0", children: [_jsxs(Card, { className: "flex flex-col h-full min-h-0", children: [_jsx(CardHeader, { className: "border-b border-[#1E223D] px-3 !py-2", children: _jsx(CardTitle, { className: "text-lg", children: "Inbox" }) }), _jsx(CardContent, { className: "flex-1 min-h-0 p-0", children: loadingConversations ? (_jsx("div", { className: "p-4 text-center text-[#E5E7EB]/70", children: "Loading..." })) : conversations.length === 0 ? (_jsx("div", { className: "p-4 text-center text-[#E5E7EB]/70", children: "No conversations" })) : (_jsx("div", { className: "h-full overflow-y-auto space-y-2", children: conversations.map((c) => {
                                        const isSel = c.id === selectedUser;
                                        const hasUnread = c.unreadCount > 0;
                                        const lastText = c.lastMessage?.message || (c.lastMessage?.attachment_url ? "Attachment" : "");
                                        return (_jsxs("button", { onClick: () => {
                                                isUserScrollingUp.current = false;
                                                setPreviewSrc(null);
                                                setSelectedUser(c.id);
                                                setSelectedDisplayName(c.displayName);
                                                setConversations((prev) => prev.map((x) => x.id === c.id ? { ...x, unreadCount: 0 } : x));
                                            }, className: `w-full text-left p-4 rounded-sm transition-all duration-150 
                        ${isSel
                                                ? "bg-[#28315f] border-l-4 border-blue-400 shadow-inner"
                                                : hasUnread
                                                    ? "bg-[#1c274a] border-l-4 border-blue-600 shadow-[0_0_12px_rgba(0,0,0,0.25)]"
                                                    : "hover:bg-[#1a2038]"}`, children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: `truncate ${hasUnread ? "font-bold text-white" : "font-medium text-[#E5E7EB]"}`, children: c.displayName }), c.lastMessage && _jsx("p", { className: "text-sm text-[#E5E7EB]/70 truncate mt-1", children: lastText })] }), hasUnread && _jsx("span", { className: "flex-shrink-0 bg-blue-500 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg", children: c.unreadCount })] }), c.lastMessage && _jsx("p", { className: "text-xs text-[#AAB0C8] mt-1", children: formatMessageTimestamp(c.lastMessage.created_at) })] }, c.id));
                                    }) })) })] }), selectedUser ? (_jsxs(Card, { className: "flex flex-col h-full min-h-0", children: [_jsx(CardHeader, { className: "border-b border-[#1E223D] px-3 !py-2", children: _jsx(CardTitle, { children: selectedDisplayName ??
                                        conversations.find((x) => x.id === selectedUser)?.displayName ??
                                        "User" }) }), _jsx(CardContent, { className: "flex flex-col flex-1 min-h-0 !p-0", children: _jsxs("div", { className: "flex flex-col flex-1 min-h-0", children: [_jsxs("div", { className: "flex-1 overflow-y-auto min-h-0 p-4 space-y-4 pr-2 bg-[#0B0F28]", ref: messagesContainerRef, onScroll: handleScroll, children: [messagesLoading ? (_jsx("div", { className: "text-center text-[#E5E7EB]/70 py-8", children: "Loading messages..." })) : messages.length === 0 ? (_jsx("div", { className: "text-center text-[#E5E7EB]/70 py-8", children: "No messages" })) : (messages.map((m) => {
                                                    const isAdmin = adminIds.includes(m.sender_id) || m.sender_id === SYSTEM_BOT_ID;
                                                    const isSystem = m.system_message;
                                                    const isImage = !!m.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                                    const adminName = isAdmin ? getAdminName(m.sender_id) : undefined;
                                                    return (_jsx("div", { className: `flex ${isAdmin ? "justify-end" : "justify-start"}`, children: _jsxs("div", { className: `max-w-[70%] rounded-2xl px-4 py-2 ${isSystem ? "bg-[#2A2E45] text-[#9CA3AF] italic" : isAdmin ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white" : "bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] text-white"}`, children: [m.attachment_url && (_jsx("div", { className: "mb-2", children: isImage ? (_jsx("img", { src: m.attachment_url, alt: "attachment", className: "chat-image max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer", onClick: () => setPreviewSrc(m.attachment_url || null) })) : (_jsxs("a", { href: m.attachment_url, target: "_blank", rel: "noreferrer", className: "flex items-center gap-2 text-white/90 hover:text-white", children: [_jsx(File, { size: 16 }), _jsx("span", { className: "text-sm truncate", children: m.attachment_url.split("/").pop() }), " ", _jsx(Download, { size: 14 })] })) })), m.message && _jsx("p", { className: "text-sm", children: m.message }), _jsx("p", { className: `text-xs mt-1 ${isSystem ? "text-[#9CA3AF]" : "text-white/70"} ${isAdmin ? "text-right" : ""}`, children: isAdmin && !isSystem ? formatMessageTimestampWithName(m.created_at, adminName || "Admin") : formatMessageTimestamp(m.created_at) })] }) }, m.id));
                                                })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("div", { className: "pt-4 border-t border-white/5 p-3 bg-[#0B0F28]", children: [_jsx(FileUploader, { onFileSelect: setSelectedFile, onRemove: () => setSelectedFile(null), selectedFile: selectedFile }), _jsxs("form", { onSubmit: handleSend, className: "flex gap-2 mt-2", children: [_jsx(Input, { placeholder: "Type your reply...", value: newMessage, onChange: (e) => setNewMessage(e.target.value), className: "flex-1", disabled: uploading }), _jsx(Button, { type: "submit", size: "sm", disabled: uploading || (!newMessage.trim() && !selectedFile), className: "button-gradient", children: _jsx(Send, { size: 18 }) })] })] })] }) })] })) : (_jsx(Card, { className: "flex flex-col h-full min-h-0", children: _jsx(CardContent, { className: "p-12 text-center text-[#E5E7EB]/70", children: "Select a conversation to start messaging" }) }))] }), previewSrc && (_jsx(ImageModal, { src: previewSrc, alt: "preview", onClose: () => setPreviewSrc(null) }))] }));
};
export default AdminMessagePage;

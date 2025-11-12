import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FileUploader } from '../../components/ui/FileUploader';
import { Send, Download, File, Megaphone } from 'lucide-react';
import { useAuth } from '../../features/auth';
import { formatMessageTimestamp, formatMessageTimestampWithName } from '../../utils/formatTimestamp';
import { uploadFile } from '../../utils/uploadFile';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../components/ui/Toast';
import { useAutoClose } from '../../hooks/useAutoClose';
import type { Message } from '../../types/supabase';
import type { UserProfile } from '../../types/supabase';

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
  const [conversations, setConversations] = useState<ConversationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [adminProfiles, setAdminProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-close conversations
  useAutoClose(adminIds);

  // Fetch admin profiles
  useEffect(() => {
    const fetchAdminProfiles = async () => {
      const { data: admins } = await supabase
        .from('users_profile')
        .select('id, email, full_name, role')
        .or('role.eq.admin,email.ilike.%@codfence.com');

      if (admins) {
        const profileMap = new Map<string, UserProfile>();
        const ids: string[] = [];
        admins.forEach((admin) => {
          // Create a partial UserProfile with required fields
          const adminProfile: UserProfile = {
            id: admin.id,
            email: admin.email,
            full_name: admin.full_name,
            role: admin.role || 'admin',
            phone: null,
            company_name: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
          };
          profileMap.set(admin.id, adminProfile);
          ids.push(admin.id);
        });
        setAdminProfiles(profileMap);
        setAdminIds(ids);
      }
    };

    fetchAdminProfiles();
  }, []);

  // Fetch all conversations (users who sent messages)
  useEffect(() => {
    const fetchConversations = async () => {
      if (!adminUser || adminIds.length === 0) return;

      try {
        setLoading(true);

        // Get all messages where receiver_id IS NULL (user messages visible to all admins)
        const { data: userMessages, error: userError } = await supabase
          .from('messages')
          .select('*')
          .is('receiver_id', null)
          .order('created_at', { ascending: false });

        // Get admin replies to users (where sender is admin and receiver is a user)
        const { data: adminReplies, error: replyError } = await supabase
          .from('messages')
          .select('*')
          .in('sender_id', adminIds)
          .not('receiver_id', 'is', null)
          .order('created_at', { ascending: false });

        if (userError) throw userError;
        if (replyError) throw replyError;

        // Combine messages
        const messagesData = [...(userMessages || []), ...(adminReplies || [])];

        // Group messages by user (sender_id when receiver_id is NULL, or sender_id when admin is receiver)
        const userMap = new Map<string, { messages: Message[]; unread: Message[] }>();

        messagesData?.forEach((msg) => {
          // Get user ID:
          // - If receiver_id is NULL, user is sender (user message to all admins)
          // - If receiver_id is a user ID, user is receiver (admin reply to user)
          const isUserMessage = msg.receiver_id === null;
          const isAdminReply = msg.receiver_id !== null && !adminIds.includes(msg.receiver_id);
          
          let userId: string | null = null;
          if (isUserMessage) {
            userId = msg.sender_id; // User sent message
          } else if (isAdminReply) {
            userId = msg.receiver_id; // Admin replied to user
          }
          
          if (!userId || adminIds.includes(userId)) return; // Skip admin-to-admin messages

          if (!userMap.has(userId)) {
            userMap.set(userId, { messages: [], unread: [] });
          }
          const userData = userMap.get(userId)!;
          userData.messages.push(msg);
          // Mark as unread if it's a user message (receiver_id is null) and not read
          if (!msg.read && msg.receiver_id === null) {
            userData.unread.push(msg);
          }
        });

        // Fetch user profiles
        const userIds = Array.from(userMap.keys());
        if (userIds.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const { data: profiles } = await supabase
          .from('users_profile')
          .select('id, email, full_name')
          .in('id', userIds);

        const profileMap = new Map<string, { id: string; email: string; full_name: string | null }>();
        profiles?.forEach((profile) => {
          profileMap.set(profile.id, {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
          });
        });

        // Build conversations list
        const convs: ConversationUser[] = Array.from(userMap.entries()).map(([userId, data]) => {
          const profile = profileMap.get(userId);
          const sortedMessages = data.messages.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          return {
            id: userId,
            email: profile?.email || userId,
            full_name: profile?.full_name || null,
            lastMessage: sortedMessages[0] || null,
            unreadCount: data.unread.length,
          };
        });

        // Sort by last message time
        convs.sort((a, b) => {
          if (!a.lastMessage && !b.lastMessage) return 0;
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return (
            new Date(b.lastMessage.created_at).getTime() -
            new Date(a.lastMessage.created_at).getTime()
          );
        });

        setConversations(convs);
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Set up real-time subscription
    const channel = supabase
      .channel('admin_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminUser, adminIds]);

  // Fetch messages for selected user
  useEffect(() => {
    const fetchUserMessages = async () => {
      if (!selectedUser) {
        setMessages([]);
        return;
      }

      try {
        setMessagesLoading(true);
        // Get all messages for this user:
        // - User messages (sender_id = user, receiver_id = null)
        // - Admin replies (receiver_id = user)
        const { data: userMessages, error: userError } = await supabase
          .from('messages')
          .select('*')
          .eq('sender_id', selectedUser)
          .is('receiver_id', null)
          .order('created_at', { ascending: true });

        const { data: adminReplies, error: replyError } = await supabase
          .from('messages')
          .select('*')
          .eq('receiver_id', selectedUser)
          .order('created_at', { ascending: true });

        if (userError) throw userError;
        if (replyError) throw replyError;

        // Combine and sort
        const allMessages = [...(userMessages || []), ...(adminReplies || [])];
        allMessages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(allMessages);

        // Mark unread messages as read when admin opens conversation
        // Mark all unread user messages (receiver_id is null) from this user
        const unreadIds = allMessages
          .filter((msg) => !msg.read && msg.receiver_id === null && msg.sender_id === selectedUser)
          .map((msg) => msg.id);

        if (unreadIds.length > 0 && adminUser) {
          await supabase
            .from('messages')
            .update({ read: true })
            .in('id', unreadIds);
        }
      } catch (err) {
        console.error('Error fetching user messages:', err);
        showError('Failed to load messages.');
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchUserMessages();

    // Set up real-time subscription for selected user
    if (selectedUser) {
      const channel = supabase
        .channel(`user_messages_${selectedUser}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${selectedUser}`,
          },
          () => {
            fetchUserMessages();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${selectedUser}`,
          },
          () => {
            fetchUserMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedUser, adminUser, adminIds]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !adminUser || !selectedUser) return;

    try {
      setUploading(true);
      let attachmentUrl: string | null = null;

      if (selectedFile) {
        try {
          attachmentUrl = await uploadFile(selectedFile);
        } catch (err) {
          console.error('Error uploading file:', err);
          showError('Failed to upload file. Please try again.');
          setUploading(false);
          return;
        }
      }

      // Send admin reply with receiver_id = user.id (so user can see it)
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_id: adminUser.id,
          receiver_id: selectedUser, // User ID so user can see the reply
          message: newMessage.trim() || null,
          attachment_url: attachmentUrl,
          read: false,
          system_message: false,
          broadcast: false,
        });

      if (insertError) throw insertError;

      setNewMessage('');
      setSelectedFile(null);
      
      // Refresh messages
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${selectedUser},receiver_id.eq.${selectedUser}`)
        .order('created_at', { ascending: true });

      if (!fetchError) {
        setMessages(data || []);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      showError('Failed to send message. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleBroadcast = async () => {
    if ((!broadcastMessage.trim() && !broadcastFile) || !adminUser) return;

    try {
      setBroadcasting(true);
      let attachmentUrl: string | null = null;

      if (broadcastFile) {
        try {
          attachmentUrl = await uploadFile(broadcastFile);
        } catch (err) {
          console.error('Error uploading broadcast file:', err);
          showError('Failed to upload file. Please try again.');
          setBroadcasting(false);
          return;
        }
      }

      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users_profile')
        .select('id')
        .eq('role', 'user');

      if (usersError) throw usersError;

      if (!users || users.length === 0) {
        showError('No users found to broadcast to.');
        setBroadcasting(false);
        return;
      }

      // Send message to all users
      const messagePromises = users.map((user) =>
        supabase.from('messages').insert({
          sender_id: adminUser.id,
          receiver_id: user.id,
          message: broadcastMessage.trim() || null,
          attachment_url: attachmentUrl,
          read: false,
          system_message: false,
          broadcast: true,
        })
      );

      await Promise.all(messagePromises);
      
      showSuccess(`Broadcast message successfully sent to ${users.length} user(s).`);
      setShowBroadcastModal(false);
      setBroadcastMessage('');
      setBroadcastFile(null);
    } catch (err) {
      console.error('Error broadcasting message:', err);
      showError('Failed to broadcast message. Please try again.');
    } finally {
      setBroadcasting(false);
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedUser);

  return (
    <div className="flex h-full gap-4">
      {/* Left Panel - Inbox */}
      <div className="w-80 flex-shrink-0 border-r border-[#1E223D]">
        <Card className="h-full rounded-none border-0">
          <CardHeader className="border-b border-[#1E223D]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Inbox</CardTitle>
              <Button
                size="sm"
                onClick={() => setShowBroadcastModal(true)}
                className="button-gradient"
              >
                <Megaphone size={16} className="mr-1" />
                Broadcast
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center text-[#E5E7EB]/70">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-[#E5E7EB]/70">No conversations yet</div>
            ) : (
              <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                {conversations.map((conv) => {
                  const isSelected = conv.id === selectedUser;
                  const hasUnread = conv.unreadCount > 0;
                  const lastMessageText = conv.lastMessage?.message || '';
                  const truncatedText =
                    lastMessageText.length > 50
                      ? lastMessageText.substring(0, 50) + '...'
                      : lastMessageText;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedUser(conv.id)}
                      className={`w-full text-left p-4 border-b border-[#1E223D] transition ${
                        isSelected
                          ? 'bg-[#2F3655]'
                          : hasUnread
                          ? 'bg-[#2F3655] hover:bg-[#3A4266] shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                          : 'bg-[#1A1D2E] hover:bg-[#252938]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#E5E7EB] truncate">
                            {conv.full_name || conv.email}
                          </p>
                          {conv.lastMessage && (
                            <p className="text-sm text-[#E5E7EB]/70 truncate mt-1">
                              {truncatedText}
                            </p>
                          )}
                        </div>
                        {hasUnread && (
                          <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 flex-shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-[#E5E7EB]/50 mt-1">
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

      {/* Right Panel - Chat */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <Card className="h-full rounded-none border-0 flex flex-col">
            <CardHeader className="border-b border-[#1E223D] flex-shrink-0">
              <CardTitle className="text-lg">
                {selectedConversation?.full_name || selectedConversation?.email || 'User'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col !p-0 min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0B0F28]">
                {messagesLoading && messages.length === 0 ? (
                  <div className="text-center text-[#E5E7EB]/70 py-8">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-[#E5E7EB]/70 py-8">
                    No messages yet. Start a conversation!
                  </div>
                ) : (
                  messages.map((message) => {
                    const isAdmin = adminIds.includes(message.sender_id);
                    const isImage = message.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    const isSystemMessage = message.system_message;
                    const adminProfile = isAdmin ? adminProfiles.get(message.sender_id) : null;
                    const adminName = adminProfile?.full_name || adminProfile?.email || 'Admin';

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isSystemMessage
                              ? 'bg-[#2A2E45] text-[#9CA3AF] italic'
                              : isAdmin
                              ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white'
                              : 'bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] text-white'
                          }`}
                        >
                          {message.attachment_url && (
                            <div className="mb-2">
                              {isImage ? (
                                <img
                                  src={message.attachment_url}
                                  alt="Attachment"
                                  className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                                />
                              ) : (
                                <a
                                  href={message.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-white/90 hover:text-white transition"
                                >
                                  <File size={16} />
                                  <span className="text-sm truncate">
                                    {message.attachment_url.split('/').pop()}
                                  </span>
                                  <Download size={14} />
                                </a>
                              )}
                            </div>
                          )}
                          {message.message && <p className="text-sm">{message.message}</p>}
                          <p className={`text-xs mt-1 ${isSystemMessage ? 'text-[#9CA3AF]' : 'text-white/70'} text-right`}>
                            {isAdmin && !isSystemMessage
                              ? formatMessageTimestampWithName(message.created_at, adminName)
                              : formatMessageTimestamp(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-[#1E223D] p-4 bg-[#0B0F28] flex-shrink-0 space-y-2">
                <FileUploader
                  onFileSelect={setSelectedFile}
                  onRemove={() => setSelectedFile(null)}
                  selectedFile={selectedFile}
                />
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                    disabled={uploading}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={uploading || (!newMessage.trim() && !selectedFile)}
                    className="button-gradient"
                  >
                    <Send size={18} />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center rounded-none border-0">
            <CardContent className="text-center text-[#E5E7EB]/70">
              Select a conversation to start chatting
            </CardContent>
          </Card>
        )}
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Broadcast Message to All Users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E5E7EB] mb-2">
                  Message
                </label>
                <Input
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter your broadcast message..."
                  className="w-full"
                />
              </div>
              <FileUploader
                onFileSelect={setBroadcastFile}
                onRemove={() => setBroadcastFile(null)}
                selectedFile={broadcastFile}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBroadcastModal(false);
                    setBroadcastMessage('');
                    setBroadcastFile(null);
                  }}
                  disabled={broadcasting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBroadcast}
                  disabled={broadcasting || (!broadcastMessage.trim() && !broadcastFile)}
                  className="button-gradient"
                >
                  {broadcasting ? 'Sending...' : 'Send to All Users'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

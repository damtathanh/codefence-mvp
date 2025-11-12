import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FileUploader } from '../../components/ui/FileUploader';
import { Send, Bot, Download, File as FileIcon } from 'lucide-react';
import { useAuth } from '../../features/auth';
import { formatMessageTimestamp } from '../../utils/formatTimestamp';
import { uploadFile } from '../../utils/uploadFile';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../components/ui/Toast';
import type { Message } from '../../types/supabase';

export const MessagePage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch messages for user
  const fetchMessages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      showError('Failed to load messages. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchMessages();

    // Set up real-time subscription
    const channel = supabase
      .channel('user_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user) {
      return;
    }

    try {
      setUploading(true);
      let attachmentUrl: string | null = null;

      // Upload file if selected
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

      // Send message with receiver_id = NULL (visible to all admins)
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: null,
          message: newMessage.trim() || null,
          attachment_url: attachmentUrl,
          read: false,
          system_message: false,
          broadcast: false,
        });

      if (insertError) throw insertError;

      // Show success confirmation
      showSuccess('Your message has been sent to CodFence support. We will reply shortly.');
      
      setNewMessage('');
      setSelectedFile(null);
      await fetchMessages(); // Refresh messages
    } catch (err) {
      console.error('Error sending message:', err);
      showError('Failed to send message. Please try again.');
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
                <div className="text-center text-[#E5E7EB]/70 py-8">
                  No messages yet. Start a conversation!
                </div>
              ) : (
                messages.map((message) => {
                  const isUser = message.sender_id === user.id;
                  const isImage = message.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  const isSystemMessage = message.system_message;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isSystemMessage
                            ? 'bg-[#2A2E45] text-[#9CA3AF] italic'
                            : isUser
                            ? 'bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] text-white'
                            : 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white'
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
                                <FileIcon size={16} />
                                <span className="text-sm truncate">
                                  {message.attachment_url.split('/').pop()}
                                </span>
                                <Download size={14} />
                              </a>
                            )}
                          </div>
                        )}
                        {message.message && (
                          <p className="text-sm">{message.message}</p>
                        )}
                        <p className={`text-xs mt-1 ${isSystemMessage ? 'text-[#9CA3AF]' : 'text-white/70'}`}>
                          {formatMessageTimestamp(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#1E223D] p-3 lg:p-4 bg-[#0B0F28] flex-shrink-0 space-y-2">
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
      </div>
    </div>
  );
};

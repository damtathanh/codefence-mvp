import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Send, Bot } from 'lucide-react';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../features/auth';
import type { Message } from '../../types/supabase';

interface FormattedMessage extends Message {
  formattedTime?: string;
  isUser?: boolean;
}

export const MessagePage: React.FC = () => {
  const { user } = useAuth();
  const {
    data: messages,
    loading,
    error,
    addItem,
  } = useSupabaseTable<Message>({ tableName: 'messages', enableRealtime: true });
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Format messages for display
  const formattedMessages: FormattedMessage[] = messages.map(msg => {
    const date = new Date(msg.created_at);
    const isUser = msg.sender === 'user' || msg.sender === user?.id;
    return {
      ...msg,
      formattedTime: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      isUser,
    };
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      await addItem({
        sender: 'user',
        content: newMessage,
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    }
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [formattedMessages]);

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

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-400">Error: {error}</p>
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
              Support Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col !p-0 min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-3 bg-[#0B0F28]">
              {formattedMessages.length === 0 ? (
                <div className="text-center text-[#E5E7EB]/70 py-8">
                  No messages yet. Start a conversation!
                </div>
              ) : (
                formattedMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.isUser
                          ? 'bg-[#8B5CF6] text-white'
                          : 'bg-white/10 text-[#E5E7EB]'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1.5 ${
                        message.isUser ? 'text-white/70' : 'text-[#E5E7EB]/70'
                      }`}>
                        {message.formattedTime}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#1E223D] p-3 lg:p-4 bg-[#0B0F28] flex-shrink-0">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm">
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


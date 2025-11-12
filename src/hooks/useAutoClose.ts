import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Message } from '../types/supabase';

interface Conversation {
  userId: string;
  adminId: string;
  lastMessage: Message;
}

/**
 * Hook to auto-close conversations after 15 minutes of inactivity
 * Runs every 5 minutes to check for conversations that need to be closed
 * After admin's last message, if user doesn't reply within 15 min, insert system message
 */
export function useAutoClose(adminIds: string[]) {
  useEffect(() => {
    if (adminIds.length === 0) return;

    const checkAndCloseConversations = async () => {
      try {
        // Get all recent messages (last 24 hours) where admin is involved
        const orConditions = adminIds.map(id => `sender_id.eq.${id},receiver_id.eq.${id}`).join(',');
        const { data: recentMessages, error } = await supabase
          .from('messages')
          .select('*')
          .or(orConditions)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching messages for auto-close:', error);
          return;
        }

        if (!recentMessages || recentMessages.length === 0) return;

        // Group messages by user (conversation with each user)
        const conversations = new Map<string, Conversation>();

        for (const msg of recentMessages) {
          const isAdminSender = adminIds.includes(msg.sender_id);
          const isAdminReceiver = adminIds.includes(msg.receiver_id);

          if (!isAdminSender && !isAdminReceiver) continue;

          // Get the user ID (non-admin participant)
          const userId = isAdminSender ? msg.receiver_id : msg.sender_id;
          const adminId = isAdminSender ? msg.sender_id : null;
          
          if (!userId) continue; // Skip if no user ID

          const key = userId; // One conversation per user

          if (!conversations.has(key) || 
              new Date(msg.created_at) > new Date(conversations.get(key)!.lastMessage.created_at)) {
            conversations.set(key, {
              userId,
              adminId: adminId || adminIds[0], // Use first admin if not specified
              lastMessage: msg,
            });
          }
        }

        // Check each conversation for auto-close condition
        const now = Date.now();
        const fifteenMinutes = 15 * 60 * 1000;

        for (const [userId, conv] of conversations.entries()) {
          const lastMessageTime = new Date(conv.lastMessage.created_at).getTime();
          const timeSinceLastMessage = now - lastMessageTime;

          // Check if:
          // 1. Last message was from admin (sender_id is admin)
          // 2. More than 15 minutes have passed
          // 3. No system message already exists for this conversation
          const lastMessageFromAdmin = adminIds.includes(conv.lastMessage.sender_id);
          const shouldClose = lastMessageFromAdmin && timeSinceLastMessage >= fifteenMinutes;

          if (shouldClose) {
            // Check if auto-close message already exists
            const { data: existingClose } = await supabase
              .from('messages')
              .select('id')
              .eq('sender_id', conv.adminId)
              .eq('receiver_id', conv.userId)
              .eq('system_message', true)
              .eq('message', 'This conversation has been automatically closed due to inactivity.')
              .gte('created_at', new Date(lastMessageTime).toISOString())
              .maybeSingle();

            if (!existingClose) {
              // Send auto-close message
              await supabase.from('messages').insert({
                sender_id: conv.adminId,
                receiver_id: conv.userId,
                message: 'This conversation has been automatically closed due to inactivity.',
                system_message: true,
                read: false,
              });
              console.log(`Auto-closed conversation with user: ${userId}`);
            }
          }
        }
      } catch (err) {
        console.error('Error in auto-close check:', err);
      }
    };

    // Run immediately, then every 5 minutes
    checkAndCloseConversations();
    const interval = setInterval(checkAndCloseConversations, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [adminIds]);
}


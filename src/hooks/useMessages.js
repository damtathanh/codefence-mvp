import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
export function useMessages(options = {}) {
    const { senderId, receiverId, enableRealtime = true } = options;
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchMessages = useCallback(async () => {
        if (!senderId && !receiverId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            let query = supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: true });
            // Fetch messages where user is sender or receiver
            if (senderId && receiverId) {
                // Get messages between two specific users
                // Use two separate queries and combine results, or use a filter
                const { data: sentData, error: sentError } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('sender_id', senderId)
                    .eq('receiver_id', receiverId)
                    .order('created_at', { ascending: true });
                const { data: receivedData, error: receivedError } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('sender_id', receiverId)
                    .eq('receiver_id', senderId)
                    .order('created_at', { ascending: true });
                if (sentError)
                    throw sentError;
                if (receivedError)
                    throw receivedError;
                const combined = [...(sentData || []), ...(receivedData || [])];
                combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                setMessages(combined);
                setLoading(false);
                return;
            }
            else if (senderId) {
                // Get all messages where user is sender or receiver
                query = query.or(`sender_id.eq.${senderId},receiver_id.eq.${senderId}`);
            }
            else if (receiverId) {
                // Get all messages where user is sender or receiver
                query = query.or(`sender_id.eq.${receiverId},receiver_id.eq.${receiverId}`);
            }
            const { data, error: fetchError } = await query;
            if (fetchError)
                throw fetchError;
            setMessages(data || []);
        }
        catch (err) {
            console.error('Error fetching messages:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch messages');
        }
        finally {
            setLoading(false);
        }
    }, [senderId, receiverId]);
    const markAsRead = useCallback(async (messageIds) => {
        if (messageIds.length === 0)
            return;
        try {
            const { error: updateError } = await supabase
                .from('messages')
                .update({ read: true })
                .in('id', messageIds);
            if (updateError)
                throw updateError;
        }
        catch (err) {
            console.error('Error marking messages as read:', err);
        }
    }, []);
    const sendMessage = useCallback(async (senderId, receiverId, message, attachmentUrl, systemMessage = false, broadcast = false) => {
        try {
            const { data, error: insertError } = await supabase
                .from('messages')
                .insert({
                sender_id: senderId,
                receiver_id: receiverId,
                message,
                attachment_url: attachmentUrl || null,
                read: false,
                system_message: systemMessage,
                broadcast: broadcast,
            })
                .select()
                .single();
            if (insertError)
                throw insertError;
            return data;
        }
        catch (err) {
            console.error('Error sending message:', err);
            throw err;
        }
    }, []);
    // Set up real-time subscription
    useEffect(() => {
        if (!enableRealtime || (!senderId && !receiverId))
            return;
        const channel = supabase
            .channel('messages')
            .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'messages',
        }, () => {
            fetchMessages();
        })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [enableRealtime, senderId, receiverId, fetchMessages]);
    // Initial fetch
    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);
    return {
        messages,
        loading,
        error,
        fetchMessages,
        markAsRead,
        sendMessage,
    };
}

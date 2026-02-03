import { useEffect, useRef, useState, useCallback } from 'react';
import { Message } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

export function useChat(conversationId: number | null) {
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<number, string | null>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isClosingRef = useRef<boolean>(false);
  const MAX_RECONNECT_ATTEMPTS = 6;
  const BASE_DELAY_MS = 1000;

  useEffect(() => {
    // Reset state when conversation changes
    setRealtimeMessages([]);
    setTypingUsers({});

    if (!conversationId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8005' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/chat/chat_${conversationId}/?token=${token}`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;
      isClosingRef.current = false;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'typing') {
            setTypingUsers((prev) => {
              const next = { ...prev };
              if (data.is_typing) {
                next[data.user_id] = data.username;
              } else {
                delete next[data.user_id];
              }
              return next;
            });
            return;
          }

          if (data.type === 'message' || data.message) {
            const newMessage: Message = {
              id: data.message_id || Date.now(),
              content: data.message,
              sender: data.sender_id,
              conversation: conversationId,
              created_at: data.created_at || new Date().toISOString(),
              file_url: data.file_url,
              file_name: data.file_name,
              file_type: data.file_type,
              file_size: data.file_size
            };

            setRealtimeMessages((prev) => [...prev, newMessage]);
            queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });

            // If the sender just messaged, they are definitely not typing anymore
            setTypingUsers((prev) => {
              const next = { ...prev };
              delete next[data.sender_id];
              return next;
            });
          }

          if (data.type === 'reaction') {
            queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
            setRealtimeMessages((prev) => prev.map(msg => {
              if (msg.id === data.message_id) {
                const currentReactions = msg.reactions || [];
                if (data.action === 'add') {
                  // Check if already exists to avoid duplicates (though minimal risk with unique ID)
                  if (currentReactions.some(r => r.user === data.user_id && r.emoji === data.emoji)) return msg;

                  return {
                    ...msg,
                    reactions: [...currentReactions, {
                      id: Date.now(), // Temporary ID until refresh
                      user: data.user_id,
                      user_username: data.username,
                      emoji: data.emoji,
                      created_at: new Date().toISOString()
                    }]
                  };
                } else if (data.action === 'remove') {
                  return {
                    ...msg,
                    reactions: currentReactions.filter(r => !(r.user === data.user_id && r.emoji === data.emoji))
                  };
                }
              }
              return msg;
            }));
          }
        } catch (err) {
          console.error('Chat WebSocket message error:', err);
        }
      };

      const scheduleReconnect = () => {
        if (isClosingRef.current) return;
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;
        const attempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = attempt;
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), 15000);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onclose = () => {
        scheduleReconnect();
      };

      ws.onerror = () => {
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      isClosingRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, [conversationId, queryClient]);

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping
      }));
    }
  }, []);

  const handleTyping = useCallback(() => {
    // Send typing start
    sendTypingStatus(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to send typing stop
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
      typingTimeoutRef.current = null;
    }, 3000);
  }, [sendTypingStatus]);

  return {
    realtimeMessages,
    typingUsers,
    handleTyping,
    sendTypingStatus
  };
}

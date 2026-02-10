import { useState, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { Message } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useChat(conversationId: number | null) {
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<number, string | null>>({});
  const queryClient = useQueryClient();

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'localhost:8005' : (typeof window !== 'undefined' ? window.location.host : '');
  
  const socketUrl = conversationId && token 
    ? `${protocol}//${host}/ws/chat/${conversationId}/?token=${token}`
    : null;

  const { sendMessage, lastJsonMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    onOpen: () => {
      // toast.success('Conectado ao chat'); // Opcional, pode ser chato
    },
    onClose: () => {
      // toast.error('Conexão perdida. Tentando reconectar...'); // Opcional
    },
    onError: (event) => {
      console.error("WebSocket error:", event);
      toast.error("Erro na conexão do chat. Verifique sua internet.");
    },
    onMessage: (event) => {
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
            conversation: conversationId!,
            created_at: data.created_at || new Date().toISOString(),
            file_url: data.file_url,
            file_name: data.file_name,
            file_type: data.file_type,
            file_size: data.file_size,
            reply_to: data.reply_to
          };

          setRealtimeMessages((prev) => [...prev, newMessage]);
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });

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
                if (currentReactions.some(r => r.user === data.user_id && r.emoji === data.emoji)) return msg;
                return {
                  ...msg,
                  reactions: [...currentReactions, {
                    id: Date.now(),
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

        if (data.type === 'read_receipt') {
          // 1. Update realtime messages
          setRealtimeMessages((prev) => prev.map(msg => {
            if (msg.id === data.message_id) {
              return { ...msg, is_read: true };
            }
            return msg;
          }));

          // 2. Update history messages in React Query cache
          queryClient.setQueryData(['messages', conversationId], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                results: page.results.map((msg: Message) => {
                  if (msg.id === data.message_id) {
                    return { ...msg, is_read: true };
                  }
                  return msg;
                })
              }))
            };
          });
        }

        if (data.type === 'delete_message') {
          // 1. Remove from realtime messages
          setRealtimeMessages((prev) => prev.filter(msg => msg.id !== data.message_id));

          // 2. Remove from history messages in React Query cache
          queryClient.setQueryData(['messages', conversationId], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                results: page.results.filter((msg: Message) => msg.id !== data.message_id)
              }))
            };
          });
        }

        if (data.type === 'edit_message') {
          // 1. Update realtime messages
          setRealtimeMessages((prev) => prev.map(msg => {
            if (msg.id === data.message_id) {
              return { ...msg, content: data.content, edited_at: data.edited_at };
            }
            return msg;
          }));

          // 2. Update history messages
          queryClient.setQueryData(['messages', conversationId], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                results: page.results.map((msg: Message) => {
                  if (msg.id === data.message_id) {
                    return { ...msg, content: data.content, edited_at: data.edited_at };
                  }
                  return msg;
                })
              }))
            };
          });
        }
      } catch (err) {
        console.error('Chat WebSocket message error:', err);
      }
    }
  });

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (readyState === ReadyState.OPEN) {
      sendMessage(JSON.stringify({
        type: 'typing',
        is_typing: isTyping
      }));
    }
  }, [readyState, sendMessage]);

  const handleTyping = useCallback(() => {
    sendTypingStatus(true);
    // Debounce logic for stopping typing would go here or be handled by useEffect cleanup
    const timeout = setTimeout(() => {
        sendTypingStatus(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [sendTypingStatus]);

  return {
    realtimeMessages,
    typingUsers,
    handleTyping,
    sendTypingStatus,
    readyState,
    lastMessage: lastJsonMessage
  };
}

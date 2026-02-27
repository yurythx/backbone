import { useState, useCallback, useRef, useEffect } from 'react';

import useWebSocket, { ReadyState } from 'react-use-websocket';
import { Message } from '@/types/messenger';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useChat(conversationId: number | null) {
  const [typingUsers, setTypingUsers] = useState<Record<number, string | null>>({});
  const queryClient = useQueryClient();

  // Debounce ref for typing status — a single timer, replaced on each keystroke
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const companySlug = typeof window !== 'undefined' ? localStorage.getItem('companySlug') : null;
  const envCompany = process.env.NEXT_PUBLIC_COMPANY_SLUG;
  const effectiveCompany = companySlug || envCompany || undefined;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005';
  const isSecure = (typeof window !== 'undefined' && window.location.protocol === 'https:') || apiUrl.startsWith('https');
  const protocol = isSecure ? 'wss:' : 'ws:';
  const host = apiUrl.replace(/^https?:\/\//, '');
  const socketUrl = conversationId && token
    ? `${protocol}//${host}/ws/chat/${conversationId}/?token=${encodeURIComponent(token)}${effectiveCompany ? `&company_slug=${encodeURIComponent(effectiveCompany)}` : ''}`
    : null;

  const { sendMessage, lastJsonMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    onOpen: () => {
      // Connection established — no toast to avoid noise
    },
    onClose: () => {
      // Reconnection is handled automatically by shouldReconnect
    },
    onError: (event) => {
      console.error("WebSocket error:", event);
      toast.error("Erro na conexão do chat. Verifique sua internet.");
    },
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);

        // ── Typing indicator ──────────────────────────────────
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

        // ── New message ───────────────────────────────────────
        if (data.type === 'message') {
          const newMessage: Message = {
            id: data.message_id,
            content: data.message,
            sender: data.sender_id,
            sender_username: data.sender_username,
            conversation: conversationId!,
            created_at: data.created_at,
            file_url: data.file_url,
            file_name: data.file_name,
            file_type: data.file_type,
            file_size: data.file_size,
            reply_to: data.reply_to ?? null,
            reactions: [],
            is_read: false,
            edited_at: null,
            is_deleted: false,
          };


          // Insert directly into React Query cache (avoid unnecessary HTTP refetch)
          type MessagesPage = { results: Message[]; next: string | null };
          type MessagesData = { pages: MessagesPage[]; pageParams?: unknown[] };
          queryClient.setQueryData<MessagesData | undefined>(
            ['messages', conversationId],
            (oldData) => {
              if (!oldData || !Array.isArray(oldData.pages)) {
                // Cache not populated yet or being refetched — fall back to invalidation
                queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
                return oldData;
              }
              // Pagination newest -> oldest: pages[0] is the newest page.
              // We prepend/append to the FIRST page to ensure it's in the latest results.
              const pages = [...oldData.pages];
              const firstPage = pages[0];
              const alreadyExists = pages.some((p) =>
                Array.isArray(p.results) && p.results.some((m: Message) => m.id === newMessage.id)
              );
              if (alreadyExists) return oldData;
              pages[0] = {
                ...firstPage,
                results: [...(firstPage.results ?? []), newMessage],
              };
              return { pages, pageParams: oldData.pageParams ?? [] };
            }
          );
          // Invalidate conversations list so unread count and last message update in sidebar
          queryClient.invalidateQueries({ queryKey: ['conversations'] });

          // Clear sender from typing users when their message arrives
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[data.sender_id];
            return next;
          });
          return;
        }

        // ── Reaction update ───────────────────────────────────
        if (data.type === 'reaction') {
          type MessagesPage = { results: Message[]; next: string | null };
          type MessagesData = { pages: MessagesPage[]; pageParams?: unknown[] };
          queryClient.setQueryData<MessagesData | undefined>(
            ['messages', conversationId],
            (oldData) => {
              if (!oldData || !Array.isArray(oldData.pages)) return oldData;
              return {
                pages: oldData.pages.map((page) => ({
                  ...page,
                  results: Array.isArray(page.results)
                    ? page.results.map((msg: Message) => {
                      if (msg.id !== data.message_id) return msg;
                      const currentReactions = msg.reactions || [];
                      if (data.action === 'add') {
                        if (currentReactions.some((r) => r.user === data.user_id && r.emoji === data.emoji))
                          return msg;
                        return {
                          ...msg,
                          reactions: [
                            ...currentReactions,
                            {
                              id: Date.now(),
                              user: data.user_id,
                              user_username: data.username,
                              emoji: data.emoji,
                              created_at: new Date().toISOString(),
                            },
                          ],
                        };
                      } else if (data.action === 'remove') {
                        return {
                          ...msg,
                          reactions: currentReactions.filter(
                            (r) => !(r.user === data.user_id && r.emoji === data.emoji)
                          ),
                        };
                      }
                      return msg;
                    })
                    : page.results,
                })),
                pageParams: oldData.pageParams ?? [],
              };
            }
          );
          return;
        }

        // ── Read receipt ──────────────────────────────────────
        if (data.type === 'read_receipt') {
          type MessagesPage = { results: Message[]; next: string | null };
          type MessagesData = { pages: MessagesPage[]; pageParams?: unknown[] };
          queryClient.setQueryData<MessagesData | undefined>(
            ['messages', conversationId],
            (oldData) => {
              if (!oldData || !Array.isArray(oldData.pages)) return oldData;
              return {
                pages: oldData.pages.map((page) => ({
                  ...page,
                  results: Array.isArray(page.results)
                    ? page.results.map((msg: Message) =>
                      msg.id === data.message_id ? { ...msg, is_read: true } : msg
                    )
                    : page.results,
                })),
                pageParams: oldData.pageParams ?? [],
              };
            }
          );
          return;
        }

        // ── Delete message ────────────────────────────────────
        if (data.type === 'delete_message') {
          type MessagesPage = { results: Message[]; next: string | null };
          type MessagesData = { pages: MessagesPage[]; pageParams?: unknown[] };
          queryClient.setQueryData<MessagesData | undefined>(
            ['messages', conversationId],
            (oldData) => {
              if (!oldData || !Array.isArray(oldData.pages)) return oldData;
              return {
                pages: oldData.pages.map((page) => ({
                  ...page,
                  results: Array.isArray(page.results)
                    ? page.results.map((msg: Message) =>
                      msg.id === data.message_id ? { ...msg, is_deleted: true, content: null, file_url: null } : msg
                    )
                    : page.results,



                })),
                pageParams: oldData.pageParams ?? [],
              };
            }
          );
          return;
        }

        // ── Edit message ──────────────────────────────────────
        if (data.type === 'edit_message') {
          type MessagesPage = { results: Message[]; next: string | null };
          type MessagesData = { pages: MessagesPage[]; pageParams?: unknown[] };
          queryClient.setQueryData<MessagesData | undefined>(
            ['messages', conversationId],
            (oldData) => {
              if (!oldData || !Array.isArray(oldData.pages)) return oldData;
              return {
                pages: oldData.pages.map((page) => ({
                  ...page,
                  results: Array.isArray(page.results)
                    ? page.results.map((msg: Message) =>
                      msg.id === data.message_id
                        ? { ...msg, content: data.content, edited_at: data.edited_at }
                        : msg
                    )
                    : page.results,
                })),
                pageParams: oldData.pageParams ?? [],
              };
            }
          );
          return;
        }
      } catch (err) {
        console.error('Chat WebSocket message error:', err);
      }
    }
  });

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (readyState === ReadyState.OPEN) {
      sendMessage(JSON.stringify({
        type: 'typing_status',
        is_typing: isTyping
      }));
    }
  }, [readyState, sendMessage]);

  // ── Heartbeat ───────────────────────────────────────
  // Keep connection alive every 30s
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (readyState === ReadyState.OPEN) {
      interval = setInterval(() => {
        sendMessage(JSON.stringify({ type: 'heartbeat' }));
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [readyState, sendMessage]);



  /**
   * Call this on every input change event.
   * Uses a single debounced timer — avoids creating multiple overlapping timers
   * (which was the original bug: each keystroke created a new timer, resulting in
   * multiple "typing=false" signals being sent after each key press).
   */
  const handleTyping = useCallback(() => {
    sendTypingStatus(true);

    // Clear any existing timer so only the last keystroke schedules the "stop"
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      sendTypingStatus(false);
      typingTimerRef.current = null;
    }, 3000);
  }, [sendTypingStatus]);

  return {
    typingUsers,
    handleTyping,
    sendTypingStatus,
    readyState,
    lastMessage: lastJsonMessage
  };
}

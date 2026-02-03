import { useEffect, useRef, useState } from 'react';

type PresenceStatus = 'online' | 'offline';

interface PresenceEvent {
  type: 'user.status';
  user_id: number;
  status: PresenceStatus;
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isClosingRef = useRef<boolean>(false);
  const MAX_RECONNECT_ATTEMPTS = 6;
  const BASE_DELAY_MS = 1000;

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8005' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/presence/?token=${token}`;

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

          if (data.type === 'user.status' || data.type === 'presence_update') {
            const user_id = data.user_id;
            const status = data.status;

            setOnlineUsers((prev) => {
              const next = new Set(prev);
              if (status === 'online') {
                next.add(user_id);
              } else {
                next.delete(user_id);
              }
              return next;
            });
          }
        } catch (err) { }
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
  }, []);

  return { onlineUsers };
}

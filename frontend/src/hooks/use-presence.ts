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

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/presence/?token=${token}`;

    console.log('Connecting to Presence WS:', wsUrl);

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('Presence WebSocket Connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle presence updates
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
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onclose = () => {
      console.log('Presence WebSocket Disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  return { onlineUsers };
}

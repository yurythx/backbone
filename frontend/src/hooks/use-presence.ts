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

    // For local dev with Docker, we mapped 8005 -> 8000
    let wsUrl = '';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      wsUrl = `ws://localhost:8005/ws/presence/?token=${token}`;
    } else {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const wsBase = apiUrl.replace(/^http/, 'ws');
      wsUrl = `${wsBase}/ws/presence/?token=${token}`;
    }

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

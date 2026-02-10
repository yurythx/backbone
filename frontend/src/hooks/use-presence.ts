import { useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'localhost:8005' : (typeof window !== 'undefined' ? window.location.host : '');
  
  const socketUrl = token 
    ? `${protocol}//${host}/ws/presence/?token=${token}`
    : null;

  useWebSocket(socketUrl, {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    onMessage: (event) => {
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
    }
  });

  return { onlineUsers };
}

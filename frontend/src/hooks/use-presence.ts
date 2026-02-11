import { useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  // Ensure we use the configured API URL for WebSockets, handling both ws/wss protocols
  // and ensuring we don't accidentally use the frontend domain if API is on a different one.
  const getWebSocketUrl = () => {
      if (typeof window === 'undefined') return null;
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005';
      const isSecure = apiUrl.startsWith('https') || window.location.protocol === 'https:';
      const protocol = isSecure ? 'wss:' : 'ws:';
      
      // Remove protocol to get just the host
      const host = apiUrl.replace(/^https?:\/\//, '');
      
      return `${protocol}//${host}/ws/presence/?token=${token}`;
  };

  const socketUrl = token ? getWebSocketUrl() : null;

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

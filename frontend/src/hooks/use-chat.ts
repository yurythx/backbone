import { useEffect, useRef, useState } from 'react';
import { Message } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

export function useChat(conversationId: number | null) {
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Reset realtime messages when conversation changes
    setRealtimeMessages([]);
    
    if (!conversationId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // const host = window.location.host; 
    const wsUrl = `ws://localhost:8000/ws/chat/chat_${conversationId}/?token=${token}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log(`Chat WebSocket Connected: chat_${conversationId}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Assuming backend sends the full message object or at least the fields we need
        // Adjust based on actual backend format. Usually backend sends { message: "...", sender: "..." } or full serialized object
        // If the backend sends simple text, we might need to adjust.
        // Based on typical Django Channels tutorials, it might be just payload.
        // Let's assume it sends a structure compatible with Message interface or we map it.
        // For now, let's assume the backend broadcasts the serialized message.
        
        if (data.message) {
           // We need to shape this into a Message object if it isn't one.
           // Since we are building from scratch, let's assume we'll fix backend to send proper data
           // OR we handle what we defined in HANDOFF: { message: "...", sender: "alice" }
           // But our Message type has id, created_at etc.
           // For a robust UI, we should refetch or optimistically add.
           // Let's optimistically add a "received" message.
           
           const newMessage: Message = {
             id: Date.now(), // Temp ID
             content: data.message,
             sender: typeof data.sender === 'string' ? 0 : data.sender, // We might need sender ID
             conversation: conversationId,
             created_at: new Date().toISOString()
           };
           
           setRealtimeMessages((prev) => [...prev, newMessage]);
           
           // Invalidate query to fetch latest from DB to ensure consistency
           queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      } catch (err) {
        console.error('Chat WebSocket error:', err);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [conversationId, queryClient]);

  return { realtimeMessages };
}

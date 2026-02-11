import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/axios"
import { useQuery, useQueryClient } from "@tanstack/react-query"

export interface Notification {
    id: string
    notification_type: 'message' | 'system' | 'approval'
    title: string
    message: string
    link?: string
    is_read: boolean
    created_at: string
}

export function useNotifications() {
    const queryClient = useQueryClient()
    const [socket, setSocket] = useState<WebSocket | null>(null)

    const query = useQuery<Notification[]>({
        queryKey: ['notifications'],
        queryFn: async () => {
            try {
                const res = await api.get<Notification[]>('/api/notifications/notifications/')
                return res.data
            } catch (err) {
                console.error("[useNotifications] Fetch error:", err)
                return []
            }
        },
        initialData: []
    })

    // Final safety layer: ensure 'notifications' is ALWAYS an array
    if (typeof window !== 'undefined') {
        (window as any).__LAST_NOTIFICATIONS__ = query.data;
    }

    const notifications = Array.isArray(query.data) ? query.data : []

    // Protect unreadCount calculation with absolute certainty
    let unreadCount = 0
    try {
        if (Array.isArray(notifications)) {
            unreadCount = notifications.filter(n => n && !n.is_read).length
        }
    } catch (e) {
        console.error("[useNotificationsV2] Error calculating unreadCount:", e)
        unreadCount = 0
    }

    console.log("[useNotificationsV2] State:", { notificationsCount: notifications.length, unreadCount });

    const setupWebSocket = useCallback(() => {
        const token = localStorage.getItem('accessToken')
        if (!token) return

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005';
        const isSecure = apiUrl.startsWith('https') || window.location.protocol === 'https:';
        const protocol = isSecure ? 'wss:' : 'ws:';
        const host = apiUrl.replace(/^https?:\/\//, '');
        
        const wsUrl = `${protocol}//${host}/ws/notifications/?token=${token}`

        const ws = new WebSocket(wsUrl)

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.type === 'notification_message') {
                    queryClient.invalidateQueries({ queryKey: ['notifications'] })
                }
            } catch (err) {
                console.error("[useNotifications] WebSocket message error:", err)
            }
        }

        ws.onclose = () => {
            setTimeout(setupWebSocket, 3000)
        }

        setSocket(ws)
    }, [queryClient])

    useEffect(() => {
        setupWebSocket()
        return () => {
            socket?.close()
        }
    }, [setupWebSocket])

    const markAsRead = async (id: string) => {
        try {
            await api.post(`/api/notifications/notifications/${id}/mark_as_read/`)
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        } catch (err) {
            console.error("[useNotifications] markAsRead error:", err)
        }
    }

    const markAllAsRead = async () => {
        try {
            await api.post('/api/notifications/notifications/mark_all_as_read/')
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        } catch (err) {
            console.error("[useNotifications] markAllAsRead error:", err)
        }
    }

    return {
        notifications,
        unreadCount,
        isLoading: query.isLoading,
        markAsRead,
        markAllAsRead
    }
}

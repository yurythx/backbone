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

    const { data: notifications = [], isLoading } = useQuery<Notification[]>({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/api/notifications/')
            return res.data.results || res.data
        }
    })

    const unreadCount = notifications.filter(n => !n.is_read).length

    const setupWebSocket = useCallback(() => {
        const token = localStorage.getItem('accessToken')
        if (!token) return

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8005'
        const wsUrl = `${protocol}//${host}/ws/notifications/?token=${token}`

        const ws = new WebSocket(wsUrl)

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.type === 'notification_message') {
                // Invalidate and refetch
                queryClient.invalidateQueries({ queryKey: ['notifications'] })

                // Play subtle sound or show toast?
                // For now, let's just use the query invalidation
            }
        }

        ws.onclose = () => {
            setTimeout(setupWebSocket, 3000) // Reconnect after 3s
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
        await api.post(`/api/notifications/${id}/mark_as_read/`)
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    const markAllAsRead = async () => {
        await api.post('/api/notifications/mark_all_as_read/')
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead
    }
}

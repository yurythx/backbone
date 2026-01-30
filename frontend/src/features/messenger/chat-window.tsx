import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Send, Loader2 } from "lucide-react"
import { api } from "@/lib/axios"
import { Contact, Message, Conversation } from "@/types"
import { useChat } from "@/hooks/use-chat"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface ChatWindowProps {
  contact: Contact;
  currentUser: { id: number; username: string } | null;
}

export function ChatWindow({ contact, currentUser }: ChatWindowProps) {
  const [messageInput, setMessageInput] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // 1. Get or Create Conversation
  const { data: conversation, isLoading: isLoadingConv } = useQuery({
    queryKey: ['conversation', contact.id],
    queryFn: async () => {
      // First, try to find existing conversation with this participant
      // We need an endpoint for this, or filter client side from list.
      // For efficiency, let's list all and filter.
      const res = await api.get<Conversation[]>('/api/messenger/conversations/')
      const found = res.data.find(c => c.participants.some(p => p.id === contact.id))
      
      if (found) return found

      // If not found, create one
      const createRes = await api.post<Conversation>('/api/messenger/conversations/', {
        target_username: contact.username
      })
      return createRes.data
    },
    enabled: !!contact.id
  })

  // 2. Fetch Messages
  const { data: historyMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return []
      const res = await api.get<Message[]>(`/api/messenger/conversations/${conversation.id}/messages/`)
      return res.data
    },
    enabled: !!conversation?.id,
    refetchInterval: 5000 // Polling fallback
  })

  // 3. WebSocket Hook
  const { realtimeMessages } = useChat(conversation?.id || null)

  // 4. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversation?.id) throw new Error("No conversation")
      await api.post(`/api/messenger/conversations/${conversation.id}/send_message/`, {
        content
      })
    },
    onSuccess: () => {
      setMessageInput("")
      queryClient.invalidateQueries({ queryKey: ['messages', conversation?.id] })
    }
  })

  // Merge history and realtime (deduplicated by ID ideally, but here just simple concat for demo)
  // Real app would merge carefully.
  const messages = React.useMemo(() => {
    const combined = [...(historyMessages || []), ...realtimeMessages]
    // Simple dedupe by ID if real IDs exist
    const seen = new Set()
    return combined.filter(m => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [historyMessages, realtimeMessages])

  // Scroll to bottom on new message
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim()) return
    sendMessageMutation.mutate(messageInput)
  }

  if (isLoadingConv) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading conversation...</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 border-b flex items-center px-6 justify-between bg-card">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={`https://avatar.vercel.sh/${contact.username}`} />
            <AvatarFallback>{contact.username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{contact.username}</div>
            <div className="text-xs text-muted-foreground">
              {contact.is_online ? (
                <span className="text-green-500 flex items-center gap-1">● Online</span>
              ) : (
                "Offline"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((msg) => {
            const isMe = msg.sender === currentUser?.id
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                  isMe
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.content}
                <span className={cn("text-[10px]", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-card">
        <form onSubmit={handleSend} className="flex gap-2 max-w-3xl mx-auto">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={sendMessageMutation.isPending}>
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

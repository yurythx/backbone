import * as React from "react"
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { Send, Loader2, Paperclip, FileIcon, Download, X, ImageIcon, Check } from "lucide-react"
import { api } from "@/lib/axios"
import { Contact, Message, Conversation, MessageReaction } from "@/types"
import { useChat } from "@/hooks/use-chat"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SmilePlus } from "lucide-react"

interface ChatWindowProps {
  contact: Contact;
  currentUser: { id: number; username: string } | null;
}

export function ChatWindow({ contact, currentUser }: ChatWindowProps) {
  const [messageInput, setMessageInput] = React.useState("")
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const topRef = React.useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [sendError, setSendError] = React.useState<string | null>(null)
  const lastPayloadRef = React.useRef<{ content: string; file?: File | null } | null>(null)
  const retryCountRef = React.useRef<number>(0)
  const BASE_RETRY_DELAY_MS = 1000

  // 1. Get or Create Conversation
  const { data: conversation, isLoading: isLoadingConv } = useQuery({
    queryKey: ['conversation', contact.id],
    queryFn: async () => {
      const res = await api.get<Conversation[]>('/api/messenger/conversations/')
      const found = res.data.find(c => c.participants.some(p => p.id === contact.id))
      if (found) return found
      const createRes = await api.post<Conversation>('/api/messenger/conversations/', {
        target_username: contact.username
      })
      return createRes.data
    },
    enabled: !!contact.id
  })

  // 2. Fetch Messages with Infinite Query (Timestamp-based)
  const {
    data: infiniteMessages,
    isLoading: isLoadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['messages', conversation?.id],
    queryFn: async ({ pageParam }) => {
      if (!conversation?.id) return { results: [], next: null }

      let url = `/api/messenger/conversations/${conversation.id}/messages/`
      if (pageParam) {
        url = `${url}?before=${encodeURIComponent(pageParam as string)}`
      }

      const res = await api.get<{ results: Message[], next: string | null }>(url)
      return res.data
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.results || lastPage.results.length === 0) return undefined
      // The results are returned in chronological order, so the first one is the oldest in this page
      const oldest = lastPage.results[0]
      return lastPage.next ? oldest.created_at : undefined
    },
    initialPageParam: null as string | null,
    enabled: !!conversation?.id,
  })

  // 3. WebSocket Hook
  const { realtimeMessages, typingUsers, handleTyping, sendTypingStatus } = useChat(conversation?.id || null)

  // 4. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, file }: { content: string, file?: File | null }) => {
      if (!conversation?.id) throw new Error("No conversation")

      const formData = new FormData()
      if (content) formData.append('content', content)
      if (file) formData.append('file', file)

      await api.post(`/api/messenger/conversations/${conversation.id}/send_message/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    onSuccess: () => {
      setMessageInput("")
      setSelectedFile(null)
      setSendError(null)
      retryCountRef.current = 0
      lastPayloadRef.current = null
      queryClient.invalidateQueries({ queryKey: ['messages', conversation?.id] })
    },
    onError: () => {
      const attempts = retryCountRef.current
      if (attempts < 3 && lastPayloadRef.current) {
        const next = attempts + 1
        retryCountRef.current = next
        setSendError(`Erro ao enviar. Tentando novamente (${next}/3)...`)
        const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempts), 5000)
        setTimeout(() => {
          if (lastPayloadRef.current) {
            sendMessageMutation.mutate(lastPayloadRef.current)
          }
        }, delay)
      } else {
        setSendError("Falha ao enviar mensagem. Verifique a conexão e tente novamente.")
        toast({
          title: "Erro ao enviar",
          description: "Não foi possível enviar sua mensagem.",
          variant: "destructive"
        })
      }
    }
  })

  // Merge history and realtime
  const messages = React.useMemo(() => {
    const history = infiniteMessages?.pages.flatMap((page: { results: Message[] }) => page.results) || []
    const combined = [...history, ...realtimeMessages]
    const seen = new Set()
    return combined.filter(m => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [infiniteMessages, realtimeMessages])

  // Scroll to bottom on NEW realtime message
  React.useEffect(() => {
    if (scrollRef.current && realtimeMessages.length > 0) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [realtimeMessages])

  // Initial scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current && messages.length > 0 && !isFetchingNextPage) {
      scrollRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [conversation?.id])

  // Infinite Scroll Observer
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    if (topRef.current) {
      observer.observe(topRef.current)
    }

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() && !selectedFile) return

    sendTypingStatus(false)

    lastPayloadRef.current = { content: messageInput, file: selectedFile }
    retryCountRef.current = 0
    setSendError(null)
    sendMessageMutation.mutate(lastPayloadRef.current)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)
    handleTyping()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "Arquivo muito grande",
          description: "O limite é de 10MB.",
          variant: "destructive"
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleReaction = async (messageId: number, emoji: string, currentReactions: MessageReaction[]) => {
    const hasReacted = currentReactions?.some(r => r.user === currentUser?.id && r.emoji === emoji);
    const action = hasReacted ? 'remove' : 'add';

    try {
      await api.post(`/api/messenger/messages/${messageId}/reaction/`, { emoji, action });
    } catch (e) {
      toast({
        title: "Erro",
        description: "Falha ao reagir",
        variant: "destructive"
      })
    }
  }

  if (isLoadingConv) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Carregando conversa...</div>
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-16 border-b flex items-center px-6 justify-between bg-gradient-to-r from-primary/10 via-card to-primary/5 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={`https://avatar.vercel.sh/${contact.username}`} />
            <AvatarFallback>{contact.username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{contact.username}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {contact.is_online ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-green-600 font-medium">Online Agora</span>
                </>
              ) : (
                <span className="opacity-70">Offline</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 overflow-x-hidden">
        <div className="space-y-4 max-w-4xl mx-auto pb-4">

          {hasNextPage && <div ref={topRef} className="h-1" />}

          {isFetchingNextPage && (
            <div className="flex justify-center p-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {messages.map((msg) => {
            const isMe = msg.sender === currentUser?.id
            const isImage = msg.file_type?.startsWith('image/')

            return (
              <div
                key={msg.id}
                ref={(el) => {
                  if (el && !msg.is_read && msg.sender !== currentUser?.id) {
                    const observer = new IntersectionObserver(
                      (entries) => {
                        if (entries[0].isIntersecting) {
                          api.post(`/api/messenger/messages/${msg.id}/mark_read/`)
                            .then(() => {
                              msg.is_read = true;  // Optimistic update
                            })
                            .catch(() => { })
                          observer.disconnect()
                        }
                      },
                      { threshold: 0.5 }
                    )
                    observer.observe(el)
                  }
                }}
                className={cn(
                  "flex flex-col gap-1 w-full",
                  isMe ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "group relative flex flex-col gap-2 rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all",
                    isMe
                      ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-tr-none ml-12 shadow-primary/20"
                      : "bg-background/95 backdrop-blur text-foreground rounded-tl-none mr-12 border"
                  )}
                >
                  {/* Image Attachment */}
                  {isImage && msg.file_url && (
                    <div className="mb-2 overflow-hidden rounded-lg border bg-background/50">
                      <img
                        src={msg.file_url}
                        alt={msg.file_name}
                        className="max-h-[300px] w-full object-contain cursor-pointer transition-transform hover:scale-[1.02]"
                        onClick={() => window.open(msg.file_url, '_blank')}
                      />
                    </div>
                  )}

                  {/* Other File Attachment */}
                  {!isImage && msg.file_url && (
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border mb-1",
                      isMe ? "bg-primary-foreground/10 border-primary-foreground/20" : "bg-background/50 border-border"
                    )}>
                      <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shrink-0 shadow-sm">
                        <FileIcon className={cn("h-5 w-5", isMe ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-medium truncate text-xs">{msg.file_name}</p>
                        <p className="text-[10px] opacity-70">
                          {(msg.file_size || 0) > 1024 * 1024
                            ? `${((msg.file_size || 0) / (1024 * 1024)).toFixed(1)} MB`
                            : `${((msg.file_size || 0) / 1024).toFixed(0)} KB`}
                        </p>
                      </div>
                      <a
                        href={msg.file_url}
                        download={msg.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "p-2 rounded-full hover:bg-background/20 transition-colors",
                          isMe ? "text-primary-foreground" : "text-primary"
                        )}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  )}

                  {msg.content && <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>}

                  <div className="flex items-center justify-between gap-4 mt-0.5">
                    <span className={cn(
                      "text-[10px] font-medium opacity-60",
                      isMe ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {isMe && (
                      <div className="flex items-center -mr-1 scale-90">
                        {msg.is_read ? (
                          <div className="flex -space-x-1">
                            <Check className="h-3 w-3 text-sky-300" />
                            <Check className="h-3 w-3 text-sky-300" />
                          </div>
                        ) : (
                          <Check className="h-3 w-3 text-primary-foreground/40" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reactions Display */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={cn("flex gap-1 flex-wrap mt-1", isMe ? "justify-end" : "justify-start")}>
                      {Object.entries((msg.reactions || []).reduce((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || []).concat(r);
                        return acc;
                      }, {} as Record<string, MessageReaction[]>)).map(([emoji, reactions]) => {
                        const isReactedByMe = reactions.some(r => r.user === currentUser?.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji, msg.reactions || [])}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors z-10",
                              isReactedByMe ? "bg-primary/10 border-primary/20 text-primary" : "bg-card border-border hover:bg-muted"
                            )}
                          >
                            <span>{emoji}</span>
                            <span className="font-medium">{reactions.length}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Reaction Picker Button */}
                  <div className={cn(
                    "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    isMe ? "-left-8" : "-right-8"
                  )}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background shadow-sm border">
                          <SmilePlus className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isMe ? "end" : "start"} className="flex gap-1 p-1">
                        {["👍", "❤️", "😂", "😮", "😢", "😡"].map(emoji => (
                          <DropdownMenuItem key={emoji} onClick={() => handleReaction(msg.id, emoji, msg.reactions || [])} className="cursor-pointer justify-center text-lg px-2 hover:bg-accent rounded-sm">
                            {emoji}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {Object.entries(typingUsers).length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse ml-1">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce"></span>
              </div>
              <span>
                {Object.values(typingUsers).join(", ")} {Object.values(typingUsers).length === 1 ? "está digitando..." : "estão digitando..."}
              </span>
            </div>
          )}

          <div ref={scrollRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-card shrink-0">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* File Preview */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/20 animate-in slide-in-from-bottom-2 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                {selectedFile.type.startsWith('image/') ? (
                  <ImageIcon className="h-5 w-5 text-primary" />
                ) : (
                  <Paperclip className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Pronto para enviar
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {sendError && (
            <div className="w-full text-sm text-destructive font-medium bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
              {sendError}
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <div className="flex-1 relative bg-muted rounded-xl border focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Input
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (messageInput.trim() || selectedFile) {
                      sendTypingStatus(false)
                      lastPayloadRef.current = { content: messageInput, file: selectedFile }
                      retryCountRef.current = 0
                      setSendError(null)
                      sendMessageMutation.mutate(lastPayloadRef.current)
                    }
                  }
                }}
                placeholder="Escreva uma mensagem..."
                className="border-none bg-transparent focus-visible:ring-0 min-h-[44px] py-2.5"
                autoFocus
              />
              <div className="absolute right-2 bottom-1.5 flex gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              size="icon"
              className="h-11 w-11 rounded-xl shadow-lg shadow-primary/20 shrink-0"
              disabled={sendMessageMutation.isPending || (!messageInput.trim() && !selectedFile)}
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

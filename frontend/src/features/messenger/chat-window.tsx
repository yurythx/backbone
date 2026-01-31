import * as React from "react"
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { Send, Loader2, Paperclip, FileIcon, Download, X, ImageIcon } from "lucide-react"
import { api } from "@/lib/axios"
import { Contact, Message, Conversation } from "@/types"
import { useChat } from "@/hooks/use-chat"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

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

  // 2. Fetch Messages with Infinite Query
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
        url = (pageParam as string).startsWith('http') ? (pageParam as string) : `${url}?page=${pageParam}`
      }

      const res = await api.get<{ results: Message[], next: string | null }>(url)
      return res.data
    },
    getNextPageParam: (lastPage) => lastPage.next || undefined,
    initialPageParam: null as string | null,
    enabled: !!conversation?.id,
  })

  // 3. WebSocket Hook
  const { realtimeMessages } = useChat(conversation?.id || null)

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
      queryClient.invalidateQueries({ queryKey: ['messages', conversation?.id] })
    },
    onError: () => {
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar sua mensagem.",
        variant: "destructive"
      })
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() && !selectedFile) return
    sendMessageMutation.mutate({ content: messageInput, file: selectedFile })
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

  if (isLoadingConv) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Carregando conversa...</div>
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-16 border-b flex items-center px-6 justify-between bg-card shrink-0">
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
          {hasNextPage && (
            <div className="flex justify-center p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                {isFetchingNextPage ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                Carregar mensagens anteriores
              </Button>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = msg.sender === currentUser?.id
            const isImage = msg.file_type?.startsWith('image/')

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-1 w-full",
                  isMe ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "group relative flex flex-col gap-2 rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-none ml-12"
                      : "bg-muted text-foreground rounded-tl-none mr-12"
                  )}
                >
                  {/* Image Attachment */}
                  {isImage && msg.file_url && (
                    <div className="mb-2 overflow-hidden rounded-lg border bg-background/10">
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

                  <span className={cn(
                    "text-[10px] font-medium mt-0.5 self-end opacity-60",
                    isMe ? "text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={scrollRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-card shrink-0">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* File Preview */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border border-primary/20 animate-in slide-in-from-bottom-2">
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                {selectedFile.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-primary" /> : <Paperclip className="h-4 w-4 text-primary" />}
              </div>
              <span className="text-xs font-medium truncate flex-1">{selectedFile.name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedFile(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <div className="flex-1 relative bg-muted rounded-xl border focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
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

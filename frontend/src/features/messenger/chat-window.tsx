import * as React from "react"
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { Send, Loader2, Paperclip, FileIcon, Download, X, ImageIcon, Check, SmilePlus, Reply, ArrowLeft, MoreVertical, Trash2, Copy, Pencil } from "lucide-react"
import { api } from "@/lib/axios"
import { Contact, Message, Conversation, MessageReaction, User } from "@/types"
import { useChat } from "@/hooks/use-chat"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ChatWindowProps {
  contact: Contact;
  currentUser: User | null;
  onBack?: () => void;
}

export function ChatWindow({ contact, currentUser, onBack }: ChatWindowProps) {
  // Force HMR refresh
  const [messageInput, setMessageInput] = React.useState("")
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const topRef = React.useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const [sendError, setSendError] = React.useState<string | null>(null)
  const lastPayloadRef = React.useRef<{ content: string; file?: File | null; replyToId?: number } | null>(null)
  const retryCountRef = React.useRef<number>(0)
  const BASE_RETRY_DELAY_MS = 1000
  const [isDragging, setIsDragging] = React.useState(false)
  const [replyingTo, setReplyingTo] = React.useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = React.useState<Message | null>(null)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)
  const [lightboxIndex, setLightboxIndex] = React.useState(0)
  
  const inputRef = React.useRef<HTMLInputElement>(null)

  // 1. Get or Create Conversation
  const { data: conversation, isLoading: isLoadingConv, error: convError } = useQuery({
    queryKey: ['conversation', contact.id],
    queryFn: async () => {
      // Try to find existing conversation via dedicated endpoint
      try {
        const findRes = await api.get<Conversation>(`/api/messenger/conversations/find_by_participant/?username=${contact.username}`)
        return findRes.data
      } catch (err) {
        // Not found (404), so create it
        const createRes = await api.post<Conversation>('/api/messenger/conversations/', {
          target_username: contact.username
        })
        return createRes.data
      }
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
      const oldest = lastPage.results[0]
      // Only continue if we received a full page (indicating there might be more)
      // or if backend explicitly tells us there is a next page
      return lastPage.next ? oldest.created_at : undefined
    },
    initialPageParam: null as string | null,
    enabled: !!conversation?.id,
  })

  // 3. WebSocket Hook
  const { realtimeMessages, typingUsers, handleTyping, sendTypingStatus, lastMessage } = useChat(conversation?.id ?? null)

  // Sound effect
  const playNotificationSound = React.useCallback(() => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(e => console.log('Audio play failed', e));
  }, []);

  // Effect for sound notification
  React.useEffect(() => {
      // @ts-ignore
      if (lastMessage && lastMessage.sender !== currentUser?.id) {
          playNotificationSound();
      }
  }, [lastMessage, currentUser?.id, playNotificationSound]);

  // Collect all images for Lightbox
  const allMessages = React.useMemo(() => {
      // Handle potential undefined infiniteMessages or pages
      const history = infiniteMessages?.pages?.flatMap((page: any) => page.results || []) || [];
      const historyReversed = [...history].reverse();
      
      // Remove duplicates
      const historyIds = new Set(historyReversed.map((m: Message) => m.id));
      const uniqueRealtime = realtimeMessages.filter(m => !historyIds.has(m.id));
      
      return [...historyReversed, ...uniqueRealtime];
  }, [infiniteMessages, realtimeMessages]);

  const images = React.useMemo(() => {
      return allMessages
        .filter(m => m.file_type?.startsWith('image/') && m.file_url)
        .map(m => ({ src: m.file_url!, alt: m.file_name }));
  }, [allMessages]);

  const handleImageClick = (imageUrl: string) => {
      const index = images.findIndex(img => img.src === imageUrl);
      if (index >= 0) {
          setLightboxIndex(index);
          setLightboxOpen(true);
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("Arquivo muito grande: O limite é de 10MB.")
        return
      }
      setSelectedFile(file)
    }
  }

  // 2. Fetch Messages with Infinite Query - Moved to top


  // 3. WebSocket Hook
  // Moved to top-level to avoid conditional hook call if we had it inside
  // But we already called it above at line 64, so let's remove this duplicate declaration
  // and use the values from the first call.
  
  // 4. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, file, replyToId }: { content: string, file?: File | null, replyToId?: number | null }) => {
      if (!conversation?.id) throw new Error("No conversation")

      const formData = new FormData()
      if (content) formData.append('content', content)
      if (file) formData.append('file', file)
      if (replyToId) formData.append('reply_to_id', replyToId.toString())

      await api.post(`/api/messenger/conversations/${conversation.id}/send_message/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    onSuccess: () => {
      setMessageInput("")
      setSelectedFile(null)
      setReplyingTo(null)
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
        toast.error("Erro ao enviar: Não foi possível enviar sua mensagem.")
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

  // Infinite Scroll Observer - DISABLED AUTO-FETCH
  // We are using the manual "Carregar mensagens anteriores" button for better UX stability
  // React.useEffect(() => {
  //   if (!hasNextPage || isFetchingNextPage) return;
  //   const observer = new IntersectionObserver(...)
  // }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() && !selectedFile) return

    if (!conversation?.id) {
        toast.error("Erro: Conversa não inicializada.");
        return;
    }

    sendTypingStatus(false)
    
    // Check if editing
    if (editingMessage) {
      editMessageMutation.mutate({ messageId: editingMessage.id, content: messageInput })
      return
    }

    lastPayloadRef.current = { content: messageInput, file: selectedFile, replyToId: replyingTo?.id }
    retryCountRef.current = 0
    setSendError(null)
    console.log("[ChatWindow] Mutating sendMessageMutation with:", lastPayloadRef.current);
    sendMessageMutation.mutate(lastPayloadRef.current)
  }

  // Edit Message Mutation
  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number, content: string }) => {
      await api.patch(`/api/messenger/messages/${messageId}/`, { content })
    },
    onSuccess: () => {
      setEditingMessage(null)
      setMessageInput("")
      toast.success("Mensagem editada")
    },
    onError: () => {
      toast.error("Erro ao editar mensagem")
    }
  })

  const handleEdit = (msg: Message) => {
    setEditingMessage(msg)
    setMessageInput(msg.content)
    inputRef.current?.focus()
  }
  
  const cancelEdit = () => {
    setEditingMessage(null)
    setMessageInput("")
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessageInput(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)
    handleTyping()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("Arquivo muito grande: O limite é de 10MB.")
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
      toast.error("Falha ao reagir")
    }
  }

  const handleReply = (msg: Message) => {
    setReplyingTo(msg)
    inputRef.current?.focus()
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copiado para a área de transferência")
  }

  const handleDelete = async (messageId: number) => {
    try {
        await api.delete(`/api/messenger/messages/${messageId}/`)
        // Optimistic update handled by WebSocket listener in useChat
        toast.success("Mensagem excluída")
    } catch (error) {
        toast.error("Erro ao excluir mensagem")
    }
  }

  if (isLoadingConv) {
    return (
      <div className="flex flex-col h-full bg-background/30 backdrop-blur-sm">
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-background/50">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("flex gap-3 max-w-[80%]", i % 2 === 0 ? "ml-auto flex-row-reverse" : "")}>
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className={cn("h-12 w-64 rounded-2xl", i % 2 === 0 ? "rounded-tr-none" : "rounded-tl-none")} />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div 
      className="flex flex-col h-full bg-background relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-primary m-4 rounded-xl animate-in fade-in duration-200">
           <div className="flex flex-col items-center gap-4 text-primary">
             <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-bounce">
                <Download className="h-10 w-10" />
             </div>
             <p className="text-xl font-bold">Solte o arquivo para enviar</p>
           </div>
        </div>
      )}
      {/* Header */}
      <div className="h-16 border-b flex items-center px-4 justify-between bg-background/50 backdrop-blur-md shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden -ml-2 h-8 w-8"
              onClick={onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
            <AvatarImage src={contact.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {contact.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h3 className="font-semibold text-sm leading-none">{contact.username}</h3>
            {contact.is_online ? (
               <span className="text-[10px] text-green-500 font-medium mt-1 flex items-center gap-1">
                 <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                 Online
               </span>
            ) : (
               <span className="text-[10px] text-muted-foreground mt-1">
                  {contact.last_seen ? `Visto por último: ${new Date(contact.last_seen).toLocaleString()}` : 'Offline'}
               </span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
                <MoreVertical className="h-5 w-5" />
            </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 overflow-x-hidden">
        <div className="space-y-6 max-w-4xl mx-auto pb-4">

          {hasNextPage && (
            <div className="flex justify-center py-2">
               <Button 
                 variant="ghost" 
                 size="sm" 
                 onClick={() => fetchNextPage()} 
                 disabled={isFetchingNextPage}
                 className="text-xs text-muted-foreground"
               >
                 {isFetchingNextPage ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                 Carregar mensagens anteriores
               </Button>
            </div>
          )}

          {/* Invisible anchor for scrolling to top when fetching previous messages */}
          <div ref={topRef} className="h-1" />

          {messages.map((msg, index) => {
            const isMe = msg.sender === currentUser?.id
            const isImage = msg.file_type?.startsWith('image/')
            const showAvatar = !isMe && (index === 0 || messages[index - 1].sender !== msg.sender)
            
            // Date Separator Logic
            const showDateSeparator = index === 0 || 
              new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();
            
            const dateLabel = (() => {
                const date = new Date(msg.created_at);
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                if (date.toDateString() === today.toDateString()) return "Hoje";
                if (date.toDateString() === yesterday.toDateString()) return "Ontem";
                return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
            })();

            return (
              <React.Fragment key={msg.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-4 sticky top-2 z-10">
                    <span className="text-[10px] font-bold text-muted-foreground/80 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full border shadow-sm">
                      {dateLabel}
                    </span>
                  </div>
                )}
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
                  "flex gap-3 w-full group",
                  isMe ? "justify-end" : "justify-start"
                )}
              >
                {!isMe && (
                   <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                      {showAvatar ? (
                        <Avatar className="h-8 w-8 border border-border/50 shadow-sm">
                            <AvatarImage src={contact.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-bold">
                                {contact.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                      ) : <div className="w-8" />}
                   </div>
                )}
                
                {/* Reply Action (Left for Me) */}
                {isMe && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center px-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground"
                            onClick={() => handleReply(msg)}
                        >
                            <Reply className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                <div className={cn("flex flex-col gap-1 max-w-[75%]", isMe ? "items-end" : "items-start")}>
                    
                    <div
                      id={`msg-${msg.id}`}
                      className={cn(
                        "relative flex flex-col gap-2 rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-none shadow-primary/20"
                          : "bg-card border border-border/50 text-foreground rounded-bl-none shadow-sm"
                      )}
                    >
                      {/* Reply Context (Inside Bubble) */}
                      {msg.reply_to && (
                          <div 
                            className={cn(
                              "mb-2 text-xs px-3 py-2 rounded-lg border-l-4 cursor-pointer opacity-90 transition-opacity hover:opacity-100",
                              isMe 
                                ? "bg-black/10 border-l-primary-foreground/70 text-primary-foreground/90" 
                                : "bg-muted border-l-primary/70 text-muted-foreground"
                            )}
                            onClick={() => {
                              const el = document.getElementById(`msg-${msg.reply_to?.id}`);
                              if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  el.classList.add('bg-primary/5', 'transition-colors', 'duration-1000');
                                  setTimeout(() => el.classList.remove('bg-primary/5'), 2000);
                              } else {
                                  toast.info("Mensagem original não está visível no histórico carregado.");
                              }
                            }}
                          >
                             <p className="font-bold mb-0.5 text-[10px] opacity-80">
                                {msg.reply_to.sender === currentUser?.id ? 'Você' : msg.reply_to.sender_username}
                             </p>
                             <p className="truncate line-clamp-1">
                                {msg.reply_to.content || (msg.reply_to.file_name ? 'Anexo' : 'Mensagem')}
                             </p>
                          </div>
                      )}

                      {/* Image Attachment */}
                      {isImage && msg.file_url && (
                        <div className="mb-2 overflow-hidden rounded-xl border border-border/20 bg-black/5">
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
                          isMe ? "bg-primary-foreground/10 border-primary-foreground/20" : "bg-muted/50 border-border/50"
                        )}>
                          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm", isMe ? "bg-primary-foreground/20" : "bg-background")}>
                            <FileIcon className={cn("h-5 w-5", isMe ? "text-primary-foreground" : "text-primary")} />
                          </div>
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="font-bold truncate text-xs">{msg.file_name}</p>
                            <p className="text-[10px] opacity-70 font-mono">
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
                              "p-2 rounded-full transition-colors",
                              isMe ? "hover:bg-primary-foreground/20 text-primary-foreground" : "hover:bg-muted text-foreground"
                            )}
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      )}

                      {msg.content && <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>}

                      <div className="flex items-center justify-between gap-4 mt-0.5 min-w-[60px]">
                        <span className={cn(
                          "text-[10px] font-medium opacity-60 tabular-nums",
                          isMe ? "text-primary-foreground" : "text-muted-foreground"
                        )}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <div className="flex items-center gap-1">
                             {/* Message Actions Menu */}
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn(
                                            "h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100",
                                            isMe ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/20" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <MoreVertical className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isMe ? "end" : "start"}>
                                    <DropdownMenuItem onClick={() => handleReply(msg)}>
                                        <Reply className="mr-2 h-4 w-4" />
                                        Responder
                                    </DropdownMenuItem>
                                    {msg.content && (
                                        <DropdownMenuItem onClick={() => handleCopy(msg.content)}>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copiar
                                        </DropdownMenuItem>
                                    )}
                                    {isMe && (
                                        <DropdownMenuItem onClick={() => handleDelete(msg.id)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Excluir
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                             </DropdownMenu>

                            {isMe && (
                              <div className="flex items-center -mr-1 scale-90">
                                {msg.is_read ? (
                                  <div className="flex -space-x-1">
                                    <Check className="h-3 w-3 text-sky-200" strokeWidth={3} />
                                    <Check className="h-3 w-3 text-sky-200" strokeWidth={3} />
                                  </div>
                                ) : (
                                  <Check className="h-3 w-3 text-primary-foreground/50" />
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                        <div className={cn("flex gap-1 flex-wrap -mt-2 z-10 px-2", isMe ? "justify-end" : "justify-start")}>
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
                                  "text-[10px] px-1.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1 transition-all hover:scale-110",
                                  isReactedByMe ? "bg-primary/10 border-primary/20 text-primary" : "bg-background border-border hover:bg-muted"
                                )}
                              >
                                <span>{emoji}</span>
                                <span className="font-bold">{reactions.length}</span>
                              </button>
                            )
                          })}
                        </div>
                    )}
                </div>

                {/* Reply Action (Right for Others) */}
                {!isMe && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center px-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground"
                            onClick={() => handleReply(msg)}
                        >
                            <Reply className="h-4 w-4" />
                        </Button>
                    </div>
                )}
              </div>
              </React.Fragment>
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
          
          {/* Editing Preview */}
          {editingMessage && (
            <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl border border-l-4 border-l-primary animate-in slide-in-from-bottom-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary mb-0.5">
                   Editando mensagem
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {editingMessage.content}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-background/80"
                onClick={cancelEdit}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Reply Preview */}
          {replyingTo && !editingMessage && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-l-4 border-l-primary animate-in slide-in-from-bottom-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary mb-0.5">
                   Respondendo a {replyingTo.sender === currentUser?.id ? 'Você' : replyingTo.sender_username || 'Usuário'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {replyingTo.content || (replyingTo.file_url ? 'Anexo de arquivo' : 'Mensagem')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-background/80"
                onClick={() => setReplyingTo(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

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
                ref={inputRef}
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (messageInput.trim() || selectedFile) {
                      handleSend(e as any)
                    }
                  }
                }}
                placeholder={editingMessage ? "Editar mensagem..." : "Escreva uma mensagem..."}
                className="border-none bg-transparent focus-visible:ring-0 min-h-[44px] py-2.5 pl-3 pr-20"
                autoFocus
              />
              <div className="absolute right-2 bottom-1.5 flex gap-1">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          <SmilePlus className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none" side="top" align="end">
                        <EmojiPicker onEmojiClick={handleEmojiClick} lazyLoadEmojis={true} theme={Theme.AUTO} />
                    </PopoverContent>
                </Popover>

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
                  disabled={!!editingMessage}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {editingMessage ? (
                <div className="flex gap-2">
                     <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-xl"
                      onClick={cancelEdit}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                    <Button
                      type="submit"
                      size="icon"
                      className="h-11 w-11 rounded-xl shadow-lg shadow-primary/20 shrink-0"
                      disabled={editMessageMutation.isPending || !messageInput.trim()}
                    >
                      {editMessageMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Check className="h-5 w-5" />
                      )}
                    </Button>
                </div>
            ) : (
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
            )}
          </form>
        </div>
      </div>
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={images}
      />
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { ContactList } from "./contact-list"
import { ChatWindow } from "./chat-window"
import { Contact } from "@/types"
import { Message } from "@/types/messenger"
import { MessageSquareDashed, Loader2, SlidersHorizontal } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/hooks/use-auth"

export function MessengerView() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [debounced, setDebounced] = useState("")
  const [filter, setFilter] = useState<"all" | "media" | "files">("all")
  const [userFilter, setUserFilter] = useState("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [hasAttachments, setHasAttachments] = useState(false)
  const [fileKind, setFileKind] = useState<"any" | "image" | "video" | "audio" | "pdf" | "doc" | "xls" | "ppt" | "zip">("any")
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [onlyWithReactions, setOnlyWithReactions] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const conversationId = searchParams.get("conversation")
  const messageIdParam = searchParams.get("message_id") || searchParams.get("message") || searchParams.get("mid")
  const createdAtParam = searchParams.get("created_at") || searchParams.get("ts")

  const { user: currentUser, isLoading } = useAuth()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchTerm.trim()), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    try {
      if (messageIdParam) {
        localStorage.setItem('focusMessageId', String(messageIdParam))
      }
      if (createdAtParam) {
        localStorage.setItem('focusMessageCreatedAt', createdAtParam)
      }
    } catch { }
  }, [messageIdParam, createdAtParam])

  const searchQuery = useQuery<Message[]>({
    queryKey: ['global-message-search', debounced, filter],
    queryFn: async () => {
      const res = await api.get<Message[]>(`/api/messenger/conversations/search/?q=${encodeURIComponent(debounced)}`)
      return res.data
    },
    enabled: !!currentUser && debounced.length >= 3
  })

  const filteredResults = (Array.isArray(searchQuery.data) ? searchQuery.data : []).filter((m) => {
    if (filter === "media") return !!m.file_url && !!m.file_type && m.file_type.startsWith("image/")
    if (filter === "files") return !!m.file_url && (!m.file_type || !m.file_type.startsWith("image/"))
    if (hasAttachments) return !!m.file_url
    return true
  })

  const advancedFilteredResults = filteredResults.filter((m) => {
    const byKind = (() => {
      if (fileKind === "any") return true
      const type = (m.file_type || "").toLowerCase()
      const name = (m.file_name || "").toLowerCase()
      if (fileKind === "image") return !!m.file_url && type.startsWith("image/")
      if (fileKind === "video") return !!m.file_url && type.startsWith("video/")
      if (fileKind === "audio") return !!m.file_url && type.startsWith("audio/")
      if (fileKind === "pdf") return !!m.file_url && (type === "application/pdf" || name.endsWith(".pdf"))
      if (fileKind === "doc") return !!m.file_url && (name.endsWith(".doc") || name.endsWith(".docx"))
      if (fileKind === "xls") return !!m.file_url && (name.endsWith(".xls") || name.endsWith(".xlsx") || type.includes("sheet"))
      if (fileKind === "ppt") return !!m.file_url && (name.endsWith(".ppt") || name.endsWith(".pptx"))
      if (fileKind === "zip") return !!m.file_url && (name.endsWith(".zip") || type === "application/zip")
      return true
    })()

    // We can't easily get sender_username unless augmented. 
    // Usually it is sender_username in the Message interface from types/messenger.ts 
    const sender = m.sender_username || ""
    const byUser = userFilter.trim().length === 0
      ? true
      : sender.toLowerCase().includes(userFilter.trim().toLowerCase())

    const ts = new Date(m.created_at).getTime()
    const byFrom = dateFrom ? ts >= new Date(dateFrom).getTime() : true
    const byTo = dateTo ? ts <= new Date(dateTo).getTime() : true
    const byUnread = onlyUnread ? !m.is_read : true
    const byReactions = onlyWithReactions ? (m.reactions && m.reactions.length > 0) : true

    return byKind && byUser && byFrom && byTo && byUnread && byReactions
  })

  const openMessage = async (msg: Message) => {
    try {
      const res = await api.get(`/api/messenger/conversations/${msg.conversation}/`)
      const conv = res.data

      if (!currentUser) return

      const participantIds: number[] = Array.isArray(conv.participants) ? conv.participants : []
      const otherId = participantIds.find((id: number) => id !== currentUser.id)

      if (otherId !== undefined) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('focusMessageId', String(msg.id))
            localStorage.setItem('focusMessageCreatedAt', msg.created_at)
          } catch { }
        }

        const contactRes = await api.get(`/api/messenger/contacts/${otherId}/`)
        const contactData = contactRes.data
        setSelectedContact({
          id: contactData.id,
          username: contactData.username,
          email: contactData.email,
          avatar_url: contactData.avatar_url,
          is_online: contactData.is_online ?? false,
          group_names: contactData.group_names ?? [],
          is_staff: contactData.is_staff ?? false,
          last_seen: contactData.last_seen || null,
          status: contactData.status || 'offline',
          first_name: contactData.first_name || "",
          last_name: contactData.last_name || ""
        })

        setTimeout(() => {
          const el = document.getElementById(`msg-${msg.id}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 600)
      }
    } catch { }
  }

  useEffect(() => {
    if (!conversationId || !currentUser) return
    const fetchConversation = async () => {
      try {
        const res = await api.get(`/api/messenger/conversations/${conversationId}/`)
        const conversation = res.data

        let targetContact: Contact | null = null

        if (conversation.is_group) {
          targetContact = {
            id: -(conversation.id),
            username: conversation.title || "Grupo",
            email: "",
            avatar_url: null,
            is_online: true,
            group_names: [],
            is_staff: false,
            last_seen: null,
            status: 'online',
            first_name: "",
            last_name: ""
          }
        } else {
          const pList = conversation.participants || []
          const otherParticipant = pList.find((p: any) =>
            (typeof p === 'number' ? p !== currentUser.id : p.id !== currentUser.id)
          )

          if (otherParticipant) {
            const p = (typeof otherParticipant === 'number') ? null : otherParticipant
            targetContact = {
              id: p?.id || (typeof otherParticipant === 'number' ? otherParticipant : 0),
              username: p?.username || (conversation.participants_list?.[0] !== currentUser.username ? conversation.participants_list?.[0] : conversation.participants_list?.[1]) || "Contato",
              email: p?.email || "",
              avatar_url: p?.avatar_url || null,
              is_online: !!p?.is_online,
              group_names: p?.group_names || [],
              is_staff: !!p?.is_staff,
              last_seen: p?.last_seen || null,
              status: p?.status || (p?.is_online ? 'online' : 'offline'),
              first_name: p?.first_name || "",
              last_name: p?.last_name || ""
            }
          }
        }

        if (targetContact && (!selectedContact || selectedContact.id !== targetContact.id)) {
          setSelectedContact(targetContact)
        }
      } catch (error) {
        console.error("Failed to load conversation from URL", error)
      }
    }
    fetchConversation()
  }, [conversationId, currentUser, selectedContact])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center border border-border/50 rounded-2xl bg-background/50 backdrop-blur-sm shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex h-full items-center justify-center border border-border/50 rounded-2xl bg-background/50 backdrop-blur-sm shadow-sm">
        <div className="text-sm text-muted-foreground">Sessão expirada. Faça login novamente.</div>
      </div>
    )
  }

  return (
    <div className="flex h-full border border-border/50 rounded-2xl overflow-hidden bg-background/50 backdrop-blur-sm shadow-sm flex-col">
      <div className="w-full p-3 sticky top-0 z-10 bg-background/70 backdrop-blur-sm border-b">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar em mensagens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 h-10"
          />
          <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Filtros de busca">
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[90vw] sm:w-[420px]">
              <SheetHeader>
                <SheetTitle>Filtros de busca</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Tipo de resultado</label>
                  <div className="mt-2">
                    <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="media">Mídia</SelectItem>
                        <SelectItem value="files">Arquivos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="attachments"
                    checked={hasAttachments}
                    onCheckedChange={(v) => setHasAttachments(Boolean(v))}
                  />
                  <label htmlFor="attachments" className="text-sm">Somente com anexo</label>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Tipo de arquivo</label>
                  <div className="mt-2">
                    <Select value={fileKind} onValueChange={(v) => setFileKind(v as typeof fileKind)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de arquivo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Todos os tipos</SelectItem>
                        <SelectItem value="image">Imagem</SelectItem>
                        <SelectItem value="video">Vídeo</SelectItem>
                        <SelectItem value="audio">Áudio</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="doc">Word</SelectItem>
                        <SelectItem value="xls">Planilha</SelectItem>
                        <SelectItem value="ppt">Apresentação</SelectItem>
                        <SelectItem value="zip">ZIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="onlyUnread"
                    checked={onlyUnread}
                    onCheckedChange={(v) => setOnlyUnread(Boolean(v))}
                  />
                  <label htmlFor="onlyUnread" className="text-sm">Apenas não lidas</label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="onlyWithReactions"
                    checked={onlyWithReactions}
                    onCheckedChange={(v) => setOnlyWithReactions(Boolean(v))}
                  />
                  <label htmlFor="onlyWithReactions" className="text-sm">Com reação</label>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Usuário (remetente)</label>
                  <Input
                    placeholder="Nome de usuário"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">De</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Até</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Button className="w-full" onClick={() => setIsFiltersOpen(false)}>
                    Aplicar filtros
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {debounced.length >= 3 && (
          <div className="mt-2 max-h-64 overflow-auto border rounded-xl bg-background/90 backdrop-blur-sm">
            {searchQuery.isLoading && (
              <div className="p-4 text-sm text-muted-foreground">Buscando...</div>
            )}
            {!searchQuery.isLoading && advancedFilteredResults.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">Sem resultados</div>
            )}
            {advancedFilteredResults.slice(0, 20).map((m) => (
              <div key={`${m.conversation}-${m.id}`} className="p-3 border-b last:border-b-0 flex items-center gap-3 hover:bg-muted/50 cursor-pointer transition-colors" role="button" onClick={() => openMessage(m)}>
                <Badge variant="outline" className="text-[10px] px-2 truncate">#{m.conversation}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate font-medium">{m.content || m.file_name || 'Mensagem'}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
                </div>
                <Button size="sm" variant="outline">Abrir</Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1">
        <div className={cn(
          "w-full md:w-80 border-r border-border/50 bg-background/50 md:flex flex-col",
          selectedContact ? "hidden" : "flex"
        )}>
          <ContactList
            onSelectContact={(c, convId) => {
              setSelectedContact(c)
              router.push(`/messenger?conversation=${convId}`)
            }}
            selectedContactId={selectedContact?.id}
            currentUser={currentUser || null}
          />
        </div>

        <div className={cn(
          "flex-1 bg-background/30 flex flex-col min-w-0",
          !selectedContact ? "hidden md:flex" : "flex"
        )}>
          {selectedContact ? (
            <ChatWindow
              contact={selectedContact}
              currentUser={currentUser || null}
              onBack={() => setSelectedContact(null)}
              conversationId={conversationId ? Number(conversationId) : null}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground flex-col gap-4">
              <div className="p-6 bg-primary/5 rounded-full border border-primary/10">
                <MessageSquareDashed className="w-10 h-10 text-primary/40" />
              </div>
              <p className="font-medium">Selecione uma conversa para começar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

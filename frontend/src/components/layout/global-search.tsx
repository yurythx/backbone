"use client"

import * as React from "react"
import { Search, FileText, MessageSquare, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import {
    Dialog,
    DialogContent,
    DialogHeader,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

type SearchArticle = {
    id: number
    title: string
    excerpt?: string | null
}

type SearchMessage = {
    id: number
    sender_username: string
    content: string
    conversation: number | string
}

type SearchContact = {
    id: number
    username: string
    full_name?: string | null
    status?: string | null
}

type GlobalSearchResponse = {
    articles?: SearchArticle[]
    messages?: SearchMessage[]
    contacts?: SearchContact[]
}

export function GlobalSearch() {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const router = useRouter()

    // ── Shortcut: CMD+K ───────────────────────────────────────────────────
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const { data, isLoading } = useQuery<GlobalSearchResponse | null>({
        queryKey: ['global-search', query],
        queryFn: async () => {
            if (query.length < 2) return null
            const res = await api.get<GlobalSearchResponse>(`/api/core/search/?q=${encodeURIComponent(query)}`)
            return res.data || null
        },
        enabled: query.length >= 2,
        staleTime: 500
    })

    const onSelect = (type: "article" | "page" | "message" | "contact", id: number | string, item?: SearchMessage) => {
        setOpen(false)
        setQuery("")
        if (type === 'article') router.push(`/artigos?id=${id}`)
        if (type === 'page') router.push(`/cms?id=${id}`)
        if (type === 'message' && item) router.push(`/messenger?conversation=${item.conversation}&message_id=${id}`)
        if (type === 'contact') router.push(`/messenger?contact=${id}`)
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/30 hover:bg-muted/50 border rounded-xl transition-all w-48 lg:w-64"
                aria-label="Abrir busca global (Ctrl+K)"
            >
                <Search className="h-4 w-4" />
                <span>Busca global...</span>
                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden shadow-2xl border-none">
                    <DialogHeader className="p-4 border-b flex flex-row items-center gap-3">
                        <Search className="h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Pesquisar por artigos, páginas, mensagens..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="flex-1 border-none focus-visible:ring-0 text-base p-0 h-auto bg-transparent"
                            autoFocus
                        />
                    </DialogHeader>

                    <ScrollArea className="max-h-[400px]">
                        <div className="p-2">
                            {isLoading && query.length >= 2 && <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>}

                            {!isLoading && data && (
                                <div className="space-y-4 pb-2">
                                    {/* ARTIGOS */}
                                    {data.articles?.length > 0 && (
                                        <div>
                                            <h4 className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Artigos</h4>
                                            {data.articles.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => onSelect('article', item.id)}
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/60 flex items-center gap-3 transition-colors group"
                                                >
                                                    <div className="h-8 w-8 rounded bg-orange-500/10 flex items-center justify-center shrink-0">
                                                        <FileText className="h-4 w-4 text-orange-500" />
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="text-sm font-medium truncate">{item.title}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{item.excerpt || 'Ver conteúdo completo'}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* MENSAGENS */}
                                    {data.messages?.length > 0 && (
                                        <div>
                                            <h4 className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conversas</h4>
                                            {data.messages.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => onSelect('message', item.id, item)}
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/60 flex items-center gap-3 transition-colors group"
                                                >
                                                    <div className="h-8 w-8 rounded bg-blue-500/10 flex items-center justify-center shrink-0">
                                                        <MessageSquare className="h-4 w-4 text-blue-500" />
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="text-sm font-medium truncate">{item.sender_username}</p>
                                                        <p className="text-xs text-muted-foreground truncate italic">“{item.content}”</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* CONTATOS */}
                                    {data.contacts?.length > 0 && (
                                        <div>
                                            <h4 className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contatos</h4>
                                            {data.contacts.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => onSelect('contact', item.id)}
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/60 flex items-center gap-3 transition-colors group"
                                                >
                                                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                        <User className="h-4 w-4 text-emerald-500" />
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="text-sm font-medium truncate">{item.full_name || item.username}</p>
                                                        <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase">{item.status || ""}</Badge>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {query.length >= 2 && data.articles?.length === 0 && data.messages?.length === 0 && data.contacts?.length === 0 && (
                                        <div className="p-8 text-center text-sm text-muted-foreground">Nenhum resultado encontrado para “{query}”</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    )
}

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Contact } from "@/types"
import { api } from "@/lib/axios"
import { useQuery } from "@tanstack/react-query"
import { usePresence } from "@/hooks/use-presence"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

export function ContactList({
  onSelectContact,
  selectedContactId
}: {
  onSelectContact: (contact: Contact) => void
  selectedContactId?: number
}) {
  const { onlineUsers } = usePresence()
  const [search, setSearch] = React.useState("")

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await api.get<Contact[]>('/api/messenger/contacts/')
      return res.data
    }
  })

  // Merge API data with Real-time Presence and Group them
  const groupedContacts = React.useMemo(() => {
    const contactList = Array.isArray(contacts) ? contacts : (contacts as any)?.results || []
    const groups: Record<string, Contact[]> = {}

    contactList.forEach((c: Contact) => {
      const contact = {
        ...c,
        is_online: onlineUsers instanceof Set ? onlineUsers.has(c.id) : false
      }

      const userGroups = contact.group_names && contact.group_names.length > 0
        ? contact.group_names
        : ["Sem Grupo"]

      userGroups.forEach(group => {
        if (!groups[group]) groups[group] = []
        groups[group].push(contact)
      })
    })

    // Sort groups (optional: staff/admins first or alphabetical)
    return Object.keys(groups).sort().reduce((obj: any, key) => {
      obj[key] = groups[key].sort((a, b) => a.username.localeCompare(b.username))
      return obj
    }, {})
  }, [contacts, onlineUsers])

  if (isLoading) {
    return (
      <div className="flex flex-col h-full border-r bg-muted/10 w-80 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full border-r bg-muted/10 w-80">
      <div className="p-4 border-b bg-card">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          Mensagens
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium italic">Beta</span>
        </h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos..."
            className="pl-8 bg-muted/50 border-none focus-visible:ring-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-6">
          {Object.entries(groupedContacts).map(([groupName, groupUsers]: [string, any]) => {
            const filteredGroupUsers = groupUsers.filter((u: any) =>
              u.username.toLowerCase().includes(search.toLowerCase()) ||
              u.email.toLowerCase().includes(search.toLowerCase())
            )

            if (filteredGroupUsers.length === 0) return null

            return (
              <div key={groupName} className="space-y-1">
                <div className="px-3 py-1 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {groupName}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono">
                    {filteredGroupUsers.length}
                  </span>
                </div>
                {filteredGroupUsers.map((contact: Contact) => (
                  <button
                    key={`${groupName}-${contact.id}`}
                    onClick={() => onSelectContact(contact)}
                    className={cn(
                      "group w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all hover:bg-accent/50",
                      selectedContactId === contact.id && "bg-accent shadow-sm"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10 border-2 border-background">
                        <AvatarImage src={`https://avatar.vercel.sh/${contact.username}`} />
                        <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                          {contact.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {contact.is_online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {contact.username}
                        </span>
                        {contact.is_staff && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1 rounded font-black uppercase tracking-tighter">
                            Adm
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate opacity-70">
                        {contact.email}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          })}

          {Object.keys(groupedContacts).length === 0 && (
            <div className="p-8 text-center space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Nenhum contato disponível</div>
              <p className="text-xs text-muted-foreground/60">Contate o administrador para ser adicionado a um grupo.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

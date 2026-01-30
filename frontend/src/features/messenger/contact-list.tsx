import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Contact } from "@/types"
import { api } from "@/lib/axios"
import { useQuery } from "@tanstack/react-query"
import { usePresence } from "@/hooks/use-presence"
import { Search } from "lucide-react"
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

  // Merge API data with Real-time Presence
  const mergedContacts = React.useMemo(() => {
    // Backend may return direct array or paginated object { results: [] }
    const contactList = Array.isArray(contacts) ? contacts : (contacts as any)?.results || []

    return contactList.map((contact: Contact) => ({
      ...contact,
      is_online: onlineUsers instanceof Set ? onlineUsers.has(contact.id) : false
    }))
  }, [contacts, onlineUsers])

  const filteredContacts = mergedContacts.filter((c: any) =>
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading contacts...</div>
  }

  return (
    <div className="flex flex-col h-full border-r bg-muted/10 w-80">
      <div className="p-4 border-b">
        <h2 className="font-semibold mb-4">Contacts</h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-2">
          {filteredContacts.map((contact: any) => (
            <button
              key={contact.id}
              onClick={() => onSelectContact(contact)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-accent",
                selectedContactId === contact.id && "bg-accent"
              )}
            >
              <div className="relative">
                <Avatar>
                  <AvatarImage src={`https://avatar.vercel.sh/${contact.username}`} />
                  <AvatarFallback>{contact.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                {contact.is_online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-medium truncate">{contact.username}</div>
                <div className="text-xs text-muted-foreground truncate">{contact.email}</div>
              </div>
            </button>
          ))}
          {filteredContacts.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No contacts found.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

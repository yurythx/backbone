import { useState } from "react"
import { Contact } from "@/types"
import { Search, MessageSquare, Plus, Users, X, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { usePresence } from "@/hooks/use-presence"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ContactListProps {
  onSelectContact: (contact: Contact) => void;
  selectedContactId?: number;
}

export function ContactList({ onSelectContact, selectedContactId }: ContactListProps) {
  const [search, setSearch] = useState("")
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [selectedContactsForGroup, setSelectedContactsForGroup] = useState<number[]>([])
  
  const { onlineUsers } = usePresence()
  const queryClient = useQueryClient()

  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await api.get('/api/messenger/contacts/')
      if (Array.isArray(res.data)) {
        return res.data
      }
      if (res.data && Array.isArray((res.data as any).results)) {
        return (res.data as any).results
      }
      return []
    }
  })

  const createGroupMutation = useMutation({
    mutationFn: async () => {
        if (!groupName.trim()) throw new Error("Nome do grupo é obrigatório")
        if (selectedContactsForGroup.length === 0) throw new Error("Selecione pelo menos um participante")
        
        // This assumes backend supports a specific format or we iterate
        // Ideally backend should have a 'create_group' endpoint.
        // Falling back to standard conversation creation with 'is_group=true'
        // We need to send IDs.
        
        await api.post('/api/messenger/conversations/', {
            title: groupName,
            participants: selectedContactsForGroup,
            is_group: true
        })
    },
    onSuccess: () => {
        toast.success("Grupo criado com sucesso!")
        setIsGroupDialogOpen(false)
        setGroupName("")
        setSelectedContactsForGroup([])
        queryClient.invalidateQueries({ queryKey: ['contacts'] }) 
    },
    onError: (err) => {
        toast.error("Erro ao criar grupo. Tente novamente.")
    }
  })

  const contactList = Array.isArray(contacts) ? contacts : []

  const filteredContacts = contactList.filter(contact => {
    if (!contact) return false;
    const searchLower = search.toLowerCase();
    const username = contact.username ? contact.username.toLowerCase() : '';
    // Use username as fallback since Contact doesn't guarantee first_name/last_name
    const fullName = contact.username.toLowerCase();
    
    return username.includes(searchLower) || fullName.includes(searchLower);
  })

  const toggleContactSelection = (contactId: number) => {
      setSelectedContactsForGroup(prev => 
        prev.includes(contactId) 
            ? prev.filter(id => id !== contactId)
            : [...prev, contactId]
      )
  }

  if (isLoading) {
    return (
      <div className="w-full h-full border-r border-border/50 bg-muted/10 flex flex-col">
        <div className="p-4 border-b border-border/50 space-y-4">
          <Skeleton className="h-8 w-full rounded-md" />
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full border-r border-border/50 bg-muted/10 flex flex-col">
      <div className="p-4 border-b border-border/50 space-y-4 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
           <h2 className="font-bold text-lg tracking-tight">Mensagens</h2>
           
           <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
             <DialogTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8">
                     <Plus className="h-5 w-5" />
                 </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-[425px]">
                 <DialogHeader>
                     <DialogTitle>Criar Novo Grupo</DialogTitle>
                     <DialogDescription>
                         Dê um nome ao grupo e selecione os participantes.
                     </DialogDescription>
                 </DialogHeader>
                 <div className="grid gap-4 py-4">
                     <div className="grid gap-2">
                         <label htmlFor="name" className="text-sm font-medium">Nome do Grupo</label>
                         <Input 
                            id="name" 
                            value={groupName} 
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Ex: Projeto Backbone" 
                         />
                     </div>
                     <div className="grid gap-2">
                         <label className="text-sm font-medium">Participantes</label>
                         <ScrollArea className="h-[200px] border rounded-md p-2">
                             {contactList.map(contact => (
                                 <div key={contact.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md">
                                     <Checkbox 
                                        id={`contact-${contact.id}`} 
                                        checked={selectedContactsForGroup.includes(contact.id)}
                                        onCheckedChange={() => toggleContactSelection(contact.id)}
                                     />
                                     <label 
                                        htmlFor={`contact-${contact.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer w-full"
                                     >
                                         <Avatar className="h-6 w-6">
                                            <AvatarImage src={contact.avatar_url || undefined} />
                                            <AvatarFallback>{contact.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                         </Avatar>
                                         {contact.username}
                                     </label>
                                 </div>
                             ))}
                         </ScrollArea>
                     </div>
                 </div>
                 <DialogFooter>
                     <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>Cancelar</Button>
                     <Button onClick={() => createGroupMutation.mutate()} disabled={createGroupMutation.isPending}>
                         {createGroupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         Criar Grupo
                     </Button>
                 </DialogFooter>
             </DialogContent>
           </Dialog>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar contatos..." 
            className="pl-9 bg-background/50 border-border/50 focus:bg-background transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="flex flex-col p-2 gap-1">
          {filteredContacts?.map((contact) => {
            const isOnline = onlineUsers.has(contact.id)
            return (
              <Button
                key={contact.id}
                variant={selectedContactId === contact.id ? "secondary" : "ghost"}
                className={cn(
                  "justify-start h-auto py-3 px-3 relative group transition-all",
                  selectedContactId === contact.id ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50"
                )}
                onClick={() => onSelectContact(contact)}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                    <AvatarImage src={contact.avatar_url || undefined} />
                    <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                      {contact.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background shadow-sm animate-in zoom-in duration-300" />
                  )}
                </div>
                
                <div className="flex flex-col items-start ml-3 flex-1 min-w-0">
                  <div className="flex justify-between items-center w-full">
                    <span className="font-semibold text-sm truncate">
                      {contact.username}
                    </span>
                    {/* Placeholder for last message time */}
                    {/* <span className="text-[10px] text-muted-foreground">12:30</span> */}
                  </div>
                  <span className="text-xs text-muted-foreground truncate w-full text-left">
                    {isOnline ? (
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        Online
                      </span>
                    ) : (
                      "Clique para iniciar conversa"
                    )}
                  </span>
                </div>
              </Button>
            )
          })}
          
          {filteredContacts?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhum contato encontrado
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

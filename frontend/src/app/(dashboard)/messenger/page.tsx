"use client"

import { useState, useEffect } from "react"
import { ContactList } from "@/features/messenger/contact-list"
import { ChatWindow } from "@/features/messenger/chat-window"
import { Contact, User } from "@/types"
import { MessageSquareDashed, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

export default function MessengerPage() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("conversation")

  const { data: currentUser, isLoading } = useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/api/accounts/users/me/')
      return res.data
    }
  })

  // Se houver um ID de conversa na URL, tente carregar a conversa e definir o contato
  useEffect(() => {
    if (conversationId && !selectedContact) {
      const fetchConversation = async () => {
        try {
          const res = await api.get(`/api/messenger/conversations/${conversationId}/`)
          const conversation = res.data
          // Encontrar o outro participante (não o currentUser)
          // Nota: Precisamos do currentUser carregado para isso
          if (currentUser) {
             const otherParticipant = conversation.participants.find((p: any) => p.id !== currentUser.id)
             if (otherParticipant) {
                 // Converter para o tipo Contact esperado
                 setSelectedContact({
                     id: otherParticipant.id,
                     username: otherParticipant.username,
                     email: otherParticipant.email,
                     avatar_url: otherParticipant.avatar,
                     is_online: false, // Info de online viria de outro lugar
                     group_names: [], // Adicionando propriedade obrigatória
                     is_staff: false  // Adicionando propriedade obrigatória
                 })
             }
          }
        } catch (error) {
          console.error("Failed to load conversation from URL", error)
        }
      }
      
      if (currentUser) {
        fetchConversation()
      }
    }
  }, [conversationId, currentUser, selectedContact])

  if (isLoading) {
      return (
          <div className="flex h-[calc(100vh-theme(spacing.32))] items-center justify-center border border-border/50 rounded-2xl bg-background/50 backdrop-blur-sm shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.32))] border border-border/50 rounded-2xl overflow-hidden bg-background/50 backdrop-blur-sm shadow-sm relative">
      <div className={cn(
        "w-full md:w-80 border-r border-border/50 bg-background/50 md:flex flex-col",
        selectedContact ? "hidden" : "flex"
      )}>
        <ContactList 
          onSelectContact={setSelectedContact} 
          selectedContactId={selectedContact?.id}
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
  )
}

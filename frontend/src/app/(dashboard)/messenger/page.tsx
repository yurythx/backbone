"use client"

import { useState, useEffect } from "react"
import { ContactList } from "@/features/messenger/contact-list"
import { ChatWindow } from "@/features/messenger/chat-window"
import { Contact, User } from "@/types"
import { jwtDecode } from "jwt-decode" // We need to install this

export default function MessengerPage() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: any = jwtDecode(token)
        // JWT usually contains user_id. We might need to fetch full user profile if not in token.
        // Assuming 'user_id' is in token payload as 'user_id' or 'sub'
        setCurrentUser({ 
          id: decoded.user_id, 
          username: decoded.username || "Me", // Fallback
          email: "",
          groups: []
        })
      } catch (e) {
        console.error("Invalid token", e)
      }
    }
  }, [])

  return (
    <div className="flex h-[calc(100vh-theme(spacing.28))] border rounded-xl overflow-hidden bg-background shadow-sm">
      <ContactList 
        onSelectContact={setSelectedContact} 
        selectedContactId={selectedContact?.id}
      />
      
      <div className="flex-1">
        {selectedContact ? (
          <ChatWindow 
            contact={selectedContact} 
            currentUser={currentUser} 
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground flex-col gap-4">
            <div className="p-4 bg-muted rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p>Select a contact to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}

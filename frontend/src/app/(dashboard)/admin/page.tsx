"use client"

import { useState } from "react"
import { UserList } from "@/features/admin/user-list"
import { UserForm } from "@/features/admin/user-form"
import { User } from "@/types"

export default function AdminPage() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const handleCreate = () => {
    setSelectedUser(null)
    setView('create')
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setView('edit')
  }

  const handleSuccess = () => {
    setView('list')
    setSelectedUser(null)
  }

  const handleCancel = () => {
    setView('list')
    setSelectedUser(null)
  }

  return (
    <div className="h-full">
      {view === 'list' && (
        <UserList onCreate={handleCreate} onEdit={handleEdit} />
      )}
      {(view === 'create' || view === 'edit') && (
        <UserForm 
          initialData={selectedUser} 
          onSuccess={handleSuccess} 
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

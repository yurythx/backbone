"use client"

import { useState } from "react"
import { PageList } from "@/features/pages/page-list"
import { PageForm } from "@/features/pages/page-form"
import { Page } from "@/types"

export default function CMSPage() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)

  const handleCreate = () => {
    setSelectedPage(null)
    setView('create')
  }

  const handleEdit = (page: Page) => {
    setSelectedPage(page)
    setView('edit')
  }

  const handleSuccess = () => {
    setView('list')
    setSelectedPage(null)
  }

  const handleCancel = () => {
    setView('list')
    setSelectedPage(null)
  }

  return (
    <div className="h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Páginas</h1>
        <p className="text-muted-foreground">Gerencie o conteúdo institucional e páginas estáticas do seu portal.</p>
      </div>

      {view === 'list' && (
        <PageList onCreate={handleCreate} onEdit={handleEdit} />
      )}
      {(view === 'create' || view === 'edit') && (
        <PageForm
          initialData={selectedPage}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

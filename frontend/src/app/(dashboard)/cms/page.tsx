"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { PageList } from "@/features/pages/page-list"
import { PageForm } from "@/features/pages/page-form"
import { ModuleGuard } from "@/components/module-guard"
import { Page } from "@/types"

function CMSPageContent() {
  const searchParams = useSearchParams()
  const initialView = searchParams.get('action') === 'create' ? 'create' : 'list'
  const [view, setView] = useState<'list' | 'create' | 'edit'>(initialView)
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)

  // Estado inicial já deriva de searchParams; sem sincronização via efeito

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

export default function CMSPage() {
  return (
    <ModuleGuard moduleCode="pages">
      <Suspense fallback={null}>
        <CMSPageContent />
      </Suspense>
    </ModuleGuard>
  )
}

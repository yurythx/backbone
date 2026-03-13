"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Category } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, X, Save } from "lucide-react"
import { notify } from "@/lib/notifications"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function CategoryManager() {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategorySlug, setNewCategorySlug] = useState("")
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<Category[]>('/api/articles/categories/')
      return res.data
    }
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/articles/categories/', {
        name: newCategoryName,
        slug: newCategorySlug
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsCreating(false)
      setNewCategoryName("")
      setNewCategorySlug("")
      notify.success("Categoria criada", "A categoria já pode ser usada em artigos.")
    },
    onError: (error: unknown) => notify.error("Falha ao criar categoria", error)
  })

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      await api.delete(`/api/articles/categories/${slug}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      notify.success("Categoria removida")
    },
    onError: (error: unknown) => notify.error("Falha ao remover categoria", error)
  })

  if (isLoading) return <div role="status" aria-live="polite" aria-label="Carregando categorias">Carregando categorias...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Categorias</h3>
        <Button size="sm" onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "outline" : "default"}>
          {isCreating ? <X className="h-4 w-4 mr-2" aria-hidden="true" /> : <Plus className="h-4 w-4 mr-2" aria-hidden="true" />}
          {isCreating ? "Cancelar" : "Adicionar categoria"}
        </Button>
      </div>

      {isCreating && (
        <div className="flex gap-2 items-end border p-4 rounded-md bg-muted/50">
          <div className="grid gap-2 flex-1">
            <Label>Nome</Label>
            <Input 
              value={newCategoryName} 
              onChange={(e) => {
                  setNewCategoryName(e.target.value)
                  // Auto-slug
                  setNewCategorySlug(e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''))
              }} 
              placeholder="Notícias" 
            />
          </div>
          <div className="grid gap-2 flex-1">
            <Label>Slug</Label>
            <Input 
              value={newCategorySlug} 
              onChange={(e) => setNewCategorySlug(e.target.value)} 
              placeholder="noticias" 
            />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!newCategoryName || !newCategorySlug || createMutation.isPending}
            aria-label="Salvar categoria"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table aria-label="Tabela de categorias">
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories?.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell>{cat.name}</TableCell>
                <TableCell>{cat.slug}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive"
                    onClick={() => {
                        setCategoryToDelete(cat)
                    }}
                    aria-label={`Excluir categoria ${cat.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => { if (!open) setCategoryToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A categoria será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!categoryToDelete) return
                deleteMutation.mutate(categoryToDelete.slug)
                setCategoryToDelete(null)
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

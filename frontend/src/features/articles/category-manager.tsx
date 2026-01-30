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
import { toast } from "sonner"

export function CategoryManager() {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategorySlug, setNewCategorySlug] = useState("")

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
      toast.success("Category created")
    },
    onError: () => toast.error("Failed to create category")
  })

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      await api.delete(`/api/articles/categories/${slug}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success("Category deleted")
    },
    onError: () => toast.error("Failed to delete category")
  })

  if (isLoading) return <div>Loading categories...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Categories</h3>
        <Button size="sm" onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "outline" : "default"}>
          {isCreating ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {isCreating ? "Cancel" : "Add Category"}
        </Button>
      </div>

      {isCreating && (
        <div className="flex gap-2 items-end border p-4 rounded-md bg-muted/50">
          <div className="grid gap-2 flex-1">
            <Label>Name</Label>
            <Input 
              value={newCategoryName} 
              onChange={(e) => {
                  setNewCategoryName(e.target.value)
                  // Auto-slug
                  setNewCategorySlug(e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''))
              }} 
              placeholder="News" 
            />
          </div>
          <div className="grid gap-2 flex-1">
            <Label>Slug</Label>
            <Input 
              value={newCategorySlug} 
              onChange={(e) => setNewCategorySlug(e.target.value)} 
              placeholder="news" 
            />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!newCategoryName || !newCategorySlug}>
            <Save className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                        if(confirm("Delete category?")) deleteMutation.mutate(cat.slug)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

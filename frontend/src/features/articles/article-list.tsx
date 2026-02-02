"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Article, Category } from "@/types"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Eye, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, X } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ArticleListProps {
  onEdit: (article: Article) => void
  onCreate: () => void
}

export function ArticleList({ onEdit, onCreate }: ArticleListProps) {
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState("")
  const debouncedSearch = useDebounce(search, 500)
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles', debouncedSearch, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('title', debouncedSearch)
      if (selectedCategory !== 'all') params.append('category', selectedCategory)

      const res = await api.get<{ results?: Article[] } | Article[]>(`/api/articles/articles/?${params.toString()}`)
      return Array.isArray(res.data) ? res.data : res.data.results || []
    }
  })

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ results?: Category[] } | Category[]>('/api/articles/categories/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/articles/articles/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    }
  })

  const getCategoryName = (id: number | null) => {
    if (!id || !categories) return "-"
    return (categories as Category[]).find((c: Category) => c.id === id)?.name || "-"
  }

  const columns: ColumnDef<Article>[] = [
    {
      accessorKey: "title",
      header: "Title",
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => getCategoryName(row.original.category),
    },
    {
      accessorKey: "is_published",
      header: "Status",
      cell: ({ row }) => {
        const isPublished = row.original.is_published
        return (
          <Badge variant={isPublished ? "default" : "secondary"}>
            {isPublished ? "Published" : "Draft"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => format(new Date(row.original.created_at), 'PP'),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const article = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(article)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (confirm('Are you sure?')) deleteMutation.mutate(article.id)
                }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/30 p-4 rounded-2xl border border-primary/5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Conteúdo</h2>
          <p className="text-muted-foreground text-sm">Gerencie seus artigos e publicações.</p>
        </div>
        <Button onClick={onCreate} className="shadow-lg shadow-primary/20 rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> Novo Artigo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por título..."
            className="pl-10 h-11 rounded-xl bg-card border-none shadow-sm focus-visible:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Pesquisar por título"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="pl-10 h-11 rounded-xl bg-card border-none shadow-sm" aria-label="Filtrar por categoria">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-xl">
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {categories?.map((cat: Category) => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(search || selectedCategory !== 'all') && (
          <Button
            variant="ghost"
            onClick={() => { setSearch(""); setSelectedCategory("all"); }}
            className="h-11 rounded-xl gap-2 hover:bg-destructive/5 hover:text-destructive"
          >
            <X className="h-4 w-4" /> Limpar Filtros
          </Button>
        )}
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={articles || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}

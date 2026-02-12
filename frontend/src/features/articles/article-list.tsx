"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Article, Category } from "@/types"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Eye, MoreHorizontal, Calendar, Clock, Image as ImageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { VisibilityBadge } from "@/components/articles/visibility-badge"

interface ArticleListProps {
  onEdit: (article: Article) => void
  onCreate: () => void
}

export function ArticleList({ onEdit, onCreate }: ArticleListProps) {
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState("")
  const debouncedSearch = useDebounce(search, 500)
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")

  const { data: articles, isLoading, refetch } = useQuery({
    queryKey: ['articles', debouncedSearch, selectedCategory],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('title', debouncedSearch)
      if (selectedCategory !== 'all') params.append('category', selectedCategory)

      const res = await api.get<{ results?: Article[] } | Article[]>('/api/articles/articles/', { params, signal })
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
    if (!id || !categories) return "Geral"
    return (categories as Category[]).find((c: Category) => c.id === id)?.name || "Geral"
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/30 p-6 rounded-3xl border border-primary/5 shadow-sm backdrop-blur-sm">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Blog & Artigos</h2>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas publicações e notícias.</p>
        </div>
        <Button onClick={onCreate} size="lg" className="shadow-lg shadow-primary/20 rounded-2xl px-6 font-semibold transition-all hover:scale-105">
          <Plus className="mr-2 h-5 w-5" /> Novo Artigo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sticky top-4 z-10 bg-background/80 backdrop-blur-md p-4 rounded-2xl border shadow-sm">
        <div className="md:col-span-2 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Pesquisar por título..."
            className="pl-11 h-12 rounded-xl bg-card border-muted hover:border-primary/30 focus-visible:ring-primary/20 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="pl-4 h-12 rounded-xl bg-card border-muted hover:border-primary/30 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Categoria" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border shadow-xl p-1">
              <SelectItem value="all" className="rounded-lg cursor-pointer">Todas as Categorias</SelectItem>
              {categories?.map((cat: Category) => (
                <SelectItem key={cat.id} value={String(cat.id)} className="rounded-lg cursor-pointer">{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(search || selectedCategory !== 'all') && (
          <Button
            variant="ghost"
            onClick={() => { setSearch(""); setSelectedCategory("all"); }}
            className="h-12 rounded-xl gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" /> Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Skeletons
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[400px] rounded-3xl bg-muted/20 animate-pulse" />
          ))
        ) : articles?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center space-y-4 bg-muted/10 rounded-3xl border border-dashed">
            <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Nenhum artigo encontrado</h3>
              <p className="text-muted-foreground">Tente ajustar seus filtros ou crie um novo artigo.</p>
            </div>
          </div>
        ) : (
          articles?.map((article) => (
            <div
              key={article.id}
              className="group flex flex-col bg-card border rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative"
            >
              {/* Image Cover */}
              <div className="relative aspect-video overflow-hidden bg-muted">
                {article.cover_image || article.image ? (
                  <img
                    src={(article.cover_image || article.image) ?? undefined}
                    alt={article.title}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full w-full bg-gradient-to-br from-primary/5 to-primary/10">
                    <ImageIcon className="h-12 w-12 text-primary/20" />
                  </div>
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  <VisibilityBadge isPublic={(article as any).is_public || false} />
                  <Badge variant={article.is_published ? "default" : "secondary"} className="shadow-lg backdrop-blur-md">
                    {article.is_published ? "Publicado" : "Rascunho"}
                  </Badge>
                </div>
                {/* Quick Actions Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full h-10 w-10 shadow-lg hover:scale-110 transition-transform"
                    onClick={() => onEdit(article)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="rounded-full h-10 w-10 shadow-lg hover:scale-110 transition-transform"
                    onClick={() => { if (confirm('Tem certeza?')) deleteMutation.mutate(article.id) }}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {article.is_published && (
                    <Link href={`/p/artigos/${article.slug}`} target="_blank">
                      <Button
                        size="icon"
                        className="rounded-full h-10 w-10 shadow-lg hover:scale-110 transition-transform bg-white text-black hover:bg-gray-100"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                      {/* Handle both object (from backend) and ID (if serialized differently) */}
                      {typeof article.category === 'object' && article.category !== null
                        ? (article.category as any).name
                        : getCategoryName(Number(article.category))}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {article.created_at ? format(new Date(article.created_at), "d 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {article.excerpt || "Sem descrição..."}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {/* Placeholder Author Avatar */}
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      A
                    </div>
                    <span>Admin</span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> 5 min
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Category, Tag } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Hash, FolderTree, Loader2 } from "lucide-react"
import { notify } from "@/lib/notifications"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function TagList() {
    const queryClient = useQueryClient()
    const [newTagName, setNewTagName] = React.useState("")
    const [newCategoryName, setNewCategoryName] = React.useState("")

    const { data: tags, isLoading: isLoadingTags } = useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            const res = await api.get<any>('/api/articles/tags/')
            return res.data
        }
    })

    const { data: categories, isLoading: isLoadingCategories } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get<any>('/api/articles/categories/')
            return res.data
        }
    })

    const createTagMutation = useMutation({
        mutationFn: async (name: string) => {
            const slug = name.toLowerCase().replace(/\s+/g, '-')
            return api.post('/api/articles/tags/', { name, slug })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] })
            setNewTagName("")
            notify.success("Tag criada", "A nova tag já pode ser usada em artigos.")
        },
        onError: (err) => notify.error("Erro ao criar tag", err)
    })

    const deleteTagMutation = useMutation({
        mutationFn: (slug: string) => api.delete(`/api/articles/tags/${slug}/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] })
            notify.success("Tag removida")
        }
    })

    const createCategoryMutation = useMutation({
        mutationFn: async (name: string) => {
            const slug = name.toLowerCase().replace(/\s+/g, '-')
            return api.post('/api/articles/categories/', { name, slug })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            setNewCategoryName("")
            notify.success("Categoria criada")
        },
        onError: (err) => notify.error("Erro ao criar categoria", err)
    })

    const deleteCategoryMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/api/articles/categories/${id}/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            notify.success("Categoria removida")
        }
    })

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tags Section */}
            <Card className="border-none shadow-xl bg-card">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Hash className="h-5 w-5" />
                        </div>
                        <CardTitle>Tags</CardTitle>
                    </div>
                    <CardDescription>Palavras-chave para organizar seus artigos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Nova tag..."
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && newTagName && createTagMutation.mutate(newTagName)}
                            className="bg-background"
                        />
                        <Button
                            size="icon"
                            disabled={!newTagName || createTagMutation.isPending}
                            onClick={() => createTagMutation.mutate(newTagName)}
                        >
                            {createTagMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 min-h-[100px] p-4 rounded-xl bg-muted/30 border border-dashed">
                        {isLoadingTags ? (
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        ) : tags?.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center w-full py-8">Nenhuma tag cadastrada.</p>
                        ) : (
                            tags?.map((tag: Tag) => (
                                <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className="pl-3 pr-1 py-1 gap-1 group hover:bg-primary/10 transition-colors"
                                >
                                    {tag.name}
                                    <button
                                        onClick={() => deleteTagMutation.mutate(tag.slug)}
                                        className="ml-1 p-0.5 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Categories Section */}
            <Card className="border-none shadow-xl bg-card">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <FolderTree className="h-5 w-5" />
                        </div>
                        <CardTitle>Categorias</CardTitle>
                    </div>
                    <CardDescription>Estrutura principal do seu conteúdo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Nova categoria..."
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && newCategoryName && createCategoryMutation.mutate(newCategoryName)}
                            className="bg-background"
                        />
                        <Button
                            size="icon"
                            disabled={!newCategoryName || createCategoryMutation.isPending}
                            onClick={() => createCategoryMutation.mutate(newCategoryName)}
                        >
                            {createCategoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="space-y-2 min-h-[100px]">
                        {isLoadingCategories ? (
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        ) : categories?.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center w-full py-8 border border-dashed rounded-xl">Nenhuma categoria cadastrada.</p>
                        ) : (
                            categories?.map((cat: Category) => (
                                <div
                                    key={cat.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border hover:border-primary/30 transition-all group"
                                >
                                    <span className="font-medium">{cat.name}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => deleteCategoryMutation.mutate(cat.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

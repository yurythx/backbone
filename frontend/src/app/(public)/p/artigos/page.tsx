"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Article } from "@/types"
import { PublicArticleCard } from "@/components/public/article-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Search, BookOpen } from "lucide-react"
import { useState } from "react"

export default function PublicArtigosPage() {
    const [searchTerm, setSearchTerm] = useState("")

    const { data: articles, isLoading } = useQuery({
        queryKey: ['public-articles'],
        queryFn: async () => {
            // Usando o endpoint público que criamos
            const res = await api.get('/api/public/articles/')
            const data = res.data?.results ?? res.data
            return Array.isArray(data) ? data : []
        }
    })

    const filteredArticles = articles?.filter((article: Article) =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="container mx-auto px-6 py-12 space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4 text-center max-w-3xl mx-auto">
                    <div className="flex items-center justify-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Artigos e Novidades
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Fique por dentro das últimas novidades, tutoriais e conteúdos exclusivos.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar artigos..."
                            className="pl-12 h-14 rounded-2xl bg-background/50 backdrop-blur border-primary/10 focus-visible:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Articles Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="space-y-4">
                                <Skeleton className="aspect-video w-full rounded-2xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-5/6" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredArticles && filteredArticles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredArticles.map((article: Article) => (
                            <PublicArticleCard key={article.id} article={article} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/10">
                        <div className="h-16 w-16 rounded-full bg-muted/30 mx-auto mb-4 flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Nenhum artigo encontrado</h3>
                        <p className="text-muted-foreground">
                            {searchTerm
                                ? "Tente ajustar sua busca ou limpar o filtro"
                                : "Nenhum artigo público disponível no momento"}
                        </p>
                    </div>
                )}

                {/* Results Count */}
                {!isLoading && filteredArticles && filteredArticles.length > 0 && (
                    <div className="text-center text-sm text-muted-foreground">
                        Mostrando {filteredArticles.length} {filteredArticles.length === 1 ? 'artigo' : 'artigos'}
                        {searchTerm && ` com "${searchTerm}"`}
                    </div>
                )}
            </div>
        </div>
    )
}

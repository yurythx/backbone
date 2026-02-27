"use client"

import { useQuery } from "@tanstack/react-query"
import { Article } from "@/types"
import { PublicArticleCard } from "@/components/public/article-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Search, BookOpen } from "lucide-react"
import { useState, useMemo, useMemo as useReactMemo } from "react"
import axios from "axios"

export default function PublicArtigosPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005'
    const cleanAxios = useReactMemo(() => {
        return axios.create({
            baseURL: API_URL,
            headers: { 'Content-Type': 'application/json' }
        })
    }, [API_URL])

    const { data: articles, isLoading, error } = useQuery({
        queryKey: ['public-articles'],
        queryFn: async () => {
            try {
                const res = await cleanAxios.get('/api/articles/public/articles/')
                const data = res.data?.results ?? res.data
                return Array.isArray(data) ? data : []
            } catch (err: unknown) {
                if (typeof err === 'object' && err !== null) {
                    const e = err as { response?: { status?: number; data?: unknown }; request?: unknown; message?: string }
                    if (e.response) {
                        console.error("API Error Response:", e.response.status, e.response.data);
                    } else if (e.request) {
                        console.error("API Error Request (No Response):", e.request);
                    } else {
                        console.error("API Error Setup:", e.message);
                    }
                }
                throw err
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: 1,
    })

    // Memoize filtered results for performance
    const filteredArticles = useMemo(() => {
        if (!articles) return []
        if (!searchTerm.trim()) return articles

        const lowerSearch = searchTerm.toLowerCase()
        return articles.filter((article: Article) =>
            article.title.toLowerCase().includes(lowerSearch) ||
            article.excerpt?.toLowerCase().includes(lowerSearch) ||
            article.category_name?.toLowerCase().includes(lowerSearch)
        )
    }, [articles, searchTerm])

    return (
        <>
            <div className="py-8 sm:py-12 space-y-8 sm:space-y-12">
                {/* Header */}
                <header className="flex flex-col gap-4 text-center max-w-3xl mx-auto">
                    <div className="flex items-center justify-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
                        </div>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Artigos e Novidades
                    </h1>
                    <p className="text-muted-foreground text-base sm:text-lg">
                        Fique por dentro das últimas novidades, tutoriais e conteúdos exclusivos.
                    </p>
                </header>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto" role="search" aria-label="Pesquisar artigos">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" aria-hidden="true" />
                        <Input
                            type="search"
                            placeholder="Buscar artigos por título, resumo ou categoria..."
                            className="pl-12 h-12 sm:h-14 rounded-2xl bg-background/50 backdrop-blur border-primary/10 focus-visible:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Buscar artigos"
                        />
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="text-center py-12 border-2 border-destructive/20 rounded-3xl bg-destructive/5" role="alert" aria-live="assertive" aria-label="Erro ao carregar artigos">
                        <p className="text-destructive font-medium">
                            Erro ao carregar artigos. Tente novamente mais tarde.
                        </p>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" role="status" aria-live="polite" aria-label="Carregando artigos">
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
                )}

                {/* Articles Grid */}
                {!isLoading && !error && filteredArticles.length > 0 && (
                    <>
                        <div
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                            role="list"
                            aria-label={`${filteredArticles.length} artigos encontrados`}
                        >
                            {filteredArticles.map((article: Article) => (
                                <PublicArticleCard key={article.id} article={article} />
                            ))}
                        </div>

                        {/* Results Count */}
                        <div className="text-center text-sm text-muted-foreground" role="status" aria-live="polite">
                            Mostrando {filteredArticles.length} {filteredArticles.length === 1 ? 'artigo' : 'artigos'}
                            {searchTerm && ` com "${searchTerm}"`}
                        </div>
                    </>
                )}

                {/* Empty State */}
                {!isLoading && !error && filteredArticles.length === 0 && (
                    <div className="text-center py-16 sm:py-20 border-2 border-dashed rounded-3xl bg-muted/10">
                        <div className="h-16 w-16 rounded-full bg-muted/30 mx-auto mb-4 flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Nenhum artigo encontrado</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            {searchTerm
                                ? `Não encontramos artigos com "${searchTerm}". Tente ajustar sua busca ou limpar o filtro.`
                                : "Nenhum artigo público disponível no momento. Volte em breve!"}
                        </p>
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                className="mt-4 text-primary hover:underline font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
                                aria-label="Limpar busca"
                            >
                                Limpar busca
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}

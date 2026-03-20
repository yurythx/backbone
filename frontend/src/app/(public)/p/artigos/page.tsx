"use client"

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { Article } from "@/types"
import { PublicArticleCard } from "@/components/public/article-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Search, BookOpen, Filter, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { api } from "@/lib/axios"
import { useRouter, useSearchParams } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function PublicArtigosPage() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const envCompany = process.env.NEXT_PUBLIC_COMPANY_SLUG || null
    const companySlugFromQuery = (searchParams.get("company_slug") || "").trim() || null

    const [effectiveCompanySlug, setEffectiveCompanySlug] = useState<string | null>(() => {
        if (companySlugFromQuery) return companySlugFromQuery
        const saved = typeof window !== "undefined" ? localStorage.getItem("companySlug") : null
        return (saved || envCompany || null)
    })

    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') ?? "")
    const debouncedSearchTerm = useDebounce(searchTerm, 500)
    const [selectedCategory, setSelectedCategory] = useState<string>(() => searchParams.get('category') ?? "all")

    useEffect(() => {
        const s = searchParams.get('search') ?? ""
        const c = searchParams.get('category') ?? "all"
        const qCompany = (searchParams.get("company_slug") || "").trim() || null
        if (s !== searchTerm) setSearchTerm(s)
        if (c !== selectedCategory) setSelectedCategory(c)
        if (qCompany && qCompany !== effectiveCompanySlug) setEffectiveCompanySlug(qCompany)
    }, [searchParams, searchTerm, selectedCategory, effectiveCompanySlug])

    useEffect(() => {
        let active = true
        const resolveCompany = async () => {
            if (effectiveCompanySlug) return
            try {
                const res = await api.get<{ slug: string }[]>("/api/core/companies/public_list/")
                const list = Array.isArray(res.data) ? res.data : []
                const picked = list[0]?.slug
                if (!picked) return
                if (!active) return
                localStorage.setItem("companySlug", picked)
                setEffectiveCompanySlug(picked)
            } catch {
                // ignore
            }
        }
        resolveCompany()
        return () => {
            active = false
        }
    }, [effectiveCompanySlug])

    useEffect(() => {
        const params = new URLSearchParams()
        if (debouncedSearchTerm.trim()) params.set('search', debouncedSearchTerm.trim())
        if (selectedCategory && selectedCategory !== "all") params.set('category', selectedCategory)
        if (companySlugFromQuery) params.set('company_slug', companySlugFromQuery)
        const qs = params.toString()
        router.replace(qs ? `?${qs}` : '?', { scroll: false })
    }, [debouncedSearchTerm, selectedCategory, router, companySlugFromQuery])

    type PublicCategory = { id: number; name: string; slug: string }

    const { data: categories } = useQuery({
        queryKey: ['public-article-categories', effectiveCompanySlug],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams()
            if (effectiveCompanySlug) params.set("company_slug", effectiveCompanySlug)
            const res = await api.get<PublicCategory[]>('/api/articles/public/categories/', {
                signal,
                params,
                headers: effectiveCompanySlug ? { "X-Company-Slug": effectiveCompanySlug } : {},
            })
            const data = res.data
            return Array.isArray(data) ? data : []
        },
        staleTime: 10 * 60 * 1000,
        retry: 1,
        enabled: !!effectiveCompanySlug,
    })

    const {
        data,
        isLoading,
        error,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage,
    } = useInfiniteQuery({
        queryKey: ['public-articles', effectiveCompanySlug, debouncedSearchTerm, selectedCategory],
        queryFn: async ({ pageParam, signal }) => {
            const params = new URLSearchParams()
            if (debouncedSearchTerm.trim()) params.set('search', debouncedSearchTerm.trim())
            if (selectedCategory && selectedCategory !== "all") params.set('category', selectedCategory)
            if (pageParam) params.set('page', String(pageParam))
            if (effectiveCompanySlug) params.set("company_slug", effectiveCompanySlug)
            const res = await api.get('/api/articles/public/articles/', {
                params,
                signal,
                headers: effectiveCompanySlug ? { "X-Company-Slug": effectiveCompanySlug } : {},
            })
            return res.data
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const next = lastPage?.next
            if (!next) return undefined
            try {
                const u = new URL(next)
                const p = u.searchParams.get('page')
                return p ? Number(p) : undefined
            } catch {
                const m = /[?&]page=(\d+)/.exec(next)
                return m ? Number(m[1]) : undefined
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: 1,
        enabled: !!effectiveCompanySlug,
    })

    const articles: Article[] = useMemo(() => {
        const pages = data?.pages ?? []
        const out: Article[] = []
        for (const pg of pages as unknown[]) {
            if (Array.isArray(pg)) {
                out.push(...(pg as Article[]))
                continue
            }
            const p = pg as { results?: unknown }
            const results = p?.results
            if (Array.isArray(results)) out.push(...(results as Article[]))
        }
        return out
    }, [data])

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

                {!effectiveCompanySlug && (
                    <div className="text-center py-12 border-2 border-dashed rounded-3xl bg-muted/10" role="alert" aria-live="assertive">
                        <h3 className="text-lg font-semibold mb-2">Empresa não selecionada</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Selecione uma empresa para visualizar os artigos públicos.
                        </p>
                    </div>
                )}

                <div
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 sticky top-4 z-10 bg-background/80 backdrop-blur-md p-4 rounded-2xl border shadow-sm max-w-5xl mx-auto"
                    role="search"
                    aria-label="Pesquisar e filtrar artigos"
                >
                    <div className="md:col-span-2 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
                        <Input
                            type="search"
                            placeholder="Buscar por título, resumo ou categoria..."
                            className="pl-11 h-12 rounded-xl bg-card border-muted hover:border-primary/30 focus-visible:ring-primary/20 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Buscar artigos"
                            disabled={!effectiveCompanySlug}
                        />
                    </div>
                    <div className="relative">
                        <Select
                            value={selectedCategory}
                            onValueChange={setSelectedCategory}
                            disabled={!effectiveCompanySlug}
                        >
                            <SelectTrigger className="pl-4 h-12 rounded-xl bg-card border-muted hover:border-primary/30 shadow-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Filter className="h-4 w-4" aria-hidden="true" />
                                    <SelectValue placeholder="Categoria" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border shadow-xl p-1">
                                <SelectItem value="all" className="rounded-lg cursor-pointer">Todas as Categorias</SelectItem>
                                {(categories ?? []).map((cat) => (
                                    <SelectItem key={cat.id} value={String(cat.id)} className="rounded-lg cursor-pointer">
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {(searchTerm || selectedCategory !== "all") && (
                        <button
                            type="button"
                            onClick={() => { setSearchTerm(""); setSelectedCategory("all") }}
                            className="h-12 rounded-xl gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors inline-flex items-center justify-center border border-transparent"
                            disabled={!effectiveCompanySlug}
                        >
                            <X className="h-4 w-4" aria-hidden="true" /> Limpar
                        </button>
                    )}
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
                {!isLoading && !error && articles.length > 0 && (
                    <>
                        <div
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                            role="list"
                            aria-label={`${articles.length} artigos encontrados`}
                        >
                            {articles.map((article: Article) => (
                                <PublicArticleCard key={article.id} article={article} />
                            ))}
                        </div>

                        {/* Results Count */}
                        <div className="text-center text-sm text-muted-foreground" role="status" aria-live="polite">
                            Mostrando {articles.length} {articles.length === 1 ? 'artigo' : 'artigos'}
                            {debouncedSearchTerm.trim() && ` com "${debouncedSearchTerm.trim()}"`}
                            {selectedCategory !== "all" && ` na categoria selecionada`}
                        </div>

                        {hasNextPage && (
                            <div className="flex justify-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                    className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Empty State */}
                {!isLoading && !error && articles.length === 0 && (
                    <div className="text-center py-16 sm:py-20 border-2 border-dashed rounded-3xl bg-muted/10">
                        <div className="h-16 w-16 rounded-full bg-muted/30 mx-auto mb-4 flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Nenhum artigo encontrado</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            {debouncedSearchTerm.trim()
                                ? `Não encontramos artigos com "${debouncedSearchTerm.trim()}". Tente ajustar sua busca ou limpar o filtro.`
                                : "Nenhum artigo público disponível no momento. Volte em breve!"}
                        </p>
                        {(searchTerm || selectedCategory !== "all") && (
                            <button
                                type="button"
                                onClick={() => { setSearchTerm(""); setSelectedCategory("all") }}
                                className="mt-4 text-primary hover:underline font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
                                aria-label="Limpar busca"
                            >
                                Limpar filtros
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}

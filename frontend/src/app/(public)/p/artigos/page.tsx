"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Article } from "@/types"
import { PublicArticleCard } from "@/components/public/article-card"
import { Skeleton } from "@/components/ui/skeleton"
import { LayoutGrid, List } from "lucide-react"

export default function PublicArtigosPage() {
    const { data: articles, isLoading } = useQuery({
        queryKey: ['public-articles'],
        queryFn: async () => {
            // Usamos o endpoint público ou filtramos no cliente? 
            // Por enquanto, assumimos que o backend filtra por tenant e is_published
            const res = await api.get<Article[]>('/api/articles/articles/')
            return res.data.filter(a => a.is_published)
        }
    })

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                    Nossos Artigos
                </h1>
                <p className="text-muted-foreground text-lg">
                    Fique por dentro das últimas novidades e tutoriais.
                </p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="aspect-video w-full rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : articles && articles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articles.map((article) => (
                        <PublicArticleCard key={article.id} article={article} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 border rounded-xl bg-muted/10">
                    <p className="text-muted-foreground">Nenhum artigo publicado no momento.</p>
                </div>
            )}
        </div>
    )
}

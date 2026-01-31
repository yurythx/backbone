"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/axios"
import { Article } from "@/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CalendarDays, User } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Metadata } from 'next'

export async function generateMetadata(
    { params }: { params: { slug: string } }
): Promise<Metadata> {
    const { slug } = await params

    try {
        const res = await api.get<Article[]>(`/api/articles/articles/?slug=${slug}`)
        const article = res.data[0]

        if (!article) return { title: 'Artigo não encontrado' }

        return {
            title: article.meta_title || article.title,
            description: article.meta_description || article.excerpt,
            openGraph: {
                title: article.meta_title || article.title,
                description: article.meta_description || article.excerpt,
                images: article.image ? [article.image] : [],
            },
        }
    } catch (error) {
        return { title: 'Backbone Article' }
    }
}

export default function PublicArticleDetailPage() {
    const { slug } = useParams()
    const router = useRouter()

    const { data: article, isLoading } = useQuery({
        queryKey: ['public-article', slug],
        queryFn: async () => {
            // Precisamos de um endpoint que busque por slug ou filtramos na lista
            const res = await api.get<Article[]>(`/api/articles/articles/?slug=${slug}`)
            return res.data[0] || null
        },
        enabled: !!slug
    })

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto space-y-8">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-64 w-full rounded-xl" />
                <div className="space-y-4">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        )
    }

    if (!article) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold">Artigo não encontrado</h2>
                <Button variant="link" onClick={() => router.push('/p/artigos')} className="mt-4">
                    Voltar para a lista
                </Button>
            </div>
        )
    }

    return (
        <article className="max-w-4xl mx-auto">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/p/artigos')}
                className="mb-8 p-0 hover:bg-transparent text-muted-foreground hover:text-primary"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para artigos
            </Button>

            <header className="space-y-6 mb-12">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {article.category_name && (
                        <Badge variant="secondary">{article.category_name}</Badge>
                    )}
                    <div className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {format(new Date(article.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </div>
                    {article.author_name && (
                        <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {article.author_name}
                        </div>
                    )}
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                    {article.title}
                </h1>

                {article.excerpt && (
                    <p className="text-xl text-muted-foreground leading-relaxed italic border-l-4 pl-6 border-primary/20">
                        {article.excerpt}
                    </p>
                )}
            </header>

            {article.image && (
                <div className="aspect-video relative rounded-2xl overflow-hidden mb-12 shadow-xl">
                    <img
                        src={article.image}
                        alt={article.title}
                        className="object-cover w-full h-full"
                    />
                </div>
            )}

            <div
                className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: article.content }}
            />
        </article>
    )
}

"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { ArticleList } from "@/features/articles/article-list"
import { ArticleForm } from "@/features/articles/article-form"
import { TagList } from "@/features/articles/tag-list"
import { ArticleAnalytics } from "@/features/articles/article-analytics"
import { Article } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PublicArticleCard } from "@/components/public/article-card"

function ArtigosPageContent() {
    const [view, setView] = useState<'list' | 'blog' | 'create' | 'edit'>('list')
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
    const searchParams = useSearchParams()

    useEffect(() => {
        if (searchParams.get('action') === 'create') {
            setView('create')
            setSelectedArticle(null)
        }
    }, [searchParams])
    const { data: publishedArticles } = useQuery({
        queryKey: ['articles-published'],
        queryFn: async () => {
            const res = await api.get('/api/articles/articles/')
            const data = res.data.results || res.data
            return Array.isArray(data) ? data.filter((a: Article) => a.is_published) : []
        }
    })

    const handleCreate = () => {
        setSelectedArticle(null)
        setView('create')
    }

    const handleEdit = (article: Article) => {
        setSelectedArticle(article)
        setView('edit')
    }

    const handleSuccess = () => {
        setView('list')
        setSelectedArticle(null)
    }

    const handleCancel = () => {
        setView('list')
        setSelectedArticle(null)
    }

    return (
        <div className="h-full space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Centro de Conteúdo</h1>
                    <p className="text-muted-foreground text-lg">Gerencie artigos, notícias e organização temática.</p>
                </div>
            </div>

            <Tabs defaultValue="articles" className="w-full">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="articles" className="rounded-lg px-6">Artigos</TabsTrigger>
                    <TabsTrigger value="tags" className="rounded-lg px-6">Tags & Categorias</TabsTrigger>
                    <TabsTrigger value="analytics" className="rounded-lg px-6">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="articles" className="mt-6">
                    <ArticleList onCreate={handleCreate} onEdit={handleEdit} />
                    
                    {(view === 'create' || view === 'edit') && (
                        <ArticleForm
                            initialData={selectedArticle}
                            onSuccess={handleSuccess}
                            onCancel={handleCancel}
                        />
                    )}
                </TabsContent>

                <TabsContent value="tags" className="mt-6">
                    <TagList />
                </TabsContent>

                <TabsContent value="analytics" className="mt-6">
                    <ArticleAnalytics />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default function ArtigosPage() {
    return (
        <Suspense fallback={null}>
            <ArtigosPageContent />
        </Suspense>
    )
}

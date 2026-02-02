"use client"
 
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { ArticleList } from "@/features/articles/article-list"
import { ArticleForm } from "@/features/articles/article-form"
import { TagList } from "@/features/articles/tag-list"
import { Article } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PublicArticleCard } from "@/components/public/article-card"

export default function ArtigosPage() {
    const [view, setView] = useState<'list' | 'blog' | 'create' | 'edit'>('list')
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
    const { data: publishedArticles } = useQuery({
        queryKey: ['articles-published'],
        queryFn: async () => {
            const res = await api.get<Article[]>('/api/articles/articles/')
            return res.data.filter(a => a.is_published)
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
                <div className="flex items-center gap-2">
                    <button
                        className={`px-4 py-2 rounded-xl border ${view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                        onClick={() => setView('list')}
                        aria-label="Ver como tabela"
                    >
                        Tabela
                    </button>
                    <button
                        className={`px-4 py-2 rounded-xl border ${view === 'blog' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                        onClick={() => setView('blog')}
                        aria-label="Ver como blog"
                    >
                        Blog
                    </button>
                </div>
            </div>

            <Tabs defaultValue="articles" className="w-full">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="articles" className="rounded-lg px-6">Artigos</TabsTrigger>
                    <TabsTrigger value="tags" className="rounded-lg px-6">Tags & Categorias</TabsTrigger>
                </TabsList>

                <TabsContent value="articles" className="mt-6">
                    {view === 'list' && (
                        <ArticleList onCreate={handleCreate} onEdit={handleEdit} />
                    )}
                    {view === 'blog' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(publishedArticles || []).map((article) => (
                                <PublicArticleCard key={article.id} article={article} />
                            ))}
                        </div>
                    )}
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
            </Tabs>
        </div>
    )
}

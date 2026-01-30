"use client"

import { useState } from "react"
import { ArticleList } from "@/features/articles/article-list"
import { ArticleForm } from "@/features/articles/article-form"
import { Article } from "@/types"

export default function ArtigosPage() {
    const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

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
        <div className="h-full">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Gestão de Artigos</h1>
                <p className="text-muted-foreground">Crie e gerencie as postagens do seu blog ou central de ajuda.</p>
            </div>

            {view === 'list' && (
                <ArticleList onCreate={handleCreate} onEdit={handleEdit} />
            )}
            {(view === 'create' || view === 'edit') && (
                <ArticleForm
                    initialData={selectedArticle}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            )}
        </div>
    )
}

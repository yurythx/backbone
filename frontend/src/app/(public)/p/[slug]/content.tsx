"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { api } from "@/lib/axios"
import { Page } from "@/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function PublicPageContent({ slug }: { slug: string }) {
    const router = useRouter()

    const { data: page, isLoading } = useQuery({
        queryKey: ['public-page', slug],
        queryFn: async () => {
            // Busca a página pelo slug no backend
            const res = await api.get<Page[]>(`/api/pages/?slug=${slug}`)
            return res.data[0] || null
        },
        enabled: !!slug
    })

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 py-12">
                <Skeleton className="h-12 w-2/3" />
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </div>
        )
    }

    if (!page) {
        return (
            <div className="text-center py-24">
                <h2 className="text-3xl font-bold mb-4">Página não encontrada</h2>
                <p className="text-muted-foreground mb-8">O conteúdo que você procura pode ter sido removido ou o link está incorreto.</p>
                <Button onClick={() => router.push('/p/artigos')}>
                    Ver outros conteúdos
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-12">
            <header className="mb-12">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                    {page.title}
                </h1>
                <div className="h-1.5 w-20 bg-primary rounded-full" />
            </header>

            <div
                className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: page.content }}
            />
        </div>
    )
}
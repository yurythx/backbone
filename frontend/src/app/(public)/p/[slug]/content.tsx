"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { api } from "@/lib/axios"
import { Page } from "@/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { usePublicCompanySlug } from "@/hooks/use-public-company-slug"

type PublicPage = Pick<Page, "title" | "slug" | "content" | "meta_title" | "meta_description" | "meta_keywords">

export default function PublicPageContent({ slug }: { slug: string }) {
    const router = useRouter()
    const { companySlug, isResolving } = usePublicCompanySlug()

    const { data: page, isLoading } = useQuery({
        queryKey: ['public-page', slug, companySlug],
        queryFn: async ({ signal }) => {
            const qs = `&company_slug=${encodeURIComponent(companySlug as string)}`
            const res = await api.get<PublicPage[]>(`/api/pages/public/pages/?slug=${slug}${qs}`, {
                headers: { 'X-Company-Slug': companySlug as string },
                signal,
            })
            return res.data[0] || null
        },
        enabled: !!slug && !!companySlug
    })

    if (isLoading || isResolving) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 py-12" role="status" aria-live="polite" aria-label="Carregando conteúdo da página">
                <Skeleton className="h-12 w-2/3" />
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </div>
        )
    }

    if (!companySlug) {
        return (
            <div className="text-center py-24" role="alert" aria-live="assertive">
                <h2 className="text-3xl font-bold mb-4">Empresa não selecionada</h2>
                <p className="text-muted-foreground mb-8">
                    Selecione uma empresa para visualizar o conteúdo público.
                </p>
                <Button
                    onClick={() => router.push('/login')}
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Ir para login"
                >
                    Ir para login
                </Button>
            </div>
        )
    }

    if (!page) {
        return (
            <div className="text-center py-24" role="alert" aria-live="assertive">
                <h2 className="text-3xl font-bold mb-4">Página não encontrada</h2>
                <p className="text-muted-foreground mb-8">O conteúdo que você procura pode ter sido removido ou o link está incorreto.</p>
                <Button onClick={() => router.push('/p/artigos')} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label="Ver outros conteúdos">
                    Ver outros conteúdos
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-12" role="main" aria-label="Conteúdo da página pública">
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

"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { api } from "@/lib/axios"
import { Page } from "@/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useMemo, useState } from "react"

type PublicPage = Pick<Page, "title" | "slug" | "content" | "meta_title" | "meta_description" | "meta_keywords">

export default function PublicPageContent({ slug }: { slug: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const envCompany = process.env.NEXT_PUBLIC_COMPANY_SLUG || null
    const companySlugFromQuery = useMemo(() => (searchParams.get("company_slug") || "").trim() || null, [searchParams])

    const [effectiveCompanySlug, setEffectiveCompanySlug] = useState<string | null>(() => {
        if (companySlugFromQuery) return companySlugFromQuery
        const saved = typeof window !== "undefined" ? localStorage.getItem("companySlug") : null
        return (saved || envCompany || null)
    })

    useEffect(() => {
        if (companySlugFromQuery && companySlugFromQuery !== effectiveCompanySlug) {
            setEffectiveCompanySlug(companySlugFromQuery)
        }
    }, [companySlugFromQuery, effectiveCompanySlug])

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

    const { data: page, isLoading } = useQuery({
        queryKey: ['public-page', slug, effectiveCompanySlug],
        queryFn: async ({ signal }) => {
            const qs = `&company_slug=${encodeURIComponent(effectiveCompanySlug as string)}`
            const res = await api.get<PublicPage[]>(`/api/pages/public/pages/?slug=${slug}${qs}`, {
                headers: { 'X-Company-Slug': effectiveCompanySlug as string },
                signal,
            })
            return res.data[0] || null
        },
        enabled: !!slug && !!effectiveCompanySlug
    })

    if (isLoading) {
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

    if (!effectiveCompanySlug) {
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

import { api } from "@/lib/axios"
import { Page } from "@/types"
// Removed unused imports
import { Metadata } from 'next'
import PublicPageContent from "./content"

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
    const { slug } = await params

    try {
        const envCompany = process.env.NEXT_PUBLIC_COMPANY_SLUG || ''
        const qs = envCompany ? `&company_slug=${encodeURIComponent(envCompany)}` : ''
        const res = await api.get<Page[]>(`/api/pages/?slug=${slug}${qs}`, {
            headers: envCompany ? { 'X-Company-Slug': envCompany } : {}
        })
        const page = res.data[0]

        if (!page) return { title: 'Página não encontrada' }

        return {
            title: page.meta_title || page.title,
            description: page.meta_description,
            openGraph: {
                title: page.meta_title || page.title,
                description: page.meta_description,
            },
        }
    } catch {
        return { title: 'Backbone Page' }
    }
}

export default async function PublicPageDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    return <PublicPageContent slug={slug} />
}

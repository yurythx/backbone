import { api } from "@/lib/axios"
import { Page } from "@/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Metadata } from 'next'
import PublicPageContent from "./content"

export async function generateMetadata(
    { params }: { params: { slug: string } }
): Promise<Metadata> {
    const { slug } = await params

    try {
        const res = await api.get<Page[]>(`/api/pages/?slug=${slug}`)
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
    } catch (error) {
        return { title: 'Backbone Page' }
    }
}

export default async function PublicPageDetailPage({ params }: { params: { slug: string } }) {
    const { slug } = await params
    return <PublicPageContent slug={slug} />
}

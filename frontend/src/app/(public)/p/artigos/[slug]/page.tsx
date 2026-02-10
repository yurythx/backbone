import { api } from "@/lib/axios"
import { Article } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CalendarDays, User } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
    params: Promise<{ slug: string }>
}

async function getArticle(slug: string) {
    try {
        // In Server Components, we fetch directly. 
        // Note: Using the internal API URL if in Docker, but here we assume NEX_PUBLIC_API_URL is reachable.
        const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005';
        const res = await fetch(`${apiUrl}/api/articles/articles/?slug=${slug}`, {
            next: { revalidate: 3600 } // Cache for 1 hour
        })
        if (!res.ok) return null
        const articles = await res.json() as Article[]
        return articles[0] || null
    } catch (error) {
        console.error("Error fetching article for metadata:", error)
        return null
    }
}

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { slug } = await params
    const article = await getArticle(slug)

    if (!article) return { title: 'Artigo não encontrado | Backbone' }

    // Fetch company branding for icons
    let icon = '/favicon.ico'
    try {
        const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005';
        const brandingRes = await fetch(`${apiUrl}/api/core/branding/public_current/`, {
            headers: { 'x-company-slug': article.company_slug || '' },
            next: { revalidate: 3600 }
        })
        if (brandingRes.ok) {
            const branding = await brandingRes.json()
            if (branding.icon_url) icon = branding.icon_url
        }
    } catch (e) {
        console.error("Error fetching branding for metadata:", e)
    }

    return {
        title: `${article.meta_title || article.title} | ${article.company_name || 'Backbone'}`,
        description: article.meta_description || article.excerpt,
        icons: {
            icon: icon,
            shortcut: icon,
            apple: icon,
        },
        openGraph: {
            title: article.meta_title || article.title,
            description: article.meta_description || article.excerpt,
            images: article.image ? [{ url: article.image }] : [],
            type: 'article',
            publishedTime: article.created_at,
            siteName: article.company_name || 'Backbone',
        },
        twitter: {
            card: 'summary_large_image',
            title: article.meta_title || article.title,
            description: article.meta_description || article.excerpt,
            images: article.image ? [article.image] : [],
        }
    }
}

export default async function PublicArticleDetailPage({ params }: Props) {
    const { slug } = await params
    const article = await getArticle(slug)

    if (!article) {
        notFound()
    }

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.title,
        description: article.meta_description || article.excerpt,
        image: article.image ? [article.image] : [],
        datePublished: article.published_at || article.created_at,
        dateModified: article.updated_at,
        author: [{
            '@type': 'Person',
            name: article.author_name || 'Equipe Backbone',
        }],
        publisher: {
            '@type': 'Organization',
            name: article.company_name || 'Backbone SaaS',
            logo: {
                '@type': 'ImageObject',
                url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/favicon.ico`, // Ideally company logo
            },
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/p/artigos/${slug}`,
        },
    }

    return (
        <article className="max-w-4xl mx-auto py-10">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Button
                variant="ghost"
                size="sm"
                asChild
                className="mb-8 p-0 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors group"
            >
                <Link href="/p/artigos" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Voltar para artigos
                </Link>
            </Button>

            <header className="space-y-8 mb-12">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {article.category_name && (
                        <div className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider">
                            {article.category_name}
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 opacity-70" />
                        <span>{format(new Date(article.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
                    </div>
                    {article.author_name && (
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-3 w-3" />
                            </div>
                            <span className="font-medium text-foreground">{article.author_name}</span>
                        </div>
                    )}
                </div>

                <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.1] text-foreground">
                    {article.title}
                </h1>

                {article.excerpt && (
                    <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium italic border-l-4 pl-8 border-primary/30">
                        {article.excerpt}
                    </p>
                )}
            </header>

            {article.image && (
                <div className="aspect-[21/9] relative rounded-[32px] overflow-hidden mb-16 shadow-2xl shadow-primary/5 border border-primary/5">
                    <img
                        src={article.image}
                        alt={article.title}
                        className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
                    />
                </div>
            )}

            <div
                className="prose prose-lg md:prose-xl dark:prose-invert max-w-none 
                prose-headings:font-black prose-headings:tracking-tight
                prose-a:text-primary prose-a:font-bold hover:prose-a:underline
                prose-img:rounded-3xl prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:p-6 prose-blockquote:rounded-2xl"
                dangerouslySetInnerHTML={{ __html: article.content }}
            />

            <footer className="mt-20 pt-10 border-t border-border/50">
                <div className="flex flex-wrap gap-2">
                    {article.tags?.map((tag: any) => (
                        <Badge key={tag.id} variant="outline" className="rounded-full px-4 py-1.5 bg-muted/30 hover:bg-primary/10 hover:text-primary transition-colors cursor-default border-none">
                            #{tag.name}
                        </Badge>
                    ))}
                </div>
            </footer>
        </article>
    )
}

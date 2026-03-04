"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { ArticleForm } from "@/features/articles/article-form"
import { Loader2 } from "lucide-react"

export default function EditarArtigoPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const slug = params?.slug

  const { data: article, isLoading, isError } = useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const res = await api.get(`/api/articles/articles/`, { params: { slug } })
      const payload = res.data?.results ?? res.data
      return Array.isArray(payload) ? payload[0] ?? null : payload ?? null
    },
    enabled: Boolean(slug),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando artigo...</span>
      </div>
    )
  }

  if (isError || !article) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <h2 className="text-xl font-bold">Artigo não encontrado</h2>
        <button 
            onClick={() => router.push('/artigos')}
            className="text-primary hover:underline"
        >
            Voltar para a lista
        </button>
      </div>
    )
  }

  return (
    <ArticleForm
      initialData={article}
      onSuccess={() => router.push('/artigos')}
      onCancel={() => router.push('/artigos')}
    />
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { ArticleForm } from "@/features/articles/article-form"

export default function NovoArtigoPage() {
  const router = useRouter()

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/accounts/users/me/')
        return res.data
      } catch {
        return null
      }
    },
    retry: false
  })

  if (isLoading || !me) {
    return <div className="flex items-center justify-center h-full">Carregando...</div>
  }

  return (
    <ArticleForm
      onSuccess={() => router.push('/artigos')}
      onCancel={() => router.push('/artigos')}
    />
  )
}

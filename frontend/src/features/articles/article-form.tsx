"use client"

import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Article, Category, Tag } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, Image as ImageIcon, X, Globe, MessageSquareQuote, Layout, CheckCircle2, XCircle, Send } from "lucide-react"
import { RichEditor } from "@/components/ui/rich-editor"
import { PreviewDialog } from "@/components/cms/preview-dialog"
import { MediaDialog } from "@/features/media/media-dialog"
import { notify } from "@/lib/notifications"
import { ArticleHistory } from "@/features/articles/article-history"
import { ArticleComments } from "@/features/articles/article-comments"

const formSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  slug: z.string().min(3, "O link permanente deve ter pelo menos 3 caracteres.").regex(/^[a-z0-9-]+$/, "O link deve conter apenas letras minúsculas, números e hifens."),
  content: z.string().min(10, "O conteúdo deve ter pelo menos 10 caracteres."),
  excerpt: z.string().optional(),
  category: z.string().optional(),
  is_published: z.boolean(),
  image: z.string().optional(),
  meta_title: z.string().max(70, "O título SEO deve ter menos de 70 caracteres.").optional(),
  meta_description: z.string().max(160, "A descrição SEO deve ter menos de 160 caracteres.").optional(),
  meta_keywords: z.string().optional(),
  tags: z.array(z.number()).default([]),
})

interface ArticleFormProps {
  initialData?: Article | null
  onSuccess: () => void
  onCancel: () => void
}

export function ArticleForm({ initialData, onSuccess, onCancel }: ArticleFormProps) {
  const queryClient = useQueryClient()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<any>('/api/articles/categories/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    }
  })

  const { data: allTags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await api.get<any>('/api/articles/tags/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    }
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: initialData?.title || "",
      slug: initialData?.slug || "",
      content: initialData?.content || "",
      excerpt: initialData?.excerpt || "",
      category: initialData?.category ? String(initialData.category) : undefined,
      is_published: initialData?.is_published || false,
      image: initialData?.image || "",
      meta_title: initialData?.meta_title || "",
      meta_description: initialData?.meta_description || "",
      meta_keywords: initialData?.meta_keywords || "",
      tags: initialData?.tags || [],
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ action, id }: { action: 'submit' | 'publish' | 'reject', id: number }) => {
      await api.post(`/api/articles/articles/${id}/${action}/`)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      const messages = {
        submit: "Artigo enviado para revisão",
        publish: "Artigo publicado com sucesso",
        reject: "Artigo rejeitado"
      }
      notify.success(messages[variables.action], "Status atualizado.")
      if (onSuccess) onSuccess()
    },
    onError: (error: any) => {
      notify.error("Falha na operação", error)
    }
  })

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload = {
        ...values,
        category: values.category ? parseInt(values.category) : null,
      }

      if (initialData) {
        await api.put(`/api/articles/articles/${initialData.id}/`, payload)
      } else {
        await api.post('/api/articles/articles/', payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      notify.success(initialData ? "Artigo atualizado" : "Artigo criado", "As alterações foram salvas com sucesso.")
      onSuccess()
    },
    onError: (error: any) => {
      notify.error("Falha ao salvar artigo", error)
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values)
  }

  return (
    <div className="space-y-6">
      {/* Header Fixo/Stick no mobile para ações rápidas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6 sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel} className="hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {initialData ? "Editar Artigo" : "Novo Artigo"}
            </h2>
            <p className="text-sm text-muted-foreground hidden sm:block">Gerencie o conteúdo do seu ecossistema.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {initialData && (
            <>
              {initialData.status === 'draft' && (
                <Button variant="outline" onClick={() => reviewMutation.mutate({ action: 'submit', id: initialData.id })}>
                  <Send className="mr-2 h-4 w-4" /> Enviar para Revisão
                </Button>
              )}
              {initialData.status === 'pending' && (
                <>
                  <Button variant="destructive" onClick={() => reviewMutation.mutate({ action: 'reject', id: initialData.id })}>
                    <XCircle className="mr-2 h-4 w-4" /> Rejeitar
                  </Button>
                  <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => reviewMutation.mutate({ action: 'publish', id: initialData.id })}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
                  </Button>
                </>
              )}
            </>
          )}

          {initialData && (
            <>
              <ArticleHistory articleId={initialData.id} />
              <ArticleComments articleId={initialData.id} />
            </>
          )}
          <div className="flex-1 sm:flex-initial">
            <PreviewDialog
              type="article"
              title={form.watch("title")}
              content={form.watch("content")}
              excerpt={form.watch("excerpt")}
              image={form.watch("image")}
              categoryName={categories?.find((c: Category) => String(c.id) === form.watch("category"))?.name}
              date={new Date().toLocaleDateString('pt-BR')}
            />
          </div>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={mutation.isPending} className="flex-1 sm:flex-initial shadow-lg shadow-primary/20">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Salvar" : "Criar Artigo"}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          <div className="lg:col-span-2 space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Título Principal</FormLabel>
                  <FormControl>
                    <Input placeholder="Título do artigo" className="text-xl font-bold h-12 px-4 shadow-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Corpo do Artigo</FormLabel>
                  <FormControl>
                    <RichEditor
                      content={field.value}
                      onChange={field.onChange}
                      placeholder="Comece a escrever sua história..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-8 space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <Globe className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">SEO & Otimização de Busca</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 p-6 rounded-2xl bg-muted/30 border">
                <FormField
                  control={form.control}
                  name="meta_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Título SEO (Meta Title)</FormLabel>
                      <FormControl>
                        <Input placeholder="Título como aparecerá no Google" className="bg-background h-11" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Recomendado até 60 caracteres.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meta_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Descrição SEO (Meta Description)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Breve resumo para os resultados de busca..." className="bg-background h-24 resize-none" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Recomendado até 160 caracteres.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <Layout className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Publicação</h3>
              </div>

              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-6">
                <FormField
                  control={form.control}
                  name="is_published"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="h-5 w-5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-bold">Ativar Publicação</FormLabel>
                        <p className="text-xs text-muted-foreground">O artigo ficará disponível imediatamente.</p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-background">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((cat: Category) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL Amigável (Slug)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input placeholder="slug-do-artigo" className="h-11 bg-background font-mono text-sm" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {allTags?.map((tag: Tag) => {
                      const isSelected = form.watch("tags").includes(tag.id)
                      return (
                        <Badge
                          key={tag.id}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer transition-all hover:scale-105 ${isSelected ? 'shadow-md shadow-primary/20' : 'hover:bg-primary/5'}`}
                          onClick={() => {
                            const current = form.getValues("tags")
                            if (isSelected) {
                              form.setValue("tags", current.filter(id => id !== tag.id))
                            } else {
                              form.setValue("tags", [...current, tag.id])
                            }
                          }}
                        >
                          {tag.name}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Mídia de Capa</h3>
              </div>

              <div className="p-6 rounded-2xl bg-muted/30 border space-y-4">
                {form.watch("image") ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border shadow-inner group">
                    <Image
                      src={form.watch("image") || ""}
                      alt="Preview"
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 rounded-full"
                        onClick={() => form.setValue("image", "")}
                      >
                        <X className="h-4 w-4 mr-1" /> Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <MediaDialog
                    onSelect={(url) => form.setValue("image", url)}
                    trigger={
                      <div className="aspect-video flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all group">
                        <div className="h-12 w-12 rounded-full bg-primary/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <ImageIcon className="h-6 w-6 text-primary" />
                        </div>
                        <span className="text-sm font-bold">Selecionar Imagem</span>
                        <span className="text-[10px] text-muted-foreground mt-1">Recomendado: 1200x630px</span>
                      </div>
                    }
                  />
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <MessageSquareQuote className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Resumo</h3>
              </div>

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Escreva um breve resumo atrativo..."
                        className="h-32 resize-none rounded-2xl bg-muted/30 border p-4"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Aparece na listagem de posts.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}

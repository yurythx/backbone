"use client"

import Image from "next/image"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
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
import { Loader2, ArrowLeft, Image as ImageIcon, X, Globe, MessageSquareQuote, Layout, CheckCircle2, XCircle, Send, Sparkles, Link as LinkIcon, Lock, Trash2 } from "lucide-react"
import { RichEditor } from "@/components/ui/rich-editor"
import { PreviewDialog } from "@/components/cms/preview-dialog"
import { MediaDialog } from "@/features/media/media-dialog"
import { notify } from "@/lib/notifications"
import { ArticleHistory } from "@/features/articles/article-history"
import { ArticleComments } from "@/features/articles/article-comments"
import { VisibilityToggle } from "@/components/articles/visibility-toggle"
import { slugify, fixImageUrl } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const formSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  slug: z.string().min(3, "O link permanente deve ter pelo menos 3 caracteres.").regex(/^[a-z0-9-]+$/, "O link deve conter apenas letras minúsculas, números e hifens."),
  content: z.string().min(10, "O conteúdo deve ter pelo menos 10 caracteres."),
  excerpt: z.string().optional(),
  category: z.string().optional(),
  // is_published removido (M6) — o status é o campo canônico, controlado pelos botões de fluxo
  is_public: z.boolean(),
  image: z.string().optional(),
  meta_title: z.string().max(70, "O título SEO deve ter menos de 70 caracteres.").optional(),
  meta_description: z.string().max(160, "A descrição SEO deve ter menos de 160 caracteres.").optional(),
  meta_keywords: z.string().optional(),
  tags: z.array(z.number()),
})

interface ArticleFormProps {
  initialData?: Article | null
  onSuccess: () => void
  onCancel: () => void
}

export function ArticleForm({ initialData, onSuccess, onCancel }: ArticleFormProps) {
  const queryClient = useQueryClient()

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<Category[] | { results: Category[] }>('/api/articles/categories/')
      const data = Array.isArray(res.data) ? res.data : res.data.results || []
      return Array.isArray(data) ? data : []
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  })

  const { data: allTags } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await api.get<Tag[] | { results: Tag[] }>('/api/articles/tags/')
      const data = Array.isArray(res.data) ? res.data : res.data.results || []
      return Array.isArray(data) ? data : []
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  })

  const [lockSlug, setLockSlug] = useState(!initialData)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      slug: initialData?.slug || "",
      content: initialData?.content || "",
      excerpt: initialData?.excerpt || "",
      category: initialData?.category ? String(initialData.category) : undefined,
      is_public: initialData?.is_public || false,
      image: initialData?.image || "",
      meta_title: initialData?.meta_title || "",
      meta_description: initialData?.meta_description || "",
      meta_keywords: initialData?.meta_keywords || "",
      tags: initialData?.tags || [],
    },
  })

  // Bug 6: useWatch para preview do Google reativo em tempo real
  const watchedMetaTitle = useWatch({ control: form.control, name: "meta_title" })
  const watchedMetaDescription = useWatch({ control: form.control, name: "meta_description" })
  const watchedSlug = useWatch({ control: form.control, name: "slug" })

  const [previewTitle, setPreviewTitle] = useState(form.getValues("title"))
  const [previewContent, setPreviewContent] = useState(form.getValues("content"))
  const [previewExcerpt, setPreviewExcerpt] = useState(form.getValues("excerpt"))
  const [previewImage, setPreviewImage] = useState(form.getValues("image"))
  const [previewCategoryId, setPreviewCategoryId] = useState(form.getValues("category"))
  const [previewTags, setPreviewTags] = useState<number[]>(form.getValues("tags") || [])

  const handleTitleChange = (value: string) => {
    form.setValue("title", value)
    setPreviewTitle(value)
    // Bug 5: quando lockSlug=false (modo criação), gera slug automaticamente
    if (!lockSlug) {
      form.setValue("slug", slugify(value))
    }
  }

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
    onError: (error: unknown) => {
      notify.error("Falha na operação", error instanceof Error ? error.message : String(error))
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
    onError: (error: unknown) => {
      notify.error("Falha ao salvar artigo", error instanceof Error ? error.message : String(error))
    }
  })

  const seoMutation = useMutation({
    mutationFn: async ({ title, content }: { title: string, content: string }) => {
      const res = await api.post('/api/ai/seo-suggest/', { title, content })
      return res.data
    },
    onSuccess: (data) => {
      if (data.meta_title) form.setValue("meta_title", data.meta_title)
      if (data.meta_description) form.setValue("meta_description", data.meta_description)
      if (data.keywords) form.setValue("meta_keywords", data.keywords)
      notify.success("Sugestões de SEO geradas!", "As tags foram preenchidas por IA.")
    },
    onError: (error: unknown) => {
      notify.error("Falha ao gerar sugestões SEO", error instanceof Error ? error.message : String(error))
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/articles/articles/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      notify.success("Artigo excluído", "O artigo foi removido com sucesso.")
      if (onSuccess) onSuccess()
    },
    onError: (error: unknown) => {
      notify.error("Falha ao excluir artigo", error instanceof Error ? error.message : String(error))
    }
  })

  const handleAISuggest = () => {
    const title = form.getValues("title")
    const content = form.getValues("content")
    if (!title || title.length < 5 || !content || content.length < 10) {
      notify.warning("Conteúdo insuficiente", "Preencha o título e o corpo do artigo primeiro.")
      return
    }
    seoMutation.mutate({ title, content })
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values)
  }

  return (
    <div className="space-y-6">
      {/* Header Fixo/Stick no mobile para ações rápidas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6 sticky top-0 bg-background z-10 pt-2">
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

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" className="shadow-sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente o artigo &quot;{initialData.title}&quot;.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(initialData.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <div className="flex-1 sm:flex-initial">
            <PreviewDialog
              type="article"
              title={previewTitle}
              content={previewContent}
              excerpt={previewExcerpt}
              image={previewImage}
              categoryName={categories?.find((c: Category) => String(c.id) === previewCategoryId)?.name}
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
                    <Input
                      placeholder="Título do artigo"
                      className="text-xl font-bold h-12 px-4 shadow-sm"
                      value={field.value}
                      onChange={(e) => handleTitleChange(e.target.value)}
                    />
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
                      onChange={(val) => {
                        field.onChange(val)
                        setPreviewContent(val)
                      }}
                      placeholder="Comece a escrever sua história..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-8 space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">SEO & Otimização de Busca</h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-primary border-primary/20 hover:bg-primary/10"
                  onClick={handleAISuggest}
                  disabled={seoMutation.isPending}
                >
                  {seoMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Sugerir com IA
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-6 p-6 rounded-2xl bg-muted/30 border">
                {/* Google Search Preview */}
                <div className="p-4 bg-white dark:bg-black border rounded-lg shadow-sm">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Pré-visualização no Google</p>
                  <div className="font-sans">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 overflow-hidden">
                        {previewImage ? (
                          <Image
                            src={fixImageUrl(previewImage) || ""}
                            alt="Pré-visualização"
                            width={28}
                            height={28}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Globe className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-800 dark:text-gray-200 leading-tight">Seu Site</span>
                        {/* Bug 6: usa watchedSlug reativo */}
                        <span className="text-xs text-gray-500 leading-tight">{`https://seusite.com/blog/${watchedSlug || 'slug-do-artigo'}`}</span>
                      </div>
                    </div>
                    <h3 className="text-xl text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer truncate font-medium">
                      {/* Bug 6: usa watchedMetaTitle que é reativo em tempo real */}
                      {watchedMetaTitle || previewTitle || "Título do Artigo"}
                    </h3>
                    <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2 mt-1">
                      {/* Bug 6: usa watchedMetaDescription reativo */}
                      {watchedMetaDescription || previewExcerpt || "A descrição do seu artigo aparecerá aqui nos resultados de busca..."}
                    </p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="meta_title"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between">
                        <FormLabel className="font-semibold">Título SEO (Meta Title)</FormLabel>
                        <span className={`text-xs ${(field.value?.length || 0) > 60 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                          {field.value?.length || 0}/60
                        </span>
                      </div>
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
                      <div className="flex justify-between">
                        <FormLabel className="font-semibold">Descrição SEO (Meta Description)</FormLabel>
                        <span className={`text-xs ${(field.value?.length || 0) > 160 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                          {field.value?.length || 0}/160
                        </span>
                      </div>
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
                {/* VisibilityToggle - Público/Privado */}
                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <VisibilityToggle
                          isPublic={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* M6: controle de publicação unificado nos botões de fluxo (Submit/Approve/Reject) */}

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val)
                          setPreviewCategoryId(val)
                        }}
                        defaultValue={field.value}
                      >
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

                {/* Bug 5: Slug - lockSlug=false = auto-gerado ao digitar; lockSlug=true = editável manualmente */}
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>URL Amigável (Slug)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setLockSlug(!lockSlug)}
                          title={!lockSlug ? "Bloquear (ativa geração automática)" : "Desbloquear para edição manual"}
                        >
                          {/* Bug 5: Lock agora significa "bloqueado para edição" = geração automática ativa */}
                          {!lockSlug ? <Lock className="h-3 w-3 text-primary" /> : <LinkIcon className="h-3 w-3" />}
                        </Button>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="slug-do-artigo"
                            className={`h-11 bg-background font-mono text-sm ${!lockSlug ? 'opacity-80' : ''}`}
                            {...field}
                            readOnly={!lockSlug}
                          />
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
                      const isSelected = previewTags.includes(tag.id)
                      return (
                        <Badge
                          key={tag.id}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer transition-all hover:scale-105 ${isSelected ? 'shadow-md shadow-primary/20' : 'hover:bg-primary/5'}`}
                          onClick={() => {
                            setPreviewTags(prev => {
                              const next = isSelected ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                              form.setValue("tags", next)
                              return next
                            })
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
                {previewImage ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border shadow-inner group">
                    <Image
                      src={fixImageUrl(previewImage) || ""}
                      alt="Preview"
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 rounded-full"
                        onClick={() => {
                          form.setValue("image", "")
                          setPreviewImage("")
                        }}
                      >
                        <X className="h-4 w-4 mr-1" /> Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <MediaDialog
                    onSelect={(url) => {
                      const fixed = fixImageUrl(url)
                      if (fixed) {
                        form.setValue("image", fixed)
                        setPreviewImage(fixed)
                      }
                    }}
                  >
                    <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
                      <div className="h-12 w-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                        <ImageIcon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Adicionar imagem de capa</p>
                      <p className="text-xs text-muted-foreground mt-1">Recomendado: 1200x630px</p>
                    </div>
                  </MediaDialog>
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
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e)
                          setPreviewExcerpt(e.currentTarget.value)
                        }}
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

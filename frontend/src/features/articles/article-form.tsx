"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Article, Category } from "@/types"
import { Button } from "@/components/ui/button"
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
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { RichEditor } from "@/components/ui/rich-editor"
import { PreviewDialog } from "@/components/cms/preview-dialog"

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  slug: z.string().min(3, "Slug must be at least 3 characters.").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens."),
  content: z.string().min(10, "Content must be at least 10 characters."),
  excerpt: z.string().optional(),
  category: z.string().optional(),
  is_published: z.boolean(),
  meta_title: z.string().max(70, "SEO Title should be under 70 characters.").optional(),
  meta_description: z.string().max(160, "SEO Description should be under 160 characters.").optional(),
  meta_keywords: z.string().optional(),
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
      // Handle both paginated and non-paginated responses
      return Array.isArray(res.data) ? res.data : res.data.results || []
    }
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      slug: initialData?.slug || "",
      content: initialData?.content || "",
      excerpt: initialData?.excerpt || "",
      category: initialData?.category ? String(initialData.category) : undefined,
      is_published: initialData?.is_published || false,
      meta_title: initialData?.meta_title || "",
      meta_description: initialData?.meta_description || "",
      meta_keywords: initialData?.meta_keywords || "",
    },
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
      toast.success(initialData ? "Article updated" : "Article created")
      onSuccess()
    },
    onError: (error) => {
      toast.error("Failed to save article")
      console.error(error)
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">
          {initialData ? "Edit Article" : "New Article"}
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Article title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input placeholder="article-slug" {...field} />
                </FormControl>
                <FormDescription>URL-friendly name.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
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
            name="excerpt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Excerpt</FormLabel>
                <FormControl>
                  <Textarea placeholder="Short summary..." {...field} />
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
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <RichEditor
                    content={field.value}
                    onChange={field.onChange}
                    placeholder="Escreva seu artigo aqui..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_published"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Published
                  </FormLabel>
                  <FormDescription>
                    This article will be visible to users immediately.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <div className="pt-6 border-t">
            <h3 className="text-lg font-medium mb-4">SEO & Social Media</h3>
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <FormField
                control={form.control}
                name="meta_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SEO Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Título para o Google" {...field} />
                    </FormControl>
                    <FormDescription>Máximo 70 caracteres.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meta_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SEO Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Breve resumo para buscadores..." {...field} />
                    </FormControl>
                    <FormDescription>Máximo 160 caracteres.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meta_keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords</FormLabel>
                    <FormControl>
                      <Input placeholder="tag1, tag2, tag3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Article
            </Button>
            <PreviewDialog
              type="article"
              title={form.getValues("title")}
              content={form.getValues("content")}
              excerpt={form.getValues("excerpt")}
              categoryName={categories?.find((c: Category) => String(c.id) === form.getValues("category"))?.name}
              date={new Date().toLocaleDateString('pt-BR')}
            />
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

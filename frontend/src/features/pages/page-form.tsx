"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Page } from "@/types"
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
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

const formSchema = z.object({
    title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
    slug: z.string().min(3, "O slug deve ter pelo menos 3 caracteres.").regex(/^[a-z0-9-]+$/, "O slug deve conter apenas letras minúsculas, números e hífens."),
    content: z.string().min(10, "O conteúdo deve ter pelo menos 10 caracteres."),
    is_active: z.boolean(),
})

interface PageFormProps {
    initialData?: Page | null
    onSuccess: () => void
    onCancel: () => void
}

export function PageForm({ initialData, onSuccess, onCancel }: PageFormProps) {
    const queryClient = useQueryClient()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData?.title || "",
            slug: initialData?.slug || "",
            content: initialData?.content || "",
            is_active: initialData?.is_active ?? true,
        },
    })

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            if (initialData) {
                await api.put(`/api/pages/${initialData.id}/`, values)
            } else {
                await api.post('/api/pages/', values)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pages'] })
            toast.success(initialData ? "Página atualizada" : "Página criada")
            onSuccess()
        },
        onError: (error) => {
            toast.error("Erro ao salvar página")
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
                    {initialData ? "Editar Página" : "Nova Página"}
                </h2>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Título</FormLabel>
                                <FormControl>
                                    <Input placeholder="Título da página" {...field} />
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
                                    <Input placeholder="slug-da-pagina" {...field} />
                                </FormControl>
                                <FormDescription>Parte da URL da página.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Conteúdo</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Escreva o conteúdo da página..." className="min-h-[300px]" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="is_active"
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
                                        Ativa
                                    </FormLabel>
                                    <FormDescription>
                                        Páginas inativas não serão exibidas no portal.
                                    </FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />

                    <div className="flex gap-4">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Página
                        </Button>
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancelar
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}

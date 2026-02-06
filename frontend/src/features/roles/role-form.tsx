"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/axios"
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { notify } from "@/lib/notifications"
import { Shield, Lock, CheckCircle2 } from "lucide-react"

const AVAILABLE_PERMISSIONS = [
    { id: 'articles.article_manage', label: 'Gerenciar Artigos', description: 'Criar, editar e excluir artigos.' },
    { id: 'articles.category_manage', label: 'Gerenciar Categorias', description: 'Criar e editar categorias de artigos.' },
    { id: 'cms.page_manage', label: 'Gerenciar Páginas', description: 'Criar e editar páginas institucionais.' },
    { id: 'messenger.view', label: 'Acesso ao Chat', description: 'Visualizar e participar de conversas no Messenger.' },
    { id: 'admin.user_manage', label: 'Gerenciar Equipe', description: 'Convidar novos membros e alterar papéis.' },
    { id: 'admin.smtp_manage', label: 'Configurações de E-mail', description: 'Alterar configurações de SMTP da empresa.' },
]

const formSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
    description: z.string().optional(),
    permissions: z.array(z.string()),
})

interface RoleFormProps {
    initialData?: any
    onSuccess: () => void
    onCancel: () => void
}

export function RoleForm({ initialData, onSuccess, onCancel }: RoleFormProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
            description: initialData?.description || "",
            permissions: initialData?.permissions || [],
        },
    })

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            if (initialData) {
                await api.put(`/api/accounts/roles/${initialData.id}/`, values)
            } else {
                await api.post('/api/accounts/roles/', values)
            }
        },
        onSuccess: () => {
            notify.success(initialData ? "Papel atualizado" : "Papel criado")
            onSuccess()
        },
        onError: (error) => {
            notify.error("Erro ao salvar papel", error)
        }
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutation.mutate(values)
    }

    return (
        <Dialog open onOpenChange={onCancel}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
                <div className="p-8 space-y-8">
                    <DialogHeader>
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl font-bold">
                            {initialData ? "Editar Papel de Acesso" : "Criar Novo Papel"}
                        </DialogTitle>
                        <DialogDescription>
                            Defina as permissões granulares para este grupo de acesso.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">Nome do Papel</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Editor de Conteúdo" className="h-11 rounded-xl" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">Descrição</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Para que serve este papel?"
                                                    className="resize-none rounded-xl h-24 bg-muted/20 border-none focus:ring-1 focus:ring-primary"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <Lock className="h-4 w-4 text-primary" />
                                    <h4 className="text-sm font-bold">Permissões de Acesso</h4>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {AVAILABLE_PERMISSIONS.map((permission) => (
                                        <FormField
                                            key={permission.id}
                                            control={form.control}
                                            name="permissions"
                                            render={({ field }) => (
                                                <FormItem
                                                    className={cn(
                                                        "flex flex-row items-center space-x-3 space-y-0 p-4 rounded-2xl border transition-all cursor-pointer hover:border-primary/50",
                                                        field.value?.includes(permission.id) ? "bg-primary/5 border-primary/30" : "bg-muted/10 border-transparent"
                                                    )}
                                                    onClick={() => {
                                                        const current = field.value || []
                                                        const next = current.includes(permission.id)
                                                            ? current.filter(id => id !== permission.id)
                                                            : [...current, permission.id]
                                                        field.onChange(next)
                                                    }}
                                                >
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(permission.id)}
                                                            onCheckedChange={() => { }} // Handle via parent click
                                                            className="h-5 w-5 rounded-lg border-2"
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1">
                                                        <FormLabel className="text-sm font-bold cursor-pointer">
                                                            {permission.label}
                                                        </FormLabel>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            {permission.description}
                                                        </p>
                                                    </div>
                                                    {field.value?.includes(permission.id) && (
                                                        <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                                                    )}
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-background/95 backdrop-blur-sm -mx-8 -mb-8 p-8 border-t">
                                <Button variant="ghost" type="button" onClick={onCancel} className="rounded-xl h-11 px-6">
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={mutation.isPending} className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20">
                                    {initialData ? "Salvar Alterações" : "Criar Papel"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}

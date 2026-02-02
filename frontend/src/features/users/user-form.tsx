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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { notify } from "@/lib/notifications"
import { User, Shield, Key } from "lucide-react"

const formSchema = z.object({
    username: z.string().min(3, "Username deve ter pelo menos 3 caracteres."),
    email: z.string().email("Email inválido."),
    first_name: z.string().min(1, "Primeiro nome é obrigatório."),
    last_name: z.string().min(1, "Último nome é obrigatório."),
    role: z.string().optional(),
})

interface UserFormProps {
    initialData?: any
    roles?: any[]
    onSuccess: () => void
    onCancel: () => void
}

export function UserForm({ initialData, roles, onSuccess, onCancel }: UserFormProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: initialData?.username || "",
            email: initialData?.email || "",
            first_name: initialData?.first_name || "",
            last_name: initialData?.last_name || "",
            role: initialData?.role ? String(initialData.role) : undefined,
        },
    })

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            const payload = {
                ...values,
                role: values.role ? parseInt(values.role) : null,
            }

            if (initialData) {
                await api.patch(`/api/accounts/users/${initialData.id}/`, payload)
            } else {
                // Para novos usuários criados pelo admin, precisaríamos de uma lógica de senha temporária ou convite
                // Por enquanto, vamos assumir que apenas editamos ou criamos básico.
                await api.post('/api/accounts/users/', payload)
            }
        },
        onSuccess: () => {
            notify.success(initialData ? "Usuário atualizado" : "Membro adicionado")
            onSuccess()
        },
        onError: (error) => {
            notify.error("Erro ao salvar usuário", error)
        }
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutation.mutate(values)
    }

    return (
        <Dialog open onOpenChange={onCancel}>
            <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 border-none shadow-2xl">
                <div className="p-8 space-y-8">
                    <DialogHeader>
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl font-bold">
                            {initialData ? "Editar Membro" : "Novo Membro da Equipe"}
                        </DialogTitle>
                        <DialogDescription>
                            Configure o perfil e o nível de acesso do usuário.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="first_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Nome</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John" className="h-11 rounded-xl" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="last_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Sobrenome</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Doe" className="h-11 rounded-xl" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="john@example.com" className="h-11 rounded-xl" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Nível de Acesso</h4>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none focus:ring-2 focus:ring-primary/20">
                                                        <SelectValue placeholder="Selecione um papel..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-xl">
                                                    {roles?.map((role) => (
                                                        <SelectItem key={role.id} value={String(role.id)} className="cursor-pointer">
                                                            {role.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription className="text-[10px] mt-2 italic">
                                                As permissões serão aplicadas imediatamente após salvar.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t -mx-8 -mb-8 p-8">
                                <Button variant="ghost" type="button" onClick={onCancel} className="rounded-xl h-11 px-6">
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={mutation.isPending} className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20">
                                    {initialData ? "Salvar Alterações" : "Adicionar Membro"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

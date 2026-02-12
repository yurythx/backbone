"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQuery } from "@tanstack/react-query"
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
import { User, Shield, Key, Building2 } from "lucide-react"

const formSchema = z.object({
    username: z.string().min(3, "Username deve ter pelo menos 3 caracteres."),
    email: z.string().email("Email inválido."),
    first_name: z.string().min(1, "Primeiro nome é obrigatório."),
    last_name: z.string().min(1, "Último nome é obrigatório."),
    role: z.string().optional(),
    company: z.string().optional(),
    password: z.string().optional(),
}).refine((data) => {
    // A validação da senha será feita no contexto do formulário (submit)
    // pois não temos acesso ao initialData aqui dentro de forma limpa sem criar factories.
    return true
})

interface UserFormProps {
    initialData?: any
    roles?: any[]
    onSuccess: () => void
    onCancel: () => void
}

export function UserForm({ initialData, roles, onSuccess, onCancel }: UserFormProps) {
    const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get('/api/accounts/users/me/')).data })
    const isSuperuser = me?.is_superuser

    const { data: companies } = useQuery({
        queryKey: ['companies-list'],
        queryFn: async () => {
            if (!isSuperuser) return []
            const res = await api.get('/api/core/companies/')
            return res.data.results || res.data
        },
        enabled: !!isSuperuser
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: initialData?.username || "",
            email: initialData?.email || "",
            first_name: initialData?.first_name || "",
            last_name: initialData?.last_name || "",
            role: initialData?.role ? String(initialData.role) : undefined,
            company: initialData?.company ? String(initialData.company) : (me?.company ? String(me.company) : undefined),
            password: "",
        },
    })

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            // Validação manual de senha para criação
            if (!initialData && (!values.password || values.password.length < 8)) {
                form.setError("password", { 
                    type: "manual", 
                    message: "A senha é obrigatória e deve ter no mínimo 8 caracteres para novos usuários." 
                })
                throw new Error("Senha inválida")
            }

            const payload: any = {
                ...values,
                role: values.role ? parseInt(values.role) : null,
                company: values.company ? parseInt(values.company) : undefined,
            }

            // Remove password validation/field if empty (for edits)
            if (!values.password) {
                delete payload.password
            }

            if (initialData) {
                await api.patch(`/api/accounts/users/${initialData.id}/`, payload)
            } else {
                await api.post('/api/accounts/users/', payload)
            }
        },
        onSuccess: () => {
            notify.success(initialData ? "Usuário atualizado" : "Membro adicionado")
            onSuccess()
        },
        onError: (error: any) => {
            if (error.message !== "Senha inválida") {
                notify.error("Erro ao salvar usuário", error)
            }
        }
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutation.mutate(values)
    }

    return (
        <Dialog open onOpenChange={onCancel}>
            <DialogContent className="sm:max-w-[600px] rounded-3xl p-0 border-none shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="p-8 space-y-8">
                    <DialogHeader>
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl font-bold">
                            {initialData ? "Editar Membro" : "Novo Membro da Equipe"}
                        </DialogTitle>
                        <DialogDescription>
                            Configure o perfil, empresa e nível de acesso do usuário.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            
                            {/* Superuser Company Selection */}
                            {isSuperuser && (
                                <div className="p-4 bg-muted/30 rounded-xl border border-muted space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Building2 className="h-4 w-4 text-primary" />
                                        <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Empresa Vinculada</h4>
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="company"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="sr-only">Empresa</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-background">
                                                            <SelectValue placeholder="Selecione a empresa..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {companies?.map((company: any) => (
                                                            <SelectItem key={company.id} value={String(company.id)}>
                                                                {company.name} ({company.slug})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription className="text-xs">
                                                    Este usuário pertencerá exclusivamente a esta empresa.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

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

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Username</FormLabel>
                                            <FormControl>
                                                <Input placeholder="john.doe" className="h-11 rounded-xl" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
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
                            </div>

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                                            {initialData ? "Nova Senha (Opcional)" : "Senha Provisória"}
                                        </FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                                <Input 
                                                    type="password" 
                                                    placeholder={initialData ? "Deixe em branco para manter" : "Defina uma senha segura"} 
                                                    className="h-11 rounded-xl pl-10" 
                                                    {...field} 
                                                />
                                            </div>
                                        </FormControl>
                                        <FormDescription className="text-[10px]">
                                            {initialData 
                                                ? "Preencha apenas se desejar alterar a senha do usuário." 
                                                : "O usuário poderá alterar esta senha no primeiro acesso."}
                                        </FormDescription>
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
                                                            <div className="flex flex-col items-start py-1">
                                                                <span className="font-bold">{role.name}</span>
                                                                <span className="text-xs text-muted-foreground">{role.description?.substring(0, 50)}...</span>
                                                            </div>
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

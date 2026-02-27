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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { notify } from "@/lib/notifications"
import { Shield, Lock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Role } from "@/types"

const formSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
    description: z.string().optional(),
    permissions: z.array(z.string()),
})

interface Permission {
    id: string
    label: string
    description?: string
}

interface RoleFormProps {
    initialData?: Role | null
    onSuccess: () => void
    onCancel: () => void
}

export function RoleForm({ initialData, onSuccess, onCancel }: RoleFormProps) {
    const { data: availablePermissions = [], isLoading: isLoadingPermissions } = useQuery<Permission[]>({
        queryKey: ['available-permissions'],
        queryFn: async () => {
            const { data } = await api.get<Permission[]>('/api/accounts/roles/permissions/')
            return data
        }
    })

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
        <div className="p-8 space-y-8">
            <DialogHeader>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
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
                            <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
                            <h4 className="text-sm font-bold">Permissões de Acesso</h4>
                        </div>

                        {isLoadingPermissions ? (
                            <div className="flex flex-col gap-3" role="status" aria-live="polite" aria-label="Carregando permissões disponíveis">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-20 rounded-2xl bg-muted/10 animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <FormField
                                control={form.control}
                                name="permissions"
                                render={({ field }) => {
                                    const togglePermission = (permissionId: string) => {
                                        const current = field.value || []
                                        const next = current.includes(permissionId)
                                            ? current.filter((id: string) => id !== permissionId)
                                            : [...current, permissionId]
                                        field.onChange(next)
                                    }

                                    return (
                                        <div className="grid grid-cols-1 gap-3">
                                            {availablePermissions.map((permission) => (
                                                <div
                                                    key={permission.id}
                                                    className={cn(
                                                        "flex flex-row items-center space-x-3 space-y-0 p-4 rounded-2xl border transition-all cursor-pointer hover:border-primary/50",
                                                        field.value?.includes(permission.id) ? "bg-primary/5 border-primary/30" : "bg-muted/10 border-transparent"
                                                    )}
                                                    onClick={() => togglePermission(permission.id)}
                                                >
                                                    <Checkbox
                                                        checked={field.value?.includes(permission.id)}
                                                        onCheckedChange={() => { }} // Row click handles it
                                                        className="h-5 w-5 rounded-lg border-2 pointer-events-none"
                                                    />
                                                    <div className="space-y-1">
                                                        <FormLabel className="text-sm font-bold cursor-pointer">
                                                            {permission.label}
                                                        </FormLabel>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            {permission.description}
                                                        </p>
                                                    </div>
                                                    {field.value?.includes(permission.id) && (
                                                        <CheckCircle2 className="h-4 w-4 text-primary ml-auto" aria-hidden="true" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )
                                }}
                            />


                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-background -mx-8 -mb-8 p-8 border-t">
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
    )
}

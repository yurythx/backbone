"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { toast } from "sonner"
import { Loader2, User, Save } from "lucide-react"

const profileSchema = z.object({
    first_name: z.string().min(2, "Mínimo de 2 caracteres"),
    last_name: z.string().min(2, "Mínimo de 2 caracteres"),
    email: z.string().email().readonly(),
    username: z.string().min(3).readonly(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function ProfilePage() {
    const queryClient = useQueryClient()

    const { data: me, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const res = await api.get('/api/accounts/users/me/')
            return res.data
        }
    })

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        values: {
            first_name: me?.first_name || "",
            last_name: me?.last_name || "",
            email: me?.email || "",
            username: me?.username || "",
        },
    })

    // We need an endpoint to update user profile. 
    // Assuming PATCH /api/accounts/users/me/ or similar exists or we use the specific update endpoint
    // Usually ModelViewSet provides partial_update at detail URL.
    // Since 'me' is a custom action, let's check or try standard update on ID.

    const mutation = useMutation({
        mutationFn: async (values: ProfileFormValues) => {
            // Using the user ID to update. 'me' endpoint might not support PATCH directly depending on viewset
            // But let's try assuming standard UserViewSet allows patch on specific ID
            await api.patch(`/api/accounts/users/${me.id}/`, {
                first_name: values.first_name,
                last_name: values.last_name
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] })
            toast.success("Perfil atualizado com sucesso!")
        },
        onError: (error) => {
            toast.error("Erro ao atualizar perfil. Tente novamente.")
            console.error(error)
        }
    })

    function onSubmit(data: ProfileFormValues) {
        if (!me?.id) return
        mutation.mutate(data)
    }

    if (isLoading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h3 className="text-lg font-medium">Perfil do Usuário</h3>
                <p className="text-sm text-muted-foreground">
                    Gerencie suas informações pessoais e de exibição.
                </p>
            </div>
            <div className="h-[1px] bg-border" />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Usuário</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled className="bg-muted" />
                                    </FormControl>
                                    <FormDescription>
                                        Seu nome de usuário único no sistema.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled className="bg-muted" />
                                    </FormControl>
                                    <FormDescription>
                                        Email utilizado para login e notificações.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="first_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Seu nome" {...field} />
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
                                    <FormLabel>Sobrenome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Seu sobrenome" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Alterações
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}

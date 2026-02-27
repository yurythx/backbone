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
import { Mail, Shield, Loader2 } from "lucide-react"
import { Role } from "@/types"

const formSchema = z.object({
    email: z.string().email("Email inválido."),
    role: z.string().min(1, "O papel de acesso é obrigatório."),
})

interface InviteFormProps {
    roles?: Role[]
    onSuccess: () => void
    onCancel: () => void
}

export function InviteForm({ roles, onSuccess, onCancel }: InviteFormProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            role: "",
        },
    })

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            await api.post('/api/accounts/invitations/', {
                ...values,
                role: parseInt(values.role)
            })
        },
        onSuccess: () => {
            notify.success("Convite enviado!", "O convite foi enviado para o email informado.")
            onSuccess()
        },
        onError: (error: unknown) => {
            notify.error("Erro ao enviar convite", error)
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
                            <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl font-bold">
                            Convidar Membro
                        </DialogTitle>
                        <DialogDescription>
                            O novo membro receberá um link por email para configurar a conta.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Endereço de Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="pessoa@exemplo.com" className="h-11 rounded-xl" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Papel de Acesso</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none focus:ring-2 focus:ring-primary/20">
                                                    <SelectValue placeholder="Escolha um nível de acesso..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl border-none shadow-xl">
                                                {roles?.map((role) => (
                                                    <SelectItem key={role.id} value={String(role.id)} className="cursor-pointer">
                                                        {role.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription className="text-[10px] italic flex items-center gap-1 mt-2">
                                            <Shield className="h-3 w-3" /> As permissões do papel serão aplicadas automaticamente.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-3 pt-6 border-t -mx-8 -mb-8 p-8">
                                <Button variant="ghost" type="button" onClick={onCancel} className="rounded-xl h-11 px-6 font-semibold">
                                    Sair
                                </Button>
                                <Button type="submit" disabled={mutation.isPending} className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20 font-bold min-w-[140px]">
                                    {mutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                                        </>
                                    ) : "Enviar Convite"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

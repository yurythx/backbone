"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { User as UserType } from "@/types"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, User, Mail, UserCheck, Save } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { AvatarUpload } from "@/components/avatar-upload"

const profileSchema = z.object({
  username: z.string().min(2, "O nome de usuário deve ter pelo menos 2 caracteres."),
  email: z.string().email("Endereço de e-mail inválido."),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

export function ProfileForm() {
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<UserType>('/api/accounts/users/me/')
      return res.data
    }
  })

  // Schema now accepts File or string for avatar
  const extendedSchema = profileSchema.extend({
    avatar: z.union([z.instanceof(File), z.string(), z.null()]).optional()
  })

  const form = useForm<z.infer<typeof extendedSchema>>({
    resolver: zodResolver(extendedSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      avatar: null,
    },
    values: user ? {
      username: user.username,
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      avatar: user.avatar || null,
    } : undefined
  })

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof extendedSchema>) => {
      const formData = new FormData()
      formData.append('username', values.username)
      if (values.firstName) formData.append('first_name', values.firstName)
      if (values.lastName) formData.append('last_name', values.lastName)

      // Avatar handling
      if (values.avatar instanceof File) {
        formData.append('avatar', values.avatar)
      } else if (values.avatar === null && user?.avatar) {
        // Handle removal if needed, but for now we just support update
        // To support deletion we might need a separate flag or empty string logic in backend
      }

      await api.patch('/api/accounts/users/me/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] }) // Update global auth context
      toast.success("Perfil atualizado com sucesso!")
    },
    onError: (error) => {
      toast.error("Falha ao atualizar perfil")
      console.error(error)
    }
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  function onSubmit(values: z.infer<typeof extendedSchema>) {
    mutation.mutate(values)
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Dados Pessoais</CardTitle>
            <CardDescription>Gerencie suas informações de acesso e exibição.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">

            {/* Avatar Section */}
            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <AvatarUpload
                      value={field.value}
                      onChange={field.onChange}
                      initials={user?.username?.substring(0, 2).toUpperCase()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Usuário</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input placeholder="seu.usuario" className="pl-10 h-11" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>Seu nome de identificação no sistema.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input placeholder="seu@email.com" className="pl-10 h-11" {...field} disabled />
                      </div>
                    </FormControl>
                    <FormDescription>O e-mail não pode ser alterado diretamente.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primeiro Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sobrenome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Silva" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" size="lg" className="px-8 shadow-lg shadow-primary/20" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

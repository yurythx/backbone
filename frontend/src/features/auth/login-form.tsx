"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { api } from "@/lib/axios"
import { AuthResponse } from "@/types"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2, Building2 } from "lucide-react"
import { toast } from "sonner"

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
  companySlug: z.string().min(1, {
    message: "Por favor, selecione uma empresa.",
  }),
})

interface Company {
  name: string
  slug: string
}

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch companies for the selector
  const { data: companies, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['public-companies'],
    queryFn: async () => {
      const res = await api.get<Company[]>('/api/core/companies/public_list/')
      return res.data
    }
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      companySlug: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)

    try {
      // 1. Set Company Slug (Required for headers)
      localStorage.setItem('companySlug', values.companySlug)

      // 2. Login Request
      const response = await api.post<AuthResponse>('/api/accounts/token/', {
        username: values.username,
        password: values.password,
      })

      // 3. Save Tokens
      localStorage.setItem('accessToken', response.data.access)
      localStorage.setItem('refreshToken', response.data.refresh)

      // 4. Notify theme config to refresh in the same tab
      window.dispatchEvent(new Event('app-login'))

      // 5. Redirect
      router.push('/')
      toast.success("Login realizado com sucesso!")
    } catch (err: any) {
      console.error(err)
      const message = err.response?.data?.detail || "Credenciais inválidas ou erro de conexão."
      setError(message)
      toast.error(message)
      localStorage.removeItem('companySlug') // Clean up on fail
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="companySlug"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="h-14 bg-background border-primary/20 ring-offset-background focus:ring-primary/30 text-lg transition-all hover:border-primary/40">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <SelectValue placeholder={isLoadingCompanies ? "Buscando empresas..." : "Escolha sua empresa"} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.slug} value={company.slug} className="py-3 cursor-pointer">
                          <div className="flex flex-col">
                            <span className="font-semibold text-base">{company.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage className="text-xs ml-1" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Usuário"
                      className="h-12 bg-background/50 border-muted-foreground/20 focus:bg-background transition-colors"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Senha"
                      className="h-12 bg-background/50 border-muted-foreground/20 focus:bg-background transition-colors"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive-foreground font-medium bg-destructive p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <div className="h-1.5 w-1.5 rounded-full bg-destructive-foreground animate-pulse" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Acessando...
              </>
            ) : (
              "Entrar agora"
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
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
import { Loader2, Building2, User, Lock, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  username: z.string().min(2, {
    message: "O nome de usuário deve ter pelo menos 2 caracteres.",
  }),
  password: z.string().min(6, {
    message: "A senha deve ter pelo menos 6 caracteres.",
  }),
  companySlug: z.string().min(1, {
    message: "Por favor, selecione uma empresa para acessar.",
  }),
})

interface Company {
  name: string
  slug: string
  logo?: string | null
}

interface LoginFormProps {
  onCompanyChange?: (company: Company | null) => void
}

export function LoginForm({ onCompanyChange }: LoginFormProps) {
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

  useEffect(() => {
    const savedCompany = typeof window !== 'undefined' ? localStorage.getItem('companySlug') : null
    if (savedCompany && companies) {
      form.setValue('companySlug', savedCompany)
      // Attempt to set initial branding if companies are loaded
      const found = companies.find(c => c.slug === savedCompany)
      if (found && onCompanyChange) {
        onCompanyChange(found)
      }
    }
  }, [form, companies, onCompanyChange])

  // Handle manual selection change
  const handleCompanyChange = (slug: string) => {
    form.setValue('companySlug', slug)
    const company = companies?.find(c => c.slug === slug)
    if (onCompanyChange) {
      onCompanyChange(company || null)
    }
    
    // Update company context immediately to trigger theme reload
    localStorage.setItem('companySlug', slug)
    window.dispatchEvent(new Event('app-company-changed'))
  }

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

      // 5. Redirect and Force Reload
      toast.success("Login realizado com sucesso! Bem-vindo de volta.")
      
      // Forçar reload completo para garantir que todos os contextos (Header, React Query, Theme)
      // sejam reidratados corretamente com o novo usuário logado.
      // Isso corrige o problema de "não carregar elementos" no primeiro login.
      window.location.href = '/'
    } catch (err: any) {
      console.error(err)

      let message = "Ocorreu um erro inesperado. Tente novamente."
      if (err.response) {
        const status = err.response.status
        if (status === 401) {
          message = "Usuário ou senha incorretos."
        } else if (status === 400) {
          message = "Dados inválidos. Verifique se a empresa foi selecionada."
        } else if (status === 500) {
          message = "Erro no servidor. Nossa equipe já foi notificada."
        } else if (status === 403) {
          message = "Sua conta não tem permissão para acessar esta empresa."
        }
      } else if (err.request) {
        message = "Sem conexão com o servidor. Verifique sua internet."
      }

      setError(message)
      toast.error("Falha no Login", {
        description: message,
      })

      // Only clear company if it seems like a tenant issue (404/400)
      if (err.response?.status === 404) {
        localStorage.removeItem('companySlug')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
          if (errors.companySlug) {
            toast.error("Empresa obrigatória", { description: "Por favor, selecione uma empresa para continuar." })
          } else if (errors.username || errors.password) {
            toast.error("Dados incompletos", { description: "Preencha usuário e senha para entrar." })
          }
        })} className="space-y-4">
          <FormField
            control={form.control}
            name="companySlug"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Select onValueChange={handleCompanyChange} value={field.value}>
                    <SelectTrigger className="h-14 bg-background border-primary/20 ring-offset-background focus:ring-primary/30 text-lg transition-all hover:border-primary/40" aria-label="Selecionar empresa">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                        <SelectValue placeholder={isLoadingCompanies ? "Buscando empresas..." : "Escolha sua empresa"} />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-background text-foreground border border-primary/20 shadow-xl rounded-xl">
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

          <div className="space-y-3">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
                      <Input
                        placeholder="Nome de usuário"
                        className="h-12 pl-12 bg-background/90 border-muted-foreground/20 focus:bg-background transition-all"
                        aria-label="Nome de usuário"
                        {...field}
                      />
                    </div>
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
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
                      <Input
                        type="password"
                        placeholder="Sua senha secreta"
                        className="h-12 pl-12 bg-background/90 border-muted-foreground/20 focus:bg-background transition-all"
                        aria-label="Senha"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive font-medium bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-2 group"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Autenticando...
              </>
            ) : (
              <span className="flex items-center gap-2">
                Acessar Portal
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}

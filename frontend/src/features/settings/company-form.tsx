"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Company } from "@/types"
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
import { Loader2, Building2, Globe, Palette, Save } from "lucide-react"
import { toast } from "sonner"
import { useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"

const companySchema = z.object({
  name: z.string().min(2, "O nome da empresa deve ter pelo menos 2 caracteres."),
  domain: z.string().regex(/^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/, "Insira um domínio válido (ex: app.acme.com)").optional().or(z.literal("")),
  branding: z.object({
    primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Insira um código Hex válido (ex: #000000)").optional().or(z.literal("")),
    logoUrl: z.string().url("Insira um URL de imagem válido").optional().or(z.literal("")),
  }).optional(),
})

export function CompanyForm() {
  const queryClient = useQueryClient()
  const slug = typeof window !== 'undefined' ? localStorage.getItem('companySlug') : null

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', slug],
    queryFn: async ({ signal }) => {
      if (!slug) return null
      const res = await api.get<Company>(`/api/core/companies/${slug}/`, { signal })
      return res.data
    },
    enabled: !!slug
  })

  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      domain: "",
      branding: {
        primaryColor: "#000000",
        logoUrl: "",
      },
    }
  })

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        domain: company.domain || "",
        branding: {
          primaryColor: company.branding?.primaryColor || "#000000",
          logoUrl: company.branding?.logoUrl || "",
        }
      })
    }
  }, [company, form])

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof companySchema>) => {
      if (!slug) throw new Error("A identificação da empresa não foi encontrada.")
      await api.patch(`/api/core/companies/${slug}/`, values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] })
      toast.success("Configurações da empresa atualizadas!")
    },
    onError: (error) => {
      toast.error("Falha ao salvar configurações")
      console.error(error)
    }
  })

  if (isLoading) {
    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="px-0 space-y-6">
          <Skeleton className="h-12 w-full max-w-2xl" />
          <Skeleton className="h-12 w-full max-w-2xl" />
          <Skeleton className="h-12 w-32" />
        </CardContent>
      </Card>
    )
  }

  if (!company) return null

  function onSubmit(values: z.infer<typeof companySchema>) {
    mutation.mutate(values)
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Perfil da Organização</CardTitle>
            <CardDescription>Configure a identidade visual e domínio da sua empresa.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
            <div className="space-y-6 p-6 border rounded-2xl bg-muted/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Building2 className="h-24 w-24" />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Nome da Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome Comercial" className="h-11 bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Domínio Personalizado</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input placeholder="app.suaempresa.com" className="pl-10 h-11 bg-background" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Configure o CNAME do seu domínio apontando para <b>app.backbone.com</b>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6 p-6 border rounded-2xl bg-primary/5 relative overflow-hidden">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Branding e Cores
              </h3>

              <FormField
                control={form.control}
                name="branding.primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Cor Primária (Hexadecimal)</FormLabel>
                    <FormControl>
                      <div className="flex gap-3">
                        <div
                          className="w-11 h-11 rounded-xl border shadow-sm transition-transform hover:scale-105"
                          style={{ backgroundColor: field.value || '#000000' }}
                        />
                        <div className="relative flex-1 group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-muted-foreground">#</span>
                          <Input placeholder="EE00FF" className="pl-7 h-11 bg-background font-mono uppercase" {...field} onChange={(e) => {
                            let val = e.target.value;
                            if (!val.startsWith('#')) val = '#' + val;
                            field.onChange(val);
                          }} value={field.value?.replace('#', '')} />
                        </div>
                      </div>
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

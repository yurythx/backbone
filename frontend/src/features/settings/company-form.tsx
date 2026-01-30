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
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useEffect } from "react"

const companySchema = z.object({
  name: z.string().min(2, "Company name is required."),
  domain: z.string().optional(),
  branding: z.object({
    primaryColor: z.string().optional(),
    logoUrl: z.string().optional(),
  }).optional(),
})

export function CompanyForm() {
  const queryClient = useQueryClient()
  // We need the slug to fetch the company. 
  // In a real app, we might get this from the user profile or context.
  // Here we use localStorage as stored during login.
  const slug = typeof window !== 'undefined' ? localStorage.getItem('companySlug') : null

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', slug],
    queryFn: async () => {
      if (!slug) return null
      const res = await api.get<Company>(`/api/core/companies/${slug}/`)
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
        primaryColor: "",
        logoUrl: "",
      },
    }
  })

  // Update form when data loads
  useEffect(() => {
    if (company) {
        form.reset({
            name: company.name,
            domain: company.domain || "",
            branding: {
                primaryColor: company.branding?.primaryColor || "",
                logoUrl: company.branding?.logoUrl || "",
            }
        })
    }
  }, [company, form])

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof companySchema>) => {
      if (!slug) throw new Error("No company slug")
      await api.patch(`/api/core/companies/${slug}/`, values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] })
      toast.success("Company settings updated")
    },
    onError: (error) => {
        toast.error("Failed to update company settings")
        console.error(error)
    }
  })

  function onSubmit(values: z.infer<typeof companySchema>) {
    mutation.mutate(values)
  }

  if (isLoading) return <div>Loading company settings...</div>
  if (!company) return null // Or some empty state

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Settings</CardTitle>
        <CardDescription>Manage your organization details and branding.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Custom Domain</FormLabel>
                  <FormControl>
                    <Input placeholder="app.acme.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your custom domain for white-labeling.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="branding.primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color (Hex)</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                            <div 
                                className="w-10 h-10 rounded border" 
                                style={{ backgroundColor: field.value || '#000000' }}
                            />
                            <Input placeholder="#000000" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Company Settings
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCRM } from "./use-crm"
import { Plus } from "lucide-react"

const dealSchema = z.object({
  title: z.string().min(1, "O título é obrigatório"),
  description: z.string().optional(),
  contact: z.string().min(1, "Selecione um contato"),
  stage: z.string().min(1, "Selecione o estágio inicial"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  closing_date: z.string().optional(),
})

type DealFormValues = z.infer<typeof dealSchema>

export function CreateDealModal() {
  const [open, setOpen] = useState(false)
  const { contacts, pipelines, createDeal } = useCRM()
  
  // Pega o primeiro estágio do primeiro pipeline por padrão
  const defaultStage = pipelines[0]?.stages[0]?.id.toString()

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      stage: defaultStage || "",
    }
  })

  const onSubmit = async (data: DealFormValues) => {
    try {
      await createDeal.mutateAsync({
        title: data.title,
        description: data.description,
        contact: parseInt(data.contact),
        stage: parseInt(data.stage),
        priority: data.priority,
        closing_date: data.closing_date || undefined
      })
      setOpen(false)
      form.reset()
    } catch {
       // Handled by hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="glass-primary shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" /> Novo Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass overflow-hidden">
        <DialogHeader>
          <DialogTitle>Novo Card no CRM</DialogTitle>
          <DialogDescription>
            Crie um novo chamado ou negócio no seu pipeline.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título / Assunto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Manutenção Servidor Matriz..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente / Lead</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contacts.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">Baixa</SelectItem>
                        <SelectItem value="MEDIUM">Média</SelectItem>
                        <SelectItem value="HIGH">Alta</SelectItem>
                        <SelectItem value="URGENT">Urgente / Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="closing_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Limite (SLA) - Sincroniza com Agenda</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
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
                  <FormLabel>Anotações Técnicas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva os detalhes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
               <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
               <Button type="submit" disabled={createDeal.isPending}>
                 {createDeal.isPending ? "Criando..." : "Salvar Card"}
               </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

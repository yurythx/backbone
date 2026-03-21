import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { toast } from "sonner"

export interface Contact {
  id: number
  uuid: string
  name: string
  email?: string
  phone?: string
  company_name?: string
}

export interface Stage {
  id: number
  pipeline: number
  name: string
  order: number
}

export interface Pipeline {
  id: number
  name: string
  description?: string
  stages: Stage[]
}

export interface Deal {
  id: number
  uuid: string
  title: string
  description?: string
  contact: number
  contact_name: string
  stage: number
  stage_name: string
  value: string
  closing_date?: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  owner: number
  is_closed: boolean
}

export function useCRM() {
  const queryClient = useQueryClient()

  // Pipelines e Estágios
  const { data: pipelines = [], isLoading: isLoadingPipelines } = useQuery({
    queryKey: ['crm-pipelines'],
    queryFn: async () => {
      const response = await api.get<Pipeline[]>('/api/crm/pipelines/')
      return response.data
    }
  })

  // Deals (Cards do Kanban)
  const { data: deals = [], isLoading: isLoadingDeals } = useQuery({
    queryKey: ['crm-deals'],
    queryFn: async () => {
      const response = await api.get<Deal[]>('/api/crm/deals/')
      return response.data
    }
  })

  // Contatos
  const { data: contacts = [] } = useQuery({
    queryKey: ['crm-contacts'],
    queryFn: async () => {
      const response = await api.get<Contact[]>('/api/crm/contacts/')
      return response.data
    }
  })

  // Mutations
  const createDeal = useMutation({
    mutationFn: async (newDeal: Partial<Deal>) => {
      const response = await api.post('/api/crm/deals/', newDeal)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] }) // Sincronização!
      toast.success("Card criado com sucesso!")
    }
  })

  const updateDeal = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Deal> & { id: number }) => {
      const response = await api.patch(`/api/crm/deals/${id}/`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-deals'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success("Progresso atualizado!")
    },
    onError: () => {
      toast.error("Erro ao mover card.")
    }
  })

  return {
    pipelines,
    deals,
    contacts,
    isLoading: isLoadingPipelines || isLoadingDeals,
    createDeal,
    updateDeal
  }
}

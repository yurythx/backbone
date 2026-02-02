"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Plan, License } from "@/types"
import { PlanCard } from "@/features/licensing/plan-card"
import { useToast } from "@/hooks/use-toast"
import { H2, P } from "@/components/ui/typography"

export default function LicensingPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch Plans
  const { data: plans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await api.get<Plan[]>('/api/licensing/plans/')
      return res.data
    }
  })

  // Fetch Current License
  const { data: license, isLoading: isLoadingLicense } = useQuery({
    queryKey: ['my-license'],
    queryFn: async () => {
      const res = await api.get<License[]>('/api/licensing/my-license/')
      return res.data[0] || null
    }
  })

  // Improve plan change mutation (mocked for now as we don't have payment gateway)
  const changePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      // In a real app, this would redirect to Stripe checkout or call an upgrade endpoint
      // For now, we mock an update
      await new Promise(resolve => setTimeout(resolve, 1000))

      // We can't actually change the plan without backend logic to create new license
      // So this is a placeholder
      throw new Error("Integração com pagamento não implementada.")
    },
    onError: (error: Error) => {
      toast({
        title: "Upgrade Indisponível",
        description: "A mudança automática de plano requer integração com gateway de pagamento.",
        variant: "destructive"
      })
    }
  })

  if (isLoadingPlans || isLoadingLicense) {
    return <div className="p-8 text-center text-muted-foreground">Carregando planos...</div>
  }

  return (
    <div className="space-y-12 max-w-6xl mx-auto p-6 pb-20">
      <div className="text-center space-y-4">
        <H2 className="border-none text-3xl lg:text-4xl text-primary">Planos e Preços</H2>
        <P className="text-muted-foreground max-w-2xl mx-auto text-lg mt-0">
          Escolha o plano ideal para escalar o seu negócio. Mude a qualquer momento.
        </P>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
        {plans?.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={license?.plan === plan.id}
            onUpgrade={(planId) => changePlanMutation.mutate(planId)}
            isLoading={changePlanMutation.isPending}
          />
        ))}
      </div>

      <div className="bg-muted/50 rounded-lg p-6 text-center text-sm text-muted-foreground">
        <p>
          Precisa de um plano customizado para sua empresa? <a href="#" className="underline hover:text-primary">Fale com nosso time de vendas</a>.
        </p>
      </div>
    </div>
  )
}

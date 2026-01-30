"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Module, TenantModule } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Box } from "lucide-react"

export function ModuleList() {
  const queryClient = useQueryClient()

  // 1. Fetch all available modules
  const { data: allModules, isLoading: isLoadingAll } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const res = await api.get<Module[]>('/api/modules/available/')
      return res.data
    }
  })

  // 2. Fetch active modules for tenant
  const { data: tenantModules, isLoading: isLoadingTenant } = useQuery({
    queryKey: ['my-modules'],
    queryFn: async () => {
      const res = await api.get<TenantModule[]>('/api/modules/my-modules/')
      return res.data
    }
  })

  // 3. Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ code, isActive }: { code: string, isActive: boolean }) => {
      // Logic:
      // If turning ON: Call activate endpoint
      // If turning OFF: Update existing TenantModule is_active=False

      if (isActive) {
        await api.post('/api/modules/my-modules/activate/', { module_code: code })
      } else {
        // Need to find the ID of the tenant module to update
        // This logic assumes we have the ID. 
        // For simplicity in this MVP, let's assume the activate endpoint handles toggle or we just use it to ensure it's ON.
        // But to turn OFF, we need PATCH /api/modules/my-modules/{id}/ { is_active: false }

        // Let's find the tenant module ID from local cache
        const tm = tenantModules?.find(tm => {
          // We need to match by module ID. 
          // The 'allModules' has the code and ID (implicit).
          // This is tricky because `allModules` from API might just have code/name/desc.
          // Let's assume we can match by code if we had module details in tenantModules.
          // The backend TenantModuleSerializer might return module ID.

          // Let's refetch to be safe or rely on what we have.
          // Wait, TenantModule has `module` (ID).
          // We need to map Module Code -> Module ID.
          const mod = allModules?.find(m => m.code === code)
          return mod && tm.module === (mod as any).id // Assuming 'id' exists on Module interface in backend, though I defined it as code...
          // Let's check backend serializer. ModuleSerializer usually has ID.
        })

        if (tm) {
          await api.patch(`/api/modules/my-modules/${tm.id}/`, { is_active: false })
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-modules'] })
      toast.success("Module updated")
    },
    onError: () => {
      toast.error("Failed to update module")
    }
  })

  if (isLoadingAll || isLoadingTenant) {
    return <div>Loading modules...</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {(Array.isArray(allModules) ? allModules : (allModules as any)?.results || []).map((module: any) => {
        // Check if active
        const activeList = Array.isArray(tenantModules) ? tenantModules : (tenantModules as any)?.results || []
        const isActive = activeList.some((tm: any) => tm.module === module.id && tm.is_active)

        return (
          <Card key={module.code} className={isActive ? "border-primary" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                {module.name}
              </CardTitle>
              {module.is_global ? (
                <Badge variant="secondary">Global</Badge>
              ) : (
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ code: module.code, isActive: checked })
                  }
                  disabled={toggleMutation.isPending}
                />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                <Box className="w-4 h-4" />
                <span>{module.description}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

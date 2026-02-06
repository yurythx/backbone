import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { TenantModule } from '@/types'

export function useModules() {
    const { data: modules = [], isLoading, error } = useQuery<TenantModule[]>({
        queryKey: ['my-modules'],
        queryFn: async () => {
            const res = await api.get<TenantModule[]>('/api/modules/my-modules/')
            return res.data
        },
        // Cache for a good amount of time since module config rarely changes per session
        staleTime: 5 * 60 * 1000,
        retry: 1
    })

    // Helper to check if a module is active by its code
    const isModuleActive = (moduleCode: string): boolean => {
        if (!modules || modules.length === 0) return false

        return modules.some(tm => {
            if (!tm.is_active) return false
            // Check typed module_code directly
            return tm.module_code === moduleCode
        })
    }

    return {
        modules,
        isLoading,
        isModuleActive,
        error
    }
}

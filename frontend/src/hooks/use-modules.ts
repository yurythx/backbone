import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { TenantModule } from '@/types'

export function useModules() {
    const { data: rawData, isLoading, error } = useQuery<any>({
        queryKey: ['my-modules'],
        queryFn: async () => {
            const res = await api.get<any>('/api/modules/my-modules/')
            return res.data
        },
        staleTime: 5 * 60 * 1000,
        retry: 1
    })

    // Extract modules array safely
    const modules: TenantModule[] = Array.isArray(rawData)
        ? rawData
        : (rawData && typeof rawData === 'object' && Array.isArray(rawData.results))
            ? rawData.results
            : []

    /**
     * Helper to check if a module is active by its code
     */
    const isModuleActive = (moduleCode: string): boolean => {
        if (!modules || modules.length === 0) return false

        return modules.some((tm: any) => {
            if (!tm || typeof tm !== 'object') return false
            return tm.is_active === true && tm.module_code === moduleCode
        })
    }

    return {
        modules,
        isLoading,
        isModuleActive,
        error
    }
}

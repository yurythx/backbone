import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { User } from '@/types'

export function useAuth() {
    const queryClient = useQueryClient()

    const effectiveCompany = useMemo(() => {
        if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_COMPANY_SLUG || 'unknown'
        return localStorage.getItem('companySlug') || process.env.NEXT_PUBLIC_COMPANY_SLUG || 'unknown'
    }, [])

    const { data: user, isLoading, error } = useQuery<User | null>({
        queryKey: ['auth', 'user', effectiveCompany],
        queryFn: async () => {
            if (typeof window === 'undefined') return null
            const token = localStorage.getItem('accessToken')
            if (!token) return null

            try {
                const res = await api.get<User>('/api/accounts/users/me/')
                return res.data
            } catch {
                // If 401, maybe clear token? For now just return null
                return null
            }
        },
        staleTime: 30_000,
        retry: false
    })

    useEffect(() => {
        if (typeof window === 'undefined') return
        const handler = () => {
            queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
        }
        window.addEventListener('app-company-changed', handler)
        return () => window.removeEventListener('app-company-changed', handler)
    }, [queryClient])

    return {
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        error
    }
}

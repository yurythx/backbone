import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { User } from '@/types'

export function useAuth() {
    const { data: user, isLoading, error } = useQuery<User | null>({
        queryKey: ['auth', 'user'],
        queryFn: async () => {
            const token = localStorage.getItem('accessToken')
            if (!token) return null

            try {
                const res = await api.get<User>('/api/accounts/users/me/')
                return res.data
            } catch (err) {
                // If 401, maybe clear token? For now just return null
                return null
            }
        },
        staleTime: Infinity, // User data rarely changes during session
        retry: false
    })

    return {
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        error
    }
}

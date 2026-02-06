import { useAuth } from "@/hooks/use-auth"

export function usePermission() {
    const { user } = useAuth()

    const hasPermission = (permissionSlug: string): boolean => {
        if (!user) return false

        // Superuser has all permissions
        if (user.is_superuser) return true

        // Check if user has role and permissions
        if (!user.role_details || !user.role_details.permissions) {
            return false
        }

        return user.role_details.permissions.includes(permissionSlug)
    }

    const hasRole = (roleName: string): boolean => {
        if (!user) return false
        if (user.is_superuser) return true // Superuser passes role checks too? usually yes or handled separately

        return user.role_details?.name === roleName
    }

    return {
        hasPermission,
        hasRole,
        userRole: user?.role_details
    }
}

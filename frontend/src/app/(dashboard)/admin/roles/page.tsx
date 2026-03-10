"use client"

import { RoleList } from "@/features/roles/role-list"
import { Protected } from "@/components/auth/protected"

export default function RolesPage() {
    return (
        <Protected requiredPermissions={['admin.user_manage']}>
            <div className="max-w-5xl mx-auto py-8">
                <RoleList />
            </div>
        </Protected>
    )
}

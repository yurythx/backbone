"use client"

import { UserList } from "@/features/users/user-list"
import { Protected } from "@/components/auth/protected"

export default function UsersPage() {
    return (
        <Protected requiredPermissions={['admin.user_manage']}>
            <div className="max-w-5xl mx-auto py-8">
                <UserList />
            </div>
        </Protected>
    )
}

"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Plus, Edit, User as UserIcon, MoreVertical, Shield, Mail, Trash2, Clock, Building2 } from "lucide-react"
import { useState } from "react"
import { UserForm } from "./user-form"
import { InviteForm } from "./invite-form"
import { notify } from "@/lib/notifications"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function UserList() {
    const [isUserFormOpen, setIsUserFormOpen] = useState(false)
    const [isInviteFormOpen, setIsInviteFormOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<any>(null)
    const queryClient = useQueryClient()

    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/api/accounts/users/')
            const data = res.data.results || res.data
            return Array.isArray(data) ? data : []
        }
    })

    const { data: invites, isLoading: invitesLoading } = useQuery({
        queryKey: ['invites'],
        queryFn: async () => {
            const res = await api.get('/api/accounts/invitations/')
            const data = res.data.results || res.data
            return Array.isArray(data) ? data : []
        }
    })

    const { data: roles } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const res = await api.get('/api/accounts/roles/')
            const data = res.data.results || res.data
            return Array.isArray(data) ? data : []
        }
    })

    const safeUsers = Array.isArray(users) ? users : []
    const safeInvites = Array.isArray(invites) ? invites : []
    const safeRoles = Array.isArray(roles) ? roles : []

    const cancelInviteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/api/accounts/invitations/${id}/`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invites'] })
            notify.success("Convite cancelado")
        }
    })

    const deleteUserMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/api/accounts/users/${id}/`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            notify.success("Usuário removido com sucesso")
        },
        onError: (error) => {
            notify.error("Erro ao remover usuário", error)
        }
    })

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Equipe e Membros</h2>
                    <p className="text-muted-foreground text-sm">Gerencie quem tem acesso ao dashboard da sua empresa.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsInviteFormOpen(true)} className="rounded-xl border-primary/20 hover:bg-primary/5">
                        <Mail className="mr-2 h-4 w-4" /> Convidar Membro
                    </Button>
                    <Button onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }} className="shadow-lg shadow-primary/20 rounded-xl">
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Direto
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList className="bg-muted/50 p-1 rounded-xl mb-4">
                    <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">
                        Membros Ativos ({safeUsers.length})
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">
                        Convites Pendentes ({safeInvites.filter((i: any) => i && i.status === 'pending').length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="py-4">Usuário</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Papel</TableHead>
                                    <TableHead>Empresa</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {safeUsers.length > 0 ? safeUsers.map((user: any) => (
                                    <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-background shadow-sm">
                                                    <UserIcon className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{user.first_name} {user.last_name}</span>
                                                    <span className="text-xs text-muted-foreground">@{user.username}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">{user.email}</TableCell>
                                        <TableCell>
                                            {user.role_details ? (
                                                <Badge variant="outline" className="gap-1.5 border-primary/20 bg-primary/5 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                    <Shield className="h-3 w-3" />
                                                    {user.role_details.name}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Sem papel definido</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {user.company ? (
                                                <Badge variant="secondary" className="gap-1.5 rounded-lg text-[10px] font-medium">
                                                    <Building2 className="h-3 w-3" />
                                                    {typeof user.company === 'object' ? user.company.name : `Empresa #${user.company}`}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                                    <DropdownMenuItem onClick={() => { setEditingUser(user); setIsUserFormOpen(true); }} className="cursor-pointer">
                                                        <Edit className="mr-2 h-4 w-4 text-muted-foreground" /> Editar
                                                    </DropdownMenuItem>
                                                    {user.id !== currentUser.id && (
                                                        <DropdownMenuItem 
                                                            onClick={() => {
                                                                if (confirm("Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.")) {
                                                                    deleteUserMutation.mutate(user.id)
                                                                }
                                                            }} 
                                                            className="text-destructive focus:text-destructive cursor-pointer"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Remover
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                            Nenhum usuário encontrado para esta empresa.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="pending">
                    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="py-4">Email</TableHead>
                                    <TableHead>Papel Atribuído</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {safeInvites.map((invite: any) => (
                                    <TableRow key={invite.id} className="group hover:bg-muted/30 transition-colors">
                                        <TableCell className="py-4 font-medium">{invite.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                {invite.role_name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="capitalize text-[10px] font-bold rounded-lg bg-orange-100 text-orange-700 border-none">
                                                {invite.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                                    <DropdownMenuItem onClick={() => cancelInviteMutation.mutate(invite.id)} className="text-destructive focus:text-destructive cursor-pointer">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Cancelar Convite
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {safeInvites.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                            Nenhum convite pendente.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>

            {isUserFormOpen && (
                <UserForm
                    initialData={editingUser}
                    roles={safeRoles}
                    onSuccess={() => {
                        setIsUserFormOpen(false)
                        queryClient.invalidateQueries({ queryKey: ['users'] })
                    }}
                    onCancel={() => setIsUserFormOpen(false)}
                />
            )}

            {isInviteFormOpen && (
                <InviteForm
                    roles={safeRoles}
                    onSuccess={() => {
                        setIsInviteFormOpen(false)
                        queryClient.invalidateQueries({ queryKey: ['invites'] })
                    }}
                    onCancel={() => setIsInviteFormOpen(false)}
                />
            )}
        </div>
    )
}

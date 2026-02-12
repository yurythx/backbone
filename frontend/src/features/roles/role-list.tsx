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
import { Plus, Edit, Trash2, Shield, ShieldCheck, MoreVertical } from "lucide-react"
import { useState } from "react"
import { RoleForm } from "./role-form"
import { notify } from "@/lib/notifications"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export function RoleList() {
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingRole, setEditingRole] = useState<any>(null)
    const queryClient = useQueryClient()

    const { data: roles, isLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: async ({ signal }) => {
            const res = await api.get('/api/accounts/roles/', { signal })
            return res.data
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/api/accounts/roles/${id}/`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] })
            notify.success("Papel excluído", "O papel foi removido com sucesso.")
        },
        onError: (error) => {
            notify.error("Erro ao excluir papel", error)
        }
    })

    const handleEdit = (role: any) => {
        setEditingRole(role)
        setIsFormOpen(true)
    }

    const handleAdd = () => {
        setEditingRole(null)
        setIsFormOpen(true)
    }

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando papéis de acesso...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Papéis e Acessos</h2>
                    <p className="text-muted-foreground text-sm">Gerencie quem pode fazer o quê no seu ecossistema.</p>
                </div>
                <Button onClick={handleAdd} className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" /> Novo Papel
                </Button>
            </div>

            <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="py-4">Nome do Papel</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Permissões</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles?.map((role: any) => (
                            <TableRow key={role.id} className="group hover:bg-muted/30 transition-colors">
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                        {role.is_system_role ? (
                                            <ShieldCheck className="h-4 w-4 text-primary" />
                                        ) : (
                                            <Shield className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span className="font-bold">{role.name}</span>
                                        {role.is_system_role && (
                                            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary border-none">Sistema</Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                    {role.description || "Nenhuma descrição"}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {role.permissions?.slice(0, 3).map((p: string) => (
                                            <Badge key={p} variant="outline" className="text-[10px] bg-background">
                                                {p}
                                            </Badge>
                                        ))}
                                        {role.permissions?.length > 3 && (
                                            <Badge variant="outline" className="text-[10px] bg-background">
                                                +{role.permissions.length - 3}
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="group-hover:bg-background">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                            <DropdownMenuItem onClick={() => handleEdit(role)} className="cursor-pointer">
                                                <Edit className="mr-2 h-4 w-4 text-muted-foreground" /> Editar
                                            </DropdownMenuItem>
                                            {!role.is_system_role && (
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        if (window.confirm("Tem certeza que deseja excluir este papel?")) {
                                                            deleteMutation.mutate(role.id)
                                                        }
                                                    }}
                                                    className="text-destructive focus:text-destructive cursor-pointer"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
                    <RoleForm
                        key={editingRole ? `edit-${editingRole.id}` : 'create-new'}
                        initialData={editingRole}
                        onSuccess={() => {
                            setIsFormOpen(false)
                            queryClient.invalidateQueries({ queryKey: ['roles'] })
                        }}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}

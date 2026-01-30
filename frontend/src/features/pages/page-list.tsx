"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Page } from "@/types"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, MoreHorizontal, Layout } from "lucide-react"
import { format } from "date-fns"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PageListProps {
    onEdit: (page: Page) => void
    onCreate: () => void
}

export function PageList({ onEdit, onCreate }: PageListProps) {
    const queryClient = useQueryClient()

    const { data: pages, isLoading } = useQuery({
        queryKey: ['pages'],
        queryFn: async () => {
            const res = await api.get<Page[]>('/api/pages/')
            return res.data
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/api/pages/${id}/`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pages'] })
        }
    })

    const columns: ColumnDef<Page>[] = [
        {
            accessorKey: "title",
            header: "Título",
        },
        {
            accessorKey: "slug",
            header: "Slug",
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }) => {
                const isActive = row.getValue("is_active")
                return (
                    <div className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-yellow-600'}`}>
                        {isActive ? "Ativa" : "Inativa"}
                    </div>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const page = row.original

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onEdit(page)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    if (confirm('Tem certeza?')) deleteMutation.mutate(page.id)
                                }}
                                className="text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Páginas Institucionais</h2>
                <Button onClick={onCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Nova Página
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={pages || []}
                isLoading={isLoading}
                searchKey="title"
            />
        </div>
    )
}

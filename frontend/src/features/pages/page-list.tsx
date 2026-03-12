"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Page } from "@/types"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react"
import dynamic from "next/dynamic"
import type { ColumnDef } from "@tanstack/react-table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton"

const DataTable = dynamic(
    () => import("@/components/ui/data-table").then((m) => m.DataTable),
    {
        ssr: false,
        loading: () => (
            <div className="rounded-2xl border border-primary/5 bg-card/30 p-4 shadow-sm space-y-4" role="status" aria-live="polite" aria-label="Carregando tabela de páginas">
                <Skeleton className="h-10 w-72 rounded-xl" />
                <TableSkeleton rows={7} columns={3} />
            </div>
        ),
    }
)

interface PageListProps {
    onEdit: (page: Page) => void
    onCreate: () => void
}

export function PageList({ onEdit, onCreate }: PageListProps) {
    const queryClient = useQueryClient()

    const { data: pages, isLoading } = useQuery<Page[] | { results: Page[] }>({
        queryKey: ['pages'],
        queryFn: async () => {
            const res = await api.get<Page[] | { results: Page[] }>('/api/pages/')
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
                            <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Abrir menu de ações">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onEdit(page)}>
                                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    if (confirm('Tem certeza?')) deleteMutation.mutate(page.id)
                                }}
                                className="text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" /> Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    return (
        <div className="space-y-4" role={isLoading ? "status" : undefined} aria-live={isLoading ? "polite" : undefined} aria-label={isLoading ? "Carregando páginas" : undefined}>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Páginas Institucionais</h2>
                <Button onClick={onCreate}>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Nova Página
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={Array.isArray(pages) ? pages : (pages?.results ?? [])}
                isLoading={isLoading}
                searchKey="title"
            />
        </div>
    )
}

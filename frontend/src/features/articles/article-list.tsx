"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Article, Category } from "@/types"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Eye, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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

interface ArticleListProps {
  onEdit: (article: Article) => void
  onCreate: () => void
}

export function ArticleList({ onEdit, onCreate }: ArticleListProps) {
  const queryClient = useQueryClient()

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const res = await api.get<any>('/api/articles/articles/')
      // Handle both paginated and non-paginated responses
      return Array.isArray(res.data) ? res.data : res.data.results || []
    }
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<any>('/api/articles/categories/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/articles/articles/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    }
  })

  const getCategoryName = (id: number | null) => {
    if (!id || !categories) return "-"
    return (categories as Category[]).find((c: Category) => c.id === id)?.name || "-"
  }

  const columns: ColumnDef<Article>[] = [
    {
      accessorKey: "title",
      header: "Title",
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => getCategoryName(row.getValue("category")),
    },
    {
      accessorKey: "is_published",
      header: "Status",
      cell: ({ row }) => {
        const isPublished = row.getValue("is_published")
        return (
          <Badge variant={isPublished ? "default" : "secondary"}>
            {isPublished ? "Published" : "Draft"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => format(new Date(row.getValue("created_at")), 'PP'),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const article = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(article)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (confirm('Are you sure?')) deleteMutation.mutate(article.id)
                }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
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
        <h2 className="text-2xl font-bold tracking-tight">Articles</h2>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Article
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={articles || []}
        isLoading={isLoading}
        searchKey="title"
      />
    </div>
  )
}

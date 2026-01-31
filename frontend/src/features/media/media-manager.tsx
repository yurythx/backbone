"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api as axios } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Upload, Trash2, Image as ImageIcon, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface MediaItem {
    id: string
    file_url: string
    title: string
    file_type: string
    file_size: number
    created_at: string
}

interface MediaManagerProps {
    onSelect?: (url: string) => void
    selectable?: boolean
}

export function MediaManager({ onSelect, selectable }: MediaManagerProps) {
    const queryClient = useQueryClient()
    const [uploading, setUploading] = useState(false)

    const { data: mediaItems, isLoading } = useQuery({
        queryKey: ["media"],
        queryFn: async () => {
            const response = await axios.get("/api/media/files/")
            // Handle potential pagination
            return Array.isArray(response.data) ? response.data : response.data.results || []
        },
    })

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("title", file.name)
            const response = await axios.post("/api/media/files/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["media"] })
            toast.success("Arquivo enviado com sucesso!")
            setUploading(false)
        },
        onError: () => {
            toast.error("Erro ao enviar arquivo.")
            setUploading(false)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/api/media/files/${id}/`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["media"] })
            toast.success("Arquivo removido.")
        },
    })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setUploading(true)
            uploadMutation.mutate(file)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Biblioteca de Mídia</h2>
                    <p className="text-muted-foreground">Gerencie seus uploads e imagens do ecossistema.</p>
                </div>
                <div className="relative">
                    <input
                        type="file"
                        className="hidden"
                        id="media-upload"
                        onChange={handleFileChange}
                        accept="image/*"
                        disabled={uploading}
                    />
                    <label htmlFor="media-upload">
                        <Button asChild disabled={uploading}>
                            <span>
                                {uploading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                Fazer Upload
                            </span>
                        </Button>
                    </label>
                </div>
            </div>

            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {mediaItems?.map((item: MediaItem) => (
                        <Card key={item.id} className="group relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                            <CardContent className="p-0 aspect-square relative">
                                {item.file_type.startsWith("image/") ? (
                                    <img
                                        src={item.file_url}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                                        <span className="text-[10px] mt-2 px-2 text-center truncate w-full">
                                            {item.title}
                                        </span>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    {selectable ? (
                                        <Button size="icon" variant="secondary" onClick={() => onSelect?.(item.file_url)}>
                                            <CheckCircle2 className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                deleteMutation.mutate(item.id)
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {mediaItems?.length === 0 && (
                        <div className="col-span-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                            <p>Nenhuma mídia encontrada.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

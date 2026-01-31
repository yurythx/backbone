"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface PreviewDialogProps {
    title: string
    content: string
    excerpt?: string
    image?: string
    categoryName?: string
    authorName?: string
    date?: string
    type: 'article' | 'page'
}

export function PreviewDialog({
    title,
    content,
    excerpt,
    image,
    categoryName,
    authorName,
    date,
    type
}: PreviewDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" type="button">
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-4 mb-6">
                    <DialogTitle>Preview do Conteúdo</DialogTitle>
                </DialogHeader>

                <div className="bg-background text-foreground">
                    {type === 'article' ? (
                        <article className="max-w-3xl mx-auto py-4">
                            <header className="space-y-4 mb-8">
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    {categoryName && (
                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">
                                            {categoryName}
                                        </span>
                                    )}
                                    {date && <span>{date}</span>}
                                    {authorName && <span>Por {authorName}</span>}
                                </div>
                                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
                                    {title || "Sem Título"}
                                </h1>
                                {excerpt && (
                                    <p className="text-xl text-muted-foreground leading-relaxed italic border-l-4 pl-6 border-primary/20">
                                        {excerpt}
                                    </p>
                                )}
                            </header>

                            {image && (
                                <div className="aspect-video relative rounded-xl overflow-hidden mb-8 shadow-lg">
                                    <img src={image} alt={title} className="object-cover w-full h-full" />
                                </div>
                            )}

                            <div
                                className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary hover:prose-a:underline"
                                dangerouslySetInnerHTML={{ __html: content || "<p className='text-muted-foreground'>Sem conteúdo para exibir.</p>" }}
                            />
                        </article>
                    ) : (
                        <div className="max-w-3xl mx-auto py-4">
                            <header className="mb-8">
                                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                                    {title || "Sem Título"}
                                </h1>
                                <div className="h-1.5 w-20 bg-primary rounded-full" />
                            </header>

                            <div
                                className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary hover:prose-a:underline"
                                dangerouslySetInnerHTML={{ __html: content || "<p className='text-muted-foreground'>Sem conteúdo para exibir.</p>" }}
                            />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

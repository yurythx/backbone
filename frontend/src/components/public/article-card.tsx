"use client"

import Link from "next/link"
import { Article } from "@/types"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Clock } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface PublicArticleCardProps {
    article: Article
}

export function PublicArticleCard({ article }: PublicArticleCardProps) {
    return (
        <Link href={`/p/artigos/${article.slug}`}>
            <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow border-none bg-muted/20">
                <div className="aspect-video relative overflow-hidden bg-muted">
                    {article.image ? (
                        <img
                            src={article.image}
                            alt={article.title}
                            className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/50">
                            Sem Imagem
                        </div>
                    )}
                </div>
                <CardHeader className="p-4 space-y-2">
                    {article.category_name && (
                        <Badge variant="secondary" className="w-fit">
                            {article.category_name}
                        </Badge>
                    )}
                    <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                    </h3>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <p className="text-muted-foreground line-clamp-3 text-sm">
                        {article.excerpt || "Sem resumo disponível."}
                    </p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(article.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-1 text-primary font-medium">
                        Ler mais →
                    </div>
                </CardFooter>
            </Card>
        </Link>
    )
}

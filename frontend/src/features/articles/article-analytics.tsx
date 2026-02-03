"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, TrendingUp, Eye, FileText, Calendar } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function ArticleAnalytics() {
    const { data, isLoading } = useQuery({
        queryKey: ['article-analytics'],
        queryFn: async () => {
            const res = await api.get('/api/articles/articles/analytics/')
            return res.data
        }
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const { total_articles, total_views, most_viewed, views_by_date } = data

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-morphism">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total de Artigos</p>
                                <h3 className="text-3xl font-bold mt-1">{total_articles}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <FileText className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-morphism">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Visualizações Totais</p>
                                <h3 className="text-3xl font-bold mt-1">{total_views.toLocaleString()}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Eye className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-morphism">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Taxa de Engajamento</p>
                                <h3 className="text-3xl font-bold mt-1">
                                    {total_articles > 0 ? (total_views / total_articles).toFixed(1) : 0}
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-1">Views por artigo</p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-morphism lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Tendência de Visualizações
                        </CardTitle>
                        <CardDescription>Visualizações nos últimos 15 dias</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={views_by_date}>
                                    <defs>
                                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        labelFormatter={(label) => format(new Date(label), 'dd MMMM yyyy', { locale: ptBR })}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        name="Visualizações"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorViews)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-morphism lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            Conteúdos em Destaque
                        </CardTitle>
                        <CardDescription>Artigos com maior volume de tráfego</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6 mt-4">
                            {most_viewed.map((article: any, index: number) => (
                                <div key={article.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold group-hover:bg-primary/20 transition-colors">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm line-clamp-1">{article.title}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{article.slug}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-sm font-bold">{article.total_views}</p>
                                            <p className="text-[10px] text-muted-foreground">Views totais</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-green-500">+{article.views_last_30_days}</p>
                                            <p className="text-[10px] text-muted-foreground">30 dias</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

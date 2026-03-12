'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';

interface Comment {
    id: number;
    content: string;
    created_at: string;
    author_name?: string | null;
    name?: string | null;
}

interface PublicArticleCommentsProps {
    articleId: number;
    companySlug?: string | null;
}

export function PublicArticleComments({ articleId, companySlug }: PublicArticleCommentsProps) {
    const { data, isLoading } = useQuery({
        queryKey: ['public-article-comments', articleId, companySlug],
        queryFn: async ({ signal }) => {
            const res = await api.get<Comment[] | { results: Comment[] }>('/api/articles/public/comments/', {
                params: { article: articleId },
                headers: companySlug ? { 'X-Company-Slug': companySlug } : {},
                signal,
            });
            return Array.isArray(res.data) ? res.data : (res.data.results || []);
        },
        enabled: Number.isFinite(articleId) && articleId > 0,
        staleTime: 30_000,
        retry: 1,
    });

    const comments = Array.isArray(data) ? data : [];

    return (
        <section className="mt-12 pt-10 border-t border-border/50" aria-label="Comentários">
            <div className="space-y-6">
                <div className="space-y-1">
                    <h2 className="text-lg font-bold">Comentários</h2>
                    <p className="text-sm text-muted-foreground">Veja o que outras pessoas estão dizendo.</p>
                </div>

                {isLoading && (
                    <div className="space-y-4" role="status" aria-live="polite" aria-label="Carregando comentários">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-primary/10 bg-background/95 p-5 space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <Skeleton className="h-4 w-40 rounded-lg" />
                                    <Skeleton className="h-4 w-20 rounded-lg" />
                                </div>
                                <Skeleton className="h-4 w-full rounded-lg" />
                                <Skeleton className="h-4 w-5/6 rounded-lg" />
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && comments.length === 0 && (
                    <div className="rounded-3xl border-2 border-dashed bg-muted/10 p-10 text-center">
                        <p className="text-sm text-muted-foreground font-medium">Seja o primeiro a comentar</p>
                    </div>
                )}

                {!isLoading && comments.length > 0 && (
                    <div className="space-y-4" role="list" aria-label={`${comments.length} comentários`}>
                        {comments.map((c) => {
                            const dt = new Date(c.created_at);
                            const dateLabel = Number.isNaN(dt.getTime())
                                ? ''
                                : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(dt);
                            const displayName = (c.author_name || c.name || 'Anônimo').trim();

                            return (
                                <div key={c.id} role="listitem" className="rounded-2xl border border-primary/10 bg-background/95 backdrop-blur p-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="font-semibold truncate">{displayName}</div>
                                        <div className="text-xs text-muted-foreground">{dateLabel}</div>
                                    </div>
                                    <div className="mt-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                        {c.content}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}


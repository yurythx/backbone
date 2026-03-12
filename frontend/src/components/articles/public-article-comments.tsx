'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { showApiError } from '@/lib/toast-helpers';
import { toast } from 'sonner';

interface Comment {
    id: number;
    content: string;
    created_at: string;
    author_name?: string | null;
    name?: string | null;
}

interface PublicArticleCommentsProps {
    articleId: number;
    articleSlug?: string | null;
    companySlug?: string | null;
}

export function PublicArticleComments({ articleId, articleSlug, companySlug }: PublicArticleCommentsProps) {
    const queryClient = useQueryClient();
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [content, setContent] = React.useState('');
    const [submitted, setSubmitted] = React.useState(false);

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

    const createMutation = useMutation({
        mutationFn: async () => {
            const trimmed = content.trim();
            if (!trimmed) throw new Error('Conteúdo do comentário é obrigatório.');

            const payload: Record<string, unknown> = {
                content: trimmed,
            };
            if (articleSlug) payload.article_slug = articleSlug;
            else payload.article = articleId;
            if (name.trim()) payload.name = name.trim();
            if (email.trim()) payload.email = email.trim();

            const res = await api.post('/api/articles/public/comments/', payload, {
                headers: companySlug ? { 'X-Company-Slug': companySlug } : {},
            });
            return res.data;
        },
        onSuccess: () => {
            setContent('');
            setSubmitted(true);
            toast.success('Comentário enviado', { description: 'Ele ficará visível após aprovação.' });
            queryClient.invalidateQueries({ queryKey: ['public-article-comments', articleId, companySlug] });
        },
        onError: (err) => {
            showApiError(err, 'Erro ao enviar comentário.');
        },
    });

    return (
        <section className="mt-12 pt-10 border-t border-border/50" aria-label="Comentários">
            <div className="space-y-6">
                <div className="space-y-1">
                    <h2 className="text-lg font-bold">Comentários</h2>
                    <p className="text-sm text-muted-foreground">Veja o que outras pessoas estão dizendo.</p>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-background/95 backdrop-blur p-5 space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold">Deixe seu comentário</h3>
                        <p className="text-xs text-muted-foreground">Comentários passam por moderação antes de aparecer.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Nome (opcional)</div>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Email (opcional)</div>
                            <Input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                inputMode="email"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Comentário</div>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Escreva seu comentário..."
                            className="min-h-[120px]"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                            {submitted ? 'Enviado para moderação.' : ''}
                        </div>
                        <Button
                            onClick={() => createMutation.mutate()}
                            disabled={createMutation.isPending || !content.trim()}
                            className="rounded-xl"
                        >
                            Enviar
                        </Button>
                    </div>
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

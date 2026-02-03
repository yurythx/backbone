"use client"

import { Bell, Check, MessageSquare, Info, AlertTriangle, ExternalLink, ChevronRight } from "lucide-react"
import { useNotifications, Notification } from "@/hooks/use-notifications"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import Link from "next/link"

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

    const getIcon = (type: Notification['notification_type']) => {
        switch (type) {
            case 'message': return <MessageSquare className="h-4 w-4 text-blue-500" />
            case 'approval': return <Check className="h-4 w-4 text-green-500" />
            default: return <Info className="h-4 w-4 text-primary" />
        }
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full h-10 w-10 border bg-muted/30 hover:bg-muted/50 transition-all shadow-sm group"
                >
                    <motion.div
                        animate={unreadCount > 0 ? {
                            rotate: [0, 15, -15, 15, -15, 0],
                        } : {}}
                        transition={{
                            repeat: Infinity,
                            duration: 2,
                            repeatDelay: 5
                        }}
                    >
                        <Bell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </motion.div>

                    <AnimatePresence>
                        {unreadCount > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -top-1 -right-1"
                            >
                                <Badge className="h-5 min-w-[20px] px-1 flex items-center justify-center bg-destructive text-destructive-foreground border-2 border-background font-bold text-[10px] animate-pulse">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Badge>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden glass-morphism border-0 shadow-2xl mt-2">
                <div className="p-4 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-black text-sm uppercase tracking-tighter">Notificações</span>
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] font-bold h-5 px-1.5">{unreadCount} novas</Badge>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] h-7 font-bold text-primary hover:bg-primary/10"
                            onClick={() => markAllAsRead()}
                        >
                            Marcar lidas
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[350px]">
                    <div className="flex flex-col">
                        <AnimatePresence initial={false}>
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                    <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                                        <Bell className="h-6 w-6 text-muted-foreground/30" />
                                    </div>
                                    <h4 className="font-bold text-sm">Tudo limpo por aqui</h4>
                                    <p className="text-xs text-muted-foreground">Você não tem notificações no momento.</p>
                                </div>
                            ) : (
                                notifications.map((notification, index) => (
                                    <motion.div
                                        key={notification.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={cn(
                                            "p-4 border-b border-border/30 last:border-0 hover:bg-primary/5 transition-colors cursor-pointer relative group",
                                            !notification.is_read && "bg-primary/5"
                                        )}
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1">
                                                <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center shadow-sm">
                                                    {getIcon(notification.notification_type)}
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h5 className={cn(
                                                        "text-sm font-bold leading-none truncate",
                                                        !notification.is_read ? "text-foreground" : "text-muted-foreground"
                                                    )}>
                                                        {notification.title}
                                                    </h5>
                                                    <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                {notification.link && (
                                                    <Link
                                                        href={notification.link}
                                                        className="inline-flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest mt-2 hover:underline"
                                                    >
                                                        Ver detalhe <ExternalLink className="h-2 w-2" />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                        {!notification.is_read && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </ScrollArea>

                <div className="p-2 border-t border-border/50 bg-muted/20">
                    <Button variant="ghost" asChild className="w-full text-[10px] font-black uppercase tracking-widest h-8 hover:bg-primary/5 group">
                        <Link href="/notificacoes" className="flex items-center justify-center gap-2">
                            Ver histórico completo
                            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

"use client"

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/axios';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BBA-PLACEHOLDER-FOR-VAPID-PUBLIC-KEY-MUST-BE-65-CHARS-LONG-BASE64';

function urlBase64ToUint8Array(base64String: string) {
    try {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    } catch (error) {
        console.error('Invalid VAPID public key format:', error);
        throw new Error('VAPID_PUBLIC_KEY contains invalid characters');
    }
}

export function PushNotificationManager() {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            checkSubscription();
        }
    }, []);

    async function checkSubscription() {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setSubscription(sub);
    }

    async function subscribe() {
        try {
            // Validate VAPID key before attempting subscription
            if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.includes('PLACEHOLDER')) {
                toast.error('Push notifications não estão configuradas no servidor.');
                console.error('VAPID_PUBLIC_KEY is not configured properly');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Send to backend
            const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('p256dh')!) as any));
            const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('auth')!) as any));

            await api.post('/notifications/push-subscriptions/', {
                endpoint: sub.endpoint,
                p256dh,
                auth,
                browser: navigator.userAgent.split(' ').pop(),
                device: navigator.platform
            });

            setSubscription(sub);
            toast.success('Notificações ativadas com sucesso!');
        } catch (error) {
            console.error('Failed to subscribe to push', error);
            toast.error('Erro ao ativar notificações.');
        }
    }

    if (!isSupported) return null; // Don't show if not supported
    if (subscription) return null; // Don't show if already subscribed
    
    // Check if VAPID key is configured, otherwise don't show the prompt
    if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.includes('PLACEHOLDER')) {
        return null; 
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-w-sm animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-semibold text-sm mb-1">Deseja receber notificações?</h3>
            <p className="text-xs text-slate-500 mb-3">Fique por dentro de novas mensagens e artigos em tempo real.</p>
            <div className="flex gap-2">
                <Button size="sm" onClick={subscribe}>Ativar</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsSupported(false)}>Agora não</Button>
            </div>
        </div>
    );
}

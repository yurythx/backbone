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
    return null;
}

"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "./theme-provider"
import { useState, useEffect } from "react"
import { Toaster } from "sonner"
import { PushNotificationManager } from "./notifications/PushNotificationManager"

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => console.log('SW scope:', registration.scope))
        .catch((err) => console.log('SW registration failed:', err));
    }
  }, []);

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
      }
    }
  }))

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <PushNotificationManager />
        <Toaster
          position="bottom-right"
          expand={true}
          richColors
          closeButton
          theme="system"
          toastOptions={{
            style: {
              borderRadius: '12px',
              padding: '16px',
            },
            className: "font-sans",
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

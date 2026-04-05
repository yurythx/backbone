"use client"

import { QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { ThemeProvider } from "./theme-provider"
import { useState, useEffect } from "react"
import { Toaster } from "sonner"

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  get length() {
    return 0
  },
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {})

        .catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('SW registration failed:', err)
          }
        });
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

  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
    })
  )

  return (
    <PersistQueryClientProvider 
      client={queryClient}
      persistOptions={{ persister }}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
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
          }}
        />
      </ThemeProvider>
    </PersistQueryClientProvider>
  )
}

"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { useThemeConfig } from "@/hooks/use-theme-config"

interface ThemeContextType {
  logo: string;
  icon: string;
  companyName: string;
  currentPalette: string;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
  updatePalette: (palette: string) => Promise<any>;
  resetToTenantTheme: () => Promise<any>;
}

const ThemeConfigContext = React.createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = React.useContext(ThemeConfigContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const themeConfig = useThemeConfig()

  // Inject palette into standard HTML attribute for CSS selection
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-palette", themeConfig.currentPalette)
    }
  }, [themeConfig.currentPalette])

  // Optional: Update Favicon dynamically
  React.useEffect(() => {
    if (typeof window !== "undefined" && themeConfig.icon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'shortcut icon'
        document.getElementsByTagName('head')[0].appendChild(link)
      }
      link.href = themeConfig.icon
    }
  }, [themeConfig.icon])

  return (
    <ThemeConfigContext.Provider value={{
      logo: themeConfig.logo,
      icon: themeConfig.icon,
      companyName: themeConfig.companyName,
      currentPalette: themeConfig.currentPalette,
      isLoading: themeConfig.isLoading,
      refreshConfig: themeConfig.refreshConfig,
      updatePalette: themeConfig.updatePalette,
      resetToTenantTheme: themeConfig.resetToTenantTheme,
    }}>
      <NextThemesProvider {...props}>
        {children}
      </NextThemesProvider>
    </ThemeConfigContext.Provider>
  )
}

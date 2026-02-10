"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"
import { useThemeConfig } from "@/hooks/use-theme-config"

interface ThemeContextType {
  logo: string;
  icon: string;
  companyName: string;
  footerText: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  customCss: string;
  customJs: string;
  socialLinks: {
    facebook: string;
    instagram: string;
    linkedin: string;
    twitter: string;
  };
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

import { getContrastColor, hexToRgb } from "@/lib/utils"

// ✅ NOVO: Componente interno para lidar com efeitos que dependem do contexto
function ThemeEffects({ themeConfig }: { themeConfig: any }) {
  const { resolvedTheme } = useNextTheme() // Agora funciona pois está dentro do Provider

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      root.setAttribute("data-palette", themeConfig.currentPalette)

      const shouldUseTenantColor = themeConfig.userTheme?.use_tenant_theme !== false;

      // Lógica de Cores Primárias
      if (shouldUseTenantColor && themeConfig.tenantTheme?.primary_color) {
        if (resolvedTheme !== 'dark') {
          const primaryHex = themeConfig.tenantTheme.primary_color
          root.style.setProperty('--primary', primaryHex);
          const foregroundHex = getContrastColor(primaryHex);
          root.style.setProperty('--primary-foreground', foregroundHex);
        } else {
          root.style.removeProperty('--primary');
          root.style.removeProperty('--primary-foreground');
        }
      } else {
        root.style.removeProperty('--primary');
        root.style.removeProperty('--primary-foreground');
      }

      // Lógica de Cores Secundárias
      if (themeConfig.secondaryColor) {
        const secondaryHex = themeConfig.secondaryColor
        root.style.setProperty('--secondary', secondaryHex);
        const foregroundHex = getContrastColor(secondaryHex);
        root.style.setProperty('--secondary-foreground', foregroundHex);
      } else {
        root.style.removeProperty('--secondary');
        root.style.removeProperty('--secondary-foreground');
      }
      
      // ✅ CORREÇÃO: Agora resolvedTheme tem o valor correto ('dark' ou 'light')
      if (themeConfig.backgroundColor && resolvedTheme !== 'dark') {
        root.style.setProperty('--background', themeConfig.backgroundColor);
      } else {
        root.style.removeProperty('--background');
      }

      if (themeConfig.fontFamily) {
        root.style.setProperty('--font-family', `"${themeConfig.fontFamily}", sans-serif`);
      }
    }
  }, [themeConfig, resolvedTheme])

  // Google Fonts Injection
  React.useEffect(() => {
    if (typeof window !== "undefined" && themeConfig.fontFamily) {
      const fontId = 'dynamic-google-font';
      let link = document.getElementById(fontId) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      const fontName = themeConfig.fontFamily.replace(/\s+/g, '+');
      link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;500;600;700&display=swap`;
    }
  }, [themeConfig.fontFamily])

  // Favicon Injection
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

  return null
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const themeConfig = useThemeConfig()

  return (
    <ThemeConfigContext.Provider value={{
      logo: themeConfig.logo,
      icon: themeConfig.icon,
      companyName: themeConfig.companyName,
      footerText: themeConfig.footerText,
      primaryColor: themeConfig.tenantTheme?.primary_color || '#0C4B33',
      secondaryColor: themeConfig.secondaryColor,
      backgroundColor: themeConfig.backgroundColor,
      fontFamily: themeConfig.fontFamily,
      customCss: themeConfig.customCss,
      customJs: themeConfig.customJs,
      socialLinks: themeConfig.socialLinks,
      currentPalette: themeConfig.currentPalette,
      isLoading: themeConfig.isLoading,
      refreshConfig: themeConfig.refreshConfig,
      updatePalette: themeConfig.updatePalette,
      resetToTenantTheme: themeConfig.resetToTenantTheme,
    }}>
      <NextThemesProvider {...props}>
        {/* Renderiza o componente de efeitos DENTRO do provider */}
        <ThemeEffects themeConfig={themeConfig} />
        {children}
      </NextThemesProvider>
    </ThemeConfigContext.Provider>
  )
}

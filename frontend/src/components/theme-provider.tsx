"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
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

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const themeConfig = useThemeConfig()

  // Inject palette and custom colors as CSS variables
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      root.setAttribute("data-palette", themeConfig.currentPalette)

      // Inject HEX colors as CSS Variables
      if (themeConfig.tenantTheme?.primary_color) {
        root.style.setProperty('--primary', themeConfig.tenantTheme.primary_color);
      }
      if (themeConfig.secondaryColor) {
        root.style.setProperty('--secondary', themeConfig.secondaryColor);
      }
      if (themeConfig.backgroundColor) {
        root.style.setProperty('--background', themeConfig.backgroundColor);
      }
      if (themeConfig.fontFamily) {
        root.style.setProperty('--font-family', `"${themeConfig.fontFamily}", sans-serif`);
      }
    }
  }, [themeConfig.currentPalette, themeConfig.tenantTheme, themeConfig.secondaryColor, themeConfig.backgroundColor, themeConfig.fontFamily])

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
        {children}
      </NextThemesProvider>
    </ThemeConfigContext.Provider>
  )
}

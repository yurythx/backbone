"use client"

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'

import { api } from '@/lib/axios'
import { TenantBranding, UserThemePreference } from '@/types'
import { usePathname } from 'next/navigation'

export function useThemeConfig() {
    const [tenantTheme, setTenantTheme] = useState<TenantBranding | null>(null)
    const [userTheme, setUserTheme] = useState<UserThemePreference | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const pathname = usePathname()

    // Identificar se é uma rota pública (fora de /admin, /cms, etc.)
    const isPublicRoute = !pathname?.startsWith('/admin') &&
        !pathname?.startsWith('/cms') &&
        !pathname?.startsWith('/messenger') &&
        !pathname?.startsWith('/settings');

    const fetchConfig = useCallback(async () => {
        try {
            setIsLoading(true)
            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

            // Prioridade 1: Rota Pública
            if (isPublicRoute) {
                // Tentar obter branding da empresa via header X-Company-Slug (já injetado pelo axios interceptor se houver localStorage)
                // OU, se a URL tiver subdomínio ou slug, o backend deveria resolver.
                // Aqui, assumimos que o frontend tenta buscar o público sempre que possível.

                // Se temos companySlug no storage, usamos.
                const companySlug = typeof window !== 'undefined' ? localStorage.getItem('companySlug') : null
                const config = companySlug ? { headers: { 'X-Company-Slug': companySlug } } : {}

                const publicBrandingRes = await api.get('/api/core/branding/public_current/', config).catch(() => null)

                if (publicBrandingRes?.data) {
                    setTenantTheme(publicBrandingRes.data)
                    // Persist for ThemeInitScript
                    localStorage.setItem('backbone_tenant_branding', JSON.stringify(publicBrandingRes.data))
                } else {
                    setTenantTheme(null)
                }
                // Em rotas públicas, ignoramos userTheme
                setUserTheme(null)
                setIsLoading(false)
                return
            }

            // Prioridade 2: Rota Privada (com Token)
            if (token) {
                const [tenantRes, userRes] = await Promise.all([
                    api.get('/api/core/branding/current/').catch(() => null),
                    api.get('/api/accounts/preferences/theme/current/').catch(() => null)
                ])

                if (tenantRes?.data) {
                    setTenantTheme(tenantRes.data)
                    localStorage.setItem('backbone_tenant_branding', JSON.stringify(tenantRes.data))
                }
                if (userRes?.data) {
                    setUserTheme(userRes.data)
                    localStorage.setItem('backbone_user_preferences', JSON.stringify(userRes.data))
                }
            } else {
                // Sem token em rota privada (provavelmente será redirecionado), mas limpa o estado
                setTenantTheme(null)
                setUserTheme(null)
            }

        } catch (error) {
            console.error('Error fetching theme config:', error)
        } finally {
            setIsLoading(false)
        }
    }, [isPublicRoute])

    useEffect(() => {
        // Initial fetch
        fetchConfig()

        // Event listener for storage changes
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'accessToken' || e.key === 'companySlug') {
                fetchConfig()
            }
        }
        window.addEventListener('storage', handleStorageChange)

        // Custom events
        const handleLogin = () => fetchConfig()
        const handleCompanyChange = () => fetchConfig()
        window.addEventListener('app-login', handleLogin)
        window.addEventListener('app-company-changed', handleCompanyChange)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('app-login', handleLogin)
            window.removeEventListener('app-company-changed', handleCompanyChange)
        }
    }, [fetchConfig])

    const updatePalette = async (palette: string) => {
        if (isPublicRoute) return; // Não permitir update em rota pública

        try {
            const res = await api.put('/api/accounts/preferences/theme/update_current/', {
                theme_palette: palette,
                use_tenant_theme: false
            })
            setUserTheme(res.data)
            return res.data
        } catch (error) {
            console.error('Error updating user palette:', error)
            throw error
        }
    }

    const resetToTenantTheme = async () => {
        if (isPublicRoute) return;

        try {
            const res = await api.post('/api/accounts/preferences/theme/reset/')
            setUserTheme(res.data)
            return res.data
        } catch (error) {
            console.error('Error resetting to tenant theme:', error)
            throw error
        }
    }

    // Lógica de Fallback Hierárquica
    let currentPalette = 'django-green' // Default Global

    if (isPublicRoute) {
        // Público: Apenas Tema da Empresa > Default
        if (tenantTheme?.theme_palette) {
            currentPalette = tenantTheme.theme_palette
        }
    } else {
        // Privado: Preferência Usuário > Tema Empresa > Default
        if (userTheme?.use_tenant_theme === false && userTheme.theme_palette) {
            currentPalette = userTheme.theme_palette
        } else if (tenantTheme?.theme_palette) {
            currentPalette = tenantTheme.theme_palette
        }
    }

    const logo = tenantTheme?.logo_url || '/logo.svg'
    const icon = tenantTheme?.icon_url || '/favicon.ico'
    const companyName = tenantTheme?.company_name || 'Backbone'
    const footerText = tenantTheme?.footer_text || ""
    const secondaryColor = tenantTheme?.secondary_color || '#111827'
    const backgroundColor = tenantTheme?.background_color || '#FFFFFF'
    const fontFamily = tenantTheme?.font_family || 'Inter'
    const customCss = tenantTheme?.custom_css || ''
    const customJs = tenantTheme?.custom_js || ''

    const socialLinks = React.useMemo(() => ({
        facebook: tenantTheme?.facebook_url || "",
        instagram: tenantTheme?.instagram_url || "",
        linkedin: tenantTheme?.linkedin_url || "",
        twitter: tenantTheme?.twitter_url || ""
    }), [tenantTheme])

    const config = React.useMemo(() => ({
        tenantTheme,
        userTheme,
        currentPalette,
        logo,
        icon,
        companyName,
        footerText,
        secondaryColor,
        backgroundColor,
        fontFamily,
        customCss,
        customJs,
        socialLinks,
        isLoading,
        updatePalette,
        resetToTenantTheme,
        refreshConfig: fetchConfig,
        isPublicRoute
    }), [
        tenantTheme,
        userTheme,
        currentPalette,
        logo,
        icon,
        companyName,
        footerText,
        secondaryColor,
        backgroundColor,
        fontFamily,
        customCss,
        customJs,
        socialLinks,
        isLoading,
        isPublicRoute,
        fetchConfig
    ])

    return config
}



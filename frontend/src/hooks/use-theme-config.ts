"use client"

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/axios'
import { TenantBranding, UserThemePreference } from '@/types'

export function useThemeConfig() {
    const [tenantTheme, setTenantTheme] = useState<TenantBranding | null>(null)
    const [userTheme, setUserTheme] = useState<UserThemePreference | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const fetchConfig = useCallback(async () => {
        try {
            setIsLoading(true)
            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

            if (!token) {
                // Se não tem token, busca o branding público da empresa selecionada (se houver)
                const companySlug = typeof window !== 'undefined' ? localStorage.getItem('companySlug') : null
                
                // Configura o header manualmente para esta requisição pública específica
                const config = companySlug ? { headers: { 'X-Company-Slug': companySlug } } : {}
                
                const publicBrandingRes = await api.get('/api/core/branding/public_current/', config).catch(() => null)
                if (publicBrandingRes?.data) setTenantTheme(publicBrandingRes.data)
                else setTenantTheme(null) // Reset se não encontrar
                
                setIsLoading(false)
                return
            }

            const [tenantRes, userRes] = await Promise.all([
                api.get('/api/core/branding/current/').catch(() => null),
                api.get('/api/accounts/preferences/theme/current/').catch(() => null)
            ])

            if (tenantRes?.data) setTenantTheme(tenantRes.data)
            if (userRes?.data) setUserTheme(userRes.data)
        } catch (error) {
            console.error('Error fetching theme config:', error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        // Initial fetch
        fetchConfig()

        // Event listener for storage changes (handles multi-tab and login/logout)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'accessToken') {
                fetchConfig()
            }
            if (e.key === 'companySlug') {
                fetchConfig()
            }
        }
        window.addEventListener('storage', handleStorageChange)

        // Custom event for same-tab login (since storage event doesn't fire in the same window)
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
        try {
            const res = await api.post('/api/accounts/preferences/theme/reset/')
            setUserTheme(res.data)
            return res.data
        } catch (error) {
            console.error('Error resetting to tenant theme:', error)
            throw error
        }
    }

    // Hierarchical Logic
    const currentPalette = userTheme?.use_tenant_theme === false && userTheme.theme_palette
        ? userTheme.theme_palette
        : (tenantTheme?.theme_palette || 'django-green')

    const logo = tenantTheme?.logo_url || '/logo.svg' // Fallback to default
    const icon = tenantTheme?.icon_url || '/favicon.ico'
    const companyName = tenantTheme?.company_name || 'Backbone'
    const footerText = tenantTheme?.footer_text || ""
    const secondaryColor = tenantTheme?.secondary_color || '#111827'
    const backgroundColor = tenantTheme?.background_color || '#FFFFFF'
    const fontFamily = tenantTheme?.font_family || 'Inter'
    const customCss = tenantTheme?.custom_css || ''
    const customJs = tenantTheme?.custom_js || ''

    const socialLinks = {
        facebook: tenantTheme?.facebook_url || "",
        instagram: tenantTheme?.instagram_url || "",
        linkedin: tenantTheme?.linkedin_url || "",
        twitter: tenantTheme?.twitter_url || ""
    }

    return {
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
        refreshConfig: fetchConfig
    }
}

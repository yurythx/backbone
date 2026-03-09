import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Rotas que exigem autenticação (protegidas).
 * O middleware redireciona para /login se não houver token.
 */
const PROTECTED_PREFIXES = [
    '/dashboard',
    '/admin',
    '/artigos',
    '/calendar',
    '/cms',
    '/finance',
    '/insights',
    '/licensing',
    '/messenger',
    '/notificacoes',
    '/perfil',
    '/settings',
]

/**
 * Rotas completamente públicas — nunca devem exigir autenticação.
 * Usuários logados acessando /login são redirecionados para /dashboard.
 */
const PUBLIC_ONLY_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/accept-invite']

/**
 * Rotas públicas que qualquer um pode acessar (com ou sem token).
 */
const ALWAYS_PUBLIC_PREFIXES = ['/', '/p/', '/api/']

function isProtected(pathname: string): boolean {
    return PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
    )
}

function isPublicOnly(pathname: string): boolean {
    return PUBLIC_ONLY_PATHS.some(
        (path) => pathname === path || pathname.startsWith(path + '/')
    )
}

function isAlwaysPublic(pathname: string): boolean {
    // Root exact match
    if (pathname === '/') return true
    return ALWAYS_PUBLIC_PREFIXES.filter(p => p !== '/').some(
        (prefix) => pathname.startsWith(prefix)
    )
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // O middleware do Next.js não tem acesso ao localStorage (roda no Edge).
    // A estratégia é usar um cookie httpOnly chamado 'auth_token' OU ler um
    // cookie client-readable chamado 'hasSession' que é setado pelo frontend.
    // Como o sistema atual usa localStorage, usamos o cookie 'hasSession'
    // (setado pelo login-form após autenticação bem-sucedida).
    const hasSession = request.cookies.get('hasSession')?.value === 'true'

    // ── Rota protegida sem sessão → redirect para login ──────────────────────
    if (isProtected(pathname) && !hasSession) {
        const loginUrl = new URL('/login', request.url)
        // Preserva a URL original para redirect pós-login
        loginUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // ── Rota pública exclusiva com sessão ativa → redirect para dashboard ───
    if (isPublicOnly(pathname) && hasSession) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Aplica o middleware a todas as rotas EXCETO:
         * - _next/static (arquivos estáticos)
         * - _next/image (otimização de imagem)
         * - favicon.ico
         * - sw.js (service worker)
         * - Arquivos com extensão (imagens, fontes, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\..*).*)',
    ],
}

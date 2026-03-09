import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Rotas que exigem autenticação (protegidas).
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

function isProtected(pathname: string): boolean {
    return PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
    )
}

/**
 * Middleware para controlar acesso server-side baseado em cookies.
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const hasSession = request.cookies.get('hasSession')?.value === 'true'

    // LOG PARA DEBUG (visível no terminal do dev server)
    console.log(`[Middleware] ${request.method} ${pathname} | hasSession: ${hasSession}`)

    // ── Bloqueio de rotas protegidas sem sessão ──────────────────────────────
    if (isProtected(pathname) && !hasSession) {
        console.log(`[Middleware] REDIRECT protected ${pathname} -> /login`)
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // ── Prevenção de loop: Se já estamos em rota pública, não fazemos nada ──
    // IMPORTANTE: Removemos qualquer regra que redirecionava /login para /dashboard.
    // Isso garante que o login page consiga carregar mesmo se o cookie estiver "sujo".

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Aplica o middleware a todas as rotas EXCETO:
         * - _next/static, _next/image, favicon.ico, sw.js, arquivos com extensão
         */
        '/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\..*).*)',
    ],
}

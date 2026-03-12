import Link from "next/link"
import { Button } from "@/components/ui/button"

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="font-black tracking-tighter text-lg">
          Backbone
        </Link>
        <nav className="flex items-center gap-2" aria-label="Ações">
          <Button asChild variant="ghost" className="rounded-xl">
            <Link href="/p/artigos">Artigos</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-xl">
            <Link href="/login">Entrar</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}

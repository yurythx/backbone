import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/error-boundary";
import { api } from "@/lib/axios";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const res = await api.get('/api/core/companies/current/');
    const company = res.data;
    return {
      title: {
        default: company.name,
        template: `%s | ${company.name}`
      },
      description: company.description || "Modular Multi-tenant SaaS",
      icons: {
        icon: company.theme_branding?.logo || "/favicon.ico",
      }
    };
  } catch (error) {
    return {
      title: "Backbone SaaS",
      description: "Modular Multi-tenant SaaS",
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let company = null;
  try {
    const res = await api.get('/api/core/companies/current/');
    company = res.data;
  } catch (e) {
    // Default fallback
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {company?.theme_branding?.custom_css && (
          <style dangerouslySetInnerHTML={{ __html: company.theme_branding.custom_css }} />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
        {company?.theme_branding?.custom_js && (
          <script dangerouslySetInnerHTML={{ __html: company.theme_branding.custom_js }} />
        )}
      </body>
    </html>
  );
}

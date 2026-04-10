import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { SonnerToaster } from "@/components/providers/sonner-toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ERP-CRM",
  description: "Système de gestion de la relation client",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <SessionProvider>
          {children}
          <SonnerToaster />
        </SessionProvider>
      </body>
    </html>
  )
}

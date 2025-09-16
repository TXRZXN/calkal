import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { DatabaseProvider } from "@/components/database-provider"

export const metadata: Metadata = {
  title: "CalCam - บันทึกแคลจากรูป",
  description: "แอปบันทึกแคลอรี่จากรูปถ่ายอาหาร ใช้งานออฟไลน์ได้",
  generator: "CalCam PWA",
  manifest: "/manifest.json",
  themeColor: "#10b981",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CalCam",
  },
  icons: {
    icon: "/icon-192x192.jpg",
    apple: "/icon-192x192.jpg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <DatabaseProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </DatabaseProvider>
        <Analytics />
      </body>
    </html>
  )
}

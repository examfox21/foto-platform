import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FotoPlatform - Platforma dla fotografów',
  description: 'Nowoczesna platforma do udostępniania galerii fotograficznych i sprzedaży zdjęć. Mobile-first, szybka i intuicyjna.',
  keywords: 'fotograf, galeria zdjęć, sprzedaż zdjęć, sesja fotograficzna, ślub',
  authors: [{ name: 'FotoPlatform Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#3b82f6',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'FotoPlatform - Platforma dla fotografów',
    description: 'Nowoczesna platforma do udostępniania galerii fotograficznych',
    type: 'website',
    locale: 'pl_PL',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FotoPlatform" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  )
}

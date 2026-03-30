import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display, DM_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppProvider } from '@/context/AppContext'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--font-dm-serif' })
const dmMono = DM_Mono({ subsets: ['latin'], weight: '400', variable: '--font-dm-mono' })

export const metadata: Metadata = {
  title: 'BeanScan - Bean Defect Detection',
  description: 'Annotate and classify robusta bean defects using AI',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${dmSans.variable} ${dmSerif.variable} ${dmMono.variable}`}>
      <body className="font-sans antialiased">
        <AppProvider>
          {children}
        </AppProvider>
        <Analytics />
      </body>
    </html>
  )
}

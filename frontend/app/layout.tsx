import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display, DM_Mono, Space_Grotesk, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppProvider } from '@/context/AppContext'
import { AuthProvider } from '@/context/AuthContext'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--font-dm-serif' })
const dmMono = DM_Mono({ subsets: ['latin'], weight: '400', variable: '--font-dm-mono' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'DOST-CBASS',
  description: 'Annotate and classify robusta bean defects using AI',
  generator: 'v0.app',
  icons: {
    icon: '/cbass-logo.png',
    apple: '/cbass-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${dmSans.variable} ${dmSerif.variable} ${dmMono.variable} ${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        <AppProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AppProvider>
        <Analytics />
      </body>
    </html>
  )
}

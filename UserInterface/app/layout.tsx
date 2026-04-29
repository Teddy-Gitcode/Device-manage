import type { Metadata } from 'next'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { AppShell }     from '@/components/layout/AppShell'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ketepa Print Fleet',
  description: 'Print fleet monitoring and management for Ketepa Ltd',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}

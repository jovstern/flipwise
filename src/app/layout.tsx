import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SiteNav } from '@/components/SiteNav'
import './globals.css'

export const metadata: Metadata = {
  title: 'flipwise',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <header className="border-b border-gray-200">
          <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
            <span className="text-lg font-semibold">flipwise</span>
            <SiteNav />
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}

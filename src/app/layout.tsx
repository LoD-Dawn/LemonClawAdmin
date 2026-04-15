import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/providers/theme-provider'

export const metadata: Metadata = {
  title: '柠檬虾 LemonClaw - 你的超级助理 | LemonClaw',
  description: '集中管理 Skill 和 MCP 配置',
  icons: {
    icon: '/images/Logo.png',
    shortcut: '/images/Logo.png',
    apple: '/images/Logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

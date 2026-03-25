import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LemonClaw',
  description: '集中管理 Skill 和 MCP 配置',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}

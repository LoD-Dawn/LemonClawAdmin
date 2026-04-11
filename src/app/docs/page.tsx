import type { Metadata } from 'next'
import { SwaggerUiShell } from '@/components/docs/swagger-ui-shell'

export const metadata: Metadata = {
  title: 'API Docs',
  description: '面向浏览器会话、外部系统与桌面端的认证、短信登录、模型、配额和 Claw 会话 OpenAPI 文档',
}

export default function DocsPage() {
  return <SwaggerUiShell />
}

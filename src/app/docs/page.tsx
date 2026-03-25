import type { Metadata } from 'next'
import { SwaggerUiShell } from '@/components/docs/swagger-ui-shell'

export const metadata: Metadata = {
  title: 'API Docs',
  description: '面向外部系统的 Skills MCP 认证与资源 OpenAPI 文档',
}

export default function DocsPage() {
  return <SwaggerUiShell />
}

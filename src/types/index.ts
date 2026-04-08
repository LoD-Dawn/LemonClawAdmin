import { DefaultSession } from 'next-auth'
import type { AccountTypeValue } from '@/lib/default-organizations'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      phone: string | null
      accountType: AccountTypeValue
      isSuperAdmin: boolean
      organizationId: string | null
      isDepartmentAdmin: boolean
      departmentId: string | null
      requiresPhoneBinding: boolean
    } & DefaultSession['user']
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

export interface ApiError {
  error: string
  code: string
  details?: Record<string, unknown>
}

export const VISIBILITY_LABELS = {
  company: '公司级',
  department: '部门级',
  personal: '个人级'
} as const

export type Visibility = keyof typeof VISIBILITY_LABELS

export const MCP_TRANSPORT_LABELS: Record<string, string> = {
  stdio: 'stdio',
  sse: 'SSE',
  streamable_http: 'Streamable HTTP',
}

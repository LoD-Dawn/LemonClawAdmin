'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { ApplicationStatus, GrantStatus } from '@/lib/resource-access'
import { cn } from '@/lib/utils'

interface ApplyButtonProps {
  resourceType: 'skill' | 'mcp'
  resourceId: string
  applicationStatus: ApplicationStatus
  grantStatus: GrantStatus
  className?: string
}

export function ApplyButton({
  resourceType,
  resourceId,
  applicationStatus,
  grantStatus,
  className,
}: ApplyButtonProps) {
  const [isLoading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  if (grantStatus === 'granted') {
    return <Badge variant="success">已可用</Badge>
  }

  if (applicationStatus === 'pending') {
    return <Badge variant="warning">待审批</Badge>
  }

  const buttonLabel = applicationStatus === 'rejected' || applicationStatus === 'revoked'
    ? '重新申请'
    : '申请'

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(className)}
      disabled={isLoading}
      onClick={async () => {
        // Defensive check
        if (!resourceId) {
          toast({ title: '错误', description: '资源ID无效', variant: 'destructive' })
          return
        }
        setLoading(true)
        try {
          const endpoint = resourceType === 'skill'
            ? `/api/client/skills/${resourceId}/apply`
            : `/api/client/mcps/${resourceId}/apply`
          const res = await fetch(endpoint, { method: 'POST' })
          if (res.ok) {
            toast({ title: '申请已提交' })
            router.refresh()
          } else {
            // Better error handling - ensure we always show something
            let errorMessage = '申请失败'
            try {
              const error = await res.json()
              errorMessage = error.error || errorMessage
            } catch {
              // If JSON parsing fails, use status-based message
              errorMessage = `申请失败 (${res.status})`
            }
            toast({ title: '错误', description: errorMessage, variant: 'destructive' })
          }
        } catch {
          toast({ title: '错误', description: '网络错误，请重试', variant: 'destructive' })
        } finally {
          setLoading(false)
        }
      }}
    >
      {isLoading ? '提交中...' : buttonLabel}
    </Button>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ApproveButtonProps {
  applicationId: string
}

export function ApproveButton({ applicationId }: ApproveButtonProps) {
  const [isLoading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
      disabled={isLoading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/admin/applications/${applicationId}/approve`, {
            method: 'POST',
          })
          if (res.ok) {
            toast({ title: '已批准申请' })
            router.refresh()
          } else {
            const error = await res.json()
            toast({ title: '操作失败', description: error.error, variant: 'destructive' })
          }
        } catch {
          toast({ title: '操作失败', description: '批准申请时出错', variant: 'destructive' })
        } finally {
          setLoading(false)
        }
      }}
    >
      <CheckCircle className="h-4 w-4 mr-1" />
      {isLoading ? '处理中...' : '批准'}
    </Button>
  )
}

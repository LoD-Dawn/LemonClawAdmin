'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface RejectButtonProps {
  applicationId: string
}

export function RejectButton({ applicationId }: RejectButtonProps) {
  const [isLoading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
      disabled={isLoading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/admin/applications/${applicationId}/reject`, {
            method: 'POST',
          })
          if (res.ok) {
            toast({ title: '已拒绝申请' })
            router.refresh()
          } else {
            const error = await res.json()
            toast({ title: '操作失败', description: error.error, variant: 'destructive' })
          }
        } catch {
          toast({ title: '操作失败', description: '拒绝申请时出错', variant: 'destructive' })
        } finally {
          setLoading(false)
        }
      }}
    >
      <XCircle className="h-4 w-4 mr-1" />
      {isLoading ? '处理中...' : '拒绝'}
    </Button>
  )
}

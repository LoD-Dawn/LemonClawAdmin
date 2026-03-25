'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ShieldOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface RevokeButtonProps {
  applicationId: string
}

export function RevokeButton({ applicationId }: RevokeButtonProps) {
  const [isLoading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
      disabled={isLoading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/admin/applications/${applicationId}/revoke`, {
            method: 'POST',
          })
          if (res.ok) {
            toast({ title: '已撤销授权' })
            router.refresh()
          } else {
            const error = await res.json()
            toast({ title: '操作失败', description: error.error, variant: 'destructive' })
          }
        } catch {
          toast({ title: '操作失败', description: '撤销授权时出错', variant: 'destructive' })
        } finally {
          setLoading(false)
        }
      }}
    >
      <ShieldOff className="mr-1 h-4 w-4" />
      {isLoading ? '处理中...' : '撤销授权'}
    </Button>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export function GrantRevokeButton({ grantId }: { grantId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isSubmitting}
      onClick={async () => {
        setIsSubmitting(true)
        try {
          const response = await fetch(`/api/v1/admin/grants/${grantId}`, {
            method: 'DELETE',
          })
          const result = await response.json()

          if (!response.ok) {
            toast({
              title: '撤销失败',
              description: result.error || '请稍后重试',
              variant: 'destructive',
            })
            return
          }

          toast({
            title: '授权已撤销',
            description: '对应用户将立即失去该资源的使用权限。',
          })
          router.refresh()
        } catch {
          toast({
            title: '撤销失败',
            description: '请求未成功提交，请稍后重试。',
            variant: 'destructive',
          })
        } finally {
          setIsSubmitting(false)
        }
      }}
    >
      <ShieldX className="mr-2 h-4 w-4" />
      {isSubmitting ? '撤销中...' : '撤销授权'}
    </Button>
  )
}

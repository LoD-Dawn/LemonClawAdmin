'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export function GrantCreateDialog({
  open,
  onOpenChange,
  resources,
  users,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  resources: any[]
  users: any[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [resourceType, setResourceType] = useState<'skill' | 'mcp'>('skill')
  const [resourceId, setResourceId] = useState<string>('')
  const [userId, setUserId] = useState<string>(users[0]?.id ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredResources = useMemo(
    () => resources.filter((resource) => resource.resourceType === resourceType),
    [resources, resourceType]
  )

  useEffect(() => {
    if (!filteredResources.some((resource) => resource.id === resourceId)) {
      setResourceId(filteredResources[0]?.id ?? '')
    }
  }, [filteredResources, resourceId])

  useEffect(() => {
    if (!users.some((user) => user.id === userId)) {
      setUserId(users[0]?.id ?? '')
    }
  }, [users, userId])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/v1/admin/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType,
          resourceId,
          userId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          title: '授权失败',
          description: result.error || '无法完成授权操作',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: '授权已生效',
        description: '该用户现在已获得对应资源的访问权限。',
      })
      onOpenChange(false)
      router.refresh()
    } catch {
      toast({
        title: '网络错误',
        description: '授权请求提交失败，请重试。',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldPlus className="h-5 w-5 text-primary" />
            新建手工授权
          </DialogTitle>
          <DialogDescription>
            直接为指定用户授予资源访问权限，无需经过审批流程。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label>资源类型</Label>
            <Select value={resourceType} onValueChange={(value: 'skill' | 'mcp') => setResourceType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="选择资源类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skill">Skill</SelectItem>
                <SelectItem value="mcp">MCP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>目标资源</Label>
            <Select value={resourceId} onValueChange={setResourceId}>
              <SelectTrigger>
                <SelectValue placeholder={filteredResources.length === 0 ? '暂无可授权资源' : '选择资源'} />
              </SelectTrigger>
              <SelectContent>
                {filteredResources.map((resource) => (
                  <SelectItem key={resource.id} value={resource.id}>
                    {resource.name} ({resource.identifier})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>被授权用户</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder={users.length === 0 ? '暂无可授权用户' : '选择用户'} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex flex-col">
                      <span>{user.name || user.email}</span>
                      <span className="text-[10px] text-muted-foreground">{user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !resourceId || !userId}>
            {isSubmitting ? '正在提交...' : '确认发布授权'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

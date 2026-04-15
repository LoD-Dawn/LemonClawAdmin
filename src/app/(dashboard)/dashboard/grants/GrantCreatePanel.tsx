'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

type GrantableResource = {
  id: string
  name: string
  identifier: string
  resourceType: 'skill' | 'mcp'
  organizationName: string | null
}

type GrantableUser = {
  id: string
  name: string | null
  email: string
  organizationName: string | null
}

export function GrantCreatePanel({
  resources,
  users,
}: {
  resources: GrantableResource[]
  users: GrantableUser[]
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

  const isDisabled = filteredResources.length === 0 || users.length === 0 || !resourceId || !userId

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary p-2 text-primary-foreground">
            <ShieldPlus className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-lg">手工授权</CardTitle>
            <CardDescription>直接为指定用户授予资源访问权限，无需经过审批流程。</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">资源类型</Label>
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

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">目标资源</Label>
          <Select value={resourceId} onValueChange={setResourceId} disabled={filteredResources.length === 0}>
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

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">被授权用户</Label>
          <Select value={userId} onValueChange={setUserId} disabled={users.length === 0}>
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

        <div className="flex justify-end md:col-span-3 pt-2">
          <Button
            className="w-full md:w-auto"
            disabled={isDisabled || isSubmitting}
            onClick={async () => {
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
            }}
          >
            {isSubmitting ? '正在提交...' : '确认发布授权'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

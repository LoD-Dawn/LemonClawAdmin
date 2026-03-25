'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
    <Card className="border-gray-200 bg-gradient-to-br from-white to-gray-50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gray-900 p-2 text-white">
            <ShieldPlus className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">手工授权</h2>
            <p className="text-sm text-gray-500">直接为用户授予部门级 Skill 或 MCP，无需先走申请单。</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
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

        <div className="space-y-2">
          <Label>资源</Label>
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
          <Label>授权给</Label>
          <Select value={userId} onValueChange={setUserId} disabled={users.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={users.length === 0 ? '暂无可授权用户' : '选择用户'} />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                  {user.organizationName ? ` (${user.organizationName})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end md:col-span-3">
          <Button
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
                    description: result.error || '请稍后重试',
                    variant: 'destructive',
                  })
                  return
                }

                toast({
                  title: '授权已生效',
                  description: '该用户现在可以使用对应资源了。',
                })
                router.refresh()
              } catch {
                toast({
                  title: '授权失败',
                  description: '请求未成功提交，请稍后重试。',
                  variant: 'destructive',
                })
              } finally {
                setIsSubmitting(false)
              }
            }}
          >
            {isSubmitting ? '授权中...' : '确认授权'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

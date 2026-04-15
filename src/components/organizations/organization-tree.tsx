'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronDown, Building2, Users, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { isDefaultConsumerOrganizationId } from '@/lib/default-organizations'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Organization {
  id: string
  name: string
  type: string
  parentId: string | null
  level: number
  _count: { users: number; departmentUsers: number }
}

export function OrganizationTree({ organizations }: { organizations: Organization[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [parentId, setParentId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<'company' | 'department' | 'team'>('department')
  const [isLoading, setIsLoading] = useState(false)

  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const toggleExpanded = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const rootOrgs = organizations.filter(o => !o.parentId)
  const getChildren = (pid: string) => organizations.filter(o => o.parentId === pid)
  const totalUsers = organizations.reduce((sum, org) => sum + org._count.users, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parentId) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, parentId })
      })
      if (res.ok) {
        toast({ title: '组织创建成功' })
        setDialogOpen(false)
        setName('')
        setType('department')
        router.refresh()
      } else {
        const error = await res.json()
        toast({ title: '错误', description: error.error || '创建失败', variant: 'destructive' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrg) return
    setIsEditLoading(true)
    try {
      const res = await fetch(`/api/v1/organizations/${editingOrg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName })
      })
      if (res.ok) {
        toast({ title: '组织已更新' })
        setEditDialogOpen(false)
        router.refresh()
      }
    } finally {
      setIsEditLoading(false)
    }
  }

  const handleDelete = async (org: Organization) => {
    if (!confirm(`确定要删除组织"${org.name}"吗？`)) return
    setDeletingId(org.id)
    try {
      const res = await fetch(`/api/v1/organizations/${org.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: '组织已删除' })
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  const renderOrg = (org: Organization, depth: number = 0) => {
    const children = getChildren(org.id)
    const hasChildren = children.length > 0
    const isExpanded = expanded.has(org.id)
    const isDefaultConsumerOrg = isDefaultConsumerOrganizationId(org.id)
    const hasMembers = org._count.users > 0 || org._count.departmentUsers > 0
    const deleteDisabled = deletingId === org.id || hasChildren || org.type === 'company' || isDefaultConsumerOrg || hasMembers
    
    return (
      <div key={org.id}>
        <div 
          className={cn(
            "group flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors",
            depth > 0 && "mt-1"
          )}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => toggleExpanded(org.id)}
              className={cn(
                "h-6 w-6 flex items-center justify-center rounded transition-colors hover:bg-muted",
                !hasChildren && "invisible"
              )}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate text-sm">{org.name}</span>
                <Badge variant={org.type === 'company' ? 'default' : 'secondary'} className="text-[10px] h-4">
                  {org.type === 'company' ? '公司' : org.type === 'department' ? '部门' : '小组'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {org._count.users}</span>
                <span>L{org.level + 1}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => { setEditingOrg(org); setEditName(org.name); setEditDialogOpen(true); }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive"
                disabled={deleteDisabled}
                onClick={() => handleDelete(org)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs ml-1"
                disabled={isDefaultConsumerOrg}
                onClick={() => { setParentId(org.id); setDialogOpen(true); }}
            >
              +
            </Button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {children.map(child => renderOrg(child, depth + 1))}
          </div>
        ) as any}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">组织架构</CardTitle>
          <CardDescription>
            全组织共 {organizations.length} 个节点，关联 {totalUsers} 位成员。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {rootOrgs.map(org => renderOrg(org))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>添加下级</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <Select value={type} onValueChange={(v:any) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">部门</SelectItem>
                  <SelectItem value="team">小组</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? '创建中...' : '创建'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>重命名</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>新名称</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
              <Button type="submit" disabled={isEditLoading}>
                {isEditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '保存'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

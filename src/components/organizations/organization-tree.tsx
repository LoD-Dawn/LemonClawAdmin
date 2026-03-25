'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronDown, Building2, Users, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

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

  // Edit state
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [isEditLoading, setIsEditLoading] = useState(false)

  // Delete state
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
        setParentId(null)
        router.refresh()
      } else {
        const error = await res.json()
        toast({ title: '错误', description: error.error || '创建失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '错误', description: '创建失败', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (org: Organization) => {
    setEditingOrg(org)
    setEditName(org.name)
    setEditDialogOpen(true)
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
        setEditingOrg(null)
        router.refresh()
      } else {
        const error = await res.json()
        toast({ title: '错误', description: error.error || '更新失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '错误', description: '更新失败', variant: 'destructive' })
    } finally {
      setIsEditLoading(false)
    }
  }

  const handleDelete = async (org: Organization) => {
    if (org.type === 'company') {
      toast({ title: '无法删除', description: '公司架构不能删除', variant: 'destructive' })
      return
    }

    if (org._count.users > 0 || org._count.departmentUsers > 0) {
      toast({ title: '无法删除', description: '该组织下仍有关联人员，不能删除', variant: 'destructive' })
      return
    }

    if (!confirm(`确定要删除组织"${org.name}"吗？`)) return

    setDeletingId(org.id)
    try {
      const res = await fetch(`/api/v1/organizations/${org.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: '组织已删除' })
        router.refresh()
      } else {
        const error = await res.json()
        toast({ title: '错误', description: error.error || '删除失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '错误', description: '删除失败', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  const renderOrg = (org: Organization, depth: number = 0) => {
    const children = getChildren(org.id)
    const hasChildren = children.length > 0
    const isExpanded = expanded.has(org.id)
    const isCompany = org.type === 'company'
    const hasMembers = org._count.users > 0 || org._count.departmentUsers > 0
    const deleteDisabled = deletingId === org.id || hasChildren || isCompany || hasMembers
    const typeLabel = org.type === 'company' ? '公司' : org.type === 'department' ? '部门' : '小组'
    const typeVariant = org.type === 'company' ? 'default' : org.type === 'department' ? 'secondary' : 'outline'

    return (
      <div key={org.id}>
        <div
          className="group flex flex-col gap-3 rounded-[22px] border border-transparent bg-white/75 px-4 py-4 transition hover:border-slate-200 hover:bg-white sm:flex-row sm:items-center"
          style={{ marginLeft: `${depth * 18}px` }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpanded(org.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_28px_-22px_rgba(15,23,42,0.85)]">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-semibold text-slate-900">{org.name}</span>
                <Badge variant={typeVariant}>{typeLabel}</Badge>
                {hasChildren ? (
                  <span className="text-xs text-slate-400">包含 {children.length} 个下级节点</span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {org._count.users} 位成员
                </span>
                {org._count.departmentUsers > 0 ? (
                  <span>另有 {org._count.departmentUsers} 位部门管理员关联该部门</span>
                ) : null}
                <span>层级 {org.level + 1}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(org)}
              disabled={deletingId === org.id}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(org)}
              disabled={deleteDisabled}
              className={deleteDisabled ? 'opacity-50' : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              删除
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setParentId(org.id); setDialogOpen(true) }}>
              添加子组织
            </Button>
          </div>
        </div>
        {hasChildren && isExpanded ? (
          <div className="mt-3 space-y-3">
            {children.map(child => renderOrg(child, depth + 1))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="admin-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">结构视图</div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">组织树维护</h2>
          <p className="text-sm leading-6 text-slate-600">
            当前共有 {organizations.length} 个组织节点，累计关联 {totalUsers} 位成员。支持直接增删改并维护层级关系。
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>添加组织</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加组织</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>名称</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <Select value={type} onValueChange={(value) => setType(value as 'company' | 'department' | 'team')}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择组织类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">公司</SelectItem>
                    <SelectItem value="department">部门</SelectItem>
                    <SelectItem value="team">小组</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? '创建中...' : '创建'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="admin-surface p-4 sm:p-5">
        <div className="space-y-3">
          {rootOrgs.map(org => renderOrg(org))}
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑组织</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} required />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isEditLoading}>
                {isEditLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

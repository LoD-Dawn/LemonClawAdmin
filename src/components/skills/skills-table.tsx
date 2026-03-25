'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { SkillFormDialog } from './skill-form-dialog'
import { VISIBILITY_LABELS, Visibility } from '@/types'
import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2, PlusCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SkillRow {
  id: string
  name: string
  identifier: string
  description?: string | null
  descriptionEn?: string | null
  descriptionZh?: string | null
  tagsJson?: string | null
  packageUrl?: string | null
  version?: string | null
  sourceFrom?: string | null
  sourceUrl?: string | null
  sourceAuthor?: string | null
  visibility: Visibility
  canManage: boolean
  organization?: { id: string; name: string } | null
  owner?: { id: string; name: string } | null
}

interface OrganizationOption {
  id: string
  name: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export function SkillsTable({
  skills,
  organizations,
  managementMode,
  managedDepartmentId,
  onRefresh,
  pagination,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  skills: SkillRow[]
  organizations: OrganizationOption[]
  managementMode: 'super_admin' | 'department_admin' | 'personal'
  managedDepartmentId: string | null
  onRefresh: () => Promise<void>
  pagination: PaginationInfo
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<SkillRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const columns: ColumnDef<SkillRow>[] = [
    {
      accessorKey: 'name',
      header: '名称',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-slate-900">{row.original.name}</div>
          <div className="text-xs text-slate-500">{row.original.owner?.name ? `维护人：${row.original.owner.name}` : '平台维护'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'identifier',
      header: '标识符',
      cell: ({ row }) => (
        <code className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{row.original.identifier}</code>
      ),
    },
    {
      accessorKey: 'visibility',
      header: '可见性',
      cell: ({ row }) => (
        <Badge variant="outline">{VISIBILITY_LABELS[row.original.visibility]}</Badge>
      ),
    },
    {
      accessorKey: 'organization.name',
      header: '所属',
      cell: ({ row }) => row.original.organization?.name || row.original.owner?.name || '-',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (!row.original.canManage) {
          return <span className="text-xs text-muted-foreground">只读</span>
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setEditingSkill(row.original); setOpen(true) }}>
                <Pencil className="mr-2 h-4 w-4" />编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                disabled={deletingId === row.original.id}
                onClick={async () => {
                  setDeletingId(row.original.id)
                  try {
                    const res = await fetch(`/api/v1/skills/${row.original.id}`, { method: 'DELETE' })
                    if (res.ok) {
                      toast({ title: 'Skill 已删除' })
                      await onRefresh()
                    } else {
                      const error = await res.json()
                      toast({ title: '错误', description: error.error, variant: 'destructive' })
                    }
                  } catch {
                    toast({ title: '错误', description: '删除失败', variant: 'destructive' })
                  } finally {
                    setDeletingId(null)
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="admin-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">资源列表</div>
          <p className="text-sm leading-6 text-slate-600">按名称、可见范围、来源和归属统一查看 Skill 资源，便于后续持续维护。</p>
        </div>
        <Button onClick={() => { setEditingSkill(null); setOpen(true) }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          新建 Skill
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={skills}
        searchKey="name"
        searchPlaceholder="搜索名称或标识符..."
        pageCount={pagination?.pageCount ?? 1}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        totalCount={pagination?.total ?? 0}
      />
      <SkillFormDialog
        open={open}
        onOpenChange={setOpen}
        skill={editingSkill}
        organizations={organizations}
        managementMode={managementMode}
        managedDepartmentId={managedDepartmentId}
        onSuccess={onRefresh}
      />
    </div>
  )
}

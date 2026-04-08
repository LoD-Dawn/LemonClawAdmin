'use client'

import { useState } from 'react'
import { ACCOUNT_TYPE_LABELS, type AccountTypeValue } from '@/lib/default-organizations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { UserFormDialog } from './user-form-dialog'
import { UserEditDialog } from './user-edit-dialog'
import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Power, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const PROTECTED_ADMIN_EMAIL = 'admin@local.com'

type User = {
  id: string
  name: string
  email: string
  phone: string | null
  accountType: AccountTypeValue
  isSuperAdmin: boolean
  isDepartmentAdmin: boolean
  isActive: boolean
  departmentId?: string | null
  organization?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
  clawQuota?: {
    isUnlimited: boolean
    creditBalance: number
    remainingClawSeconds: number | null
    pricingVersion: string
    expiresAt: string | null
    updatedAt: string
  } | null
  usageSummary: {
    consumedCredits: number
    usedClawSeconds: number
    sessions: number
  }
}

type PaginationInfo = {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

function formatClawDuration(seconds: number) {
  if (seconds <= 0) {
    return '0 分钟'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours <= 0) {
    return `${minutes} 分钟`
  }

  if (minutes <= 0) {
    return `${hours} 小时`
  }

  return `${hours} 小时 ${minutes} 分钟`
}

export function UsersTable({
  users,
  organizations,
  onRefresh,
  pagination,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  currentUserId,
}: {
  users: User[]
  organizations: { id: string; name: string; type: string }[]
  onRefresh: () => Promise<void>
  pagination: PaginationInfo
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  currentUserId: string
}) {
  const { toast } = useToast()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: '姓名',
      cell: ({ row }) => (
        <div className="max-w-[220px]">
          <div className="truncate font-semibold text-slate-900" title={row.original.name}>
            {row.original.name}
          </div>
          <div className="truncate text-xs text-slate-500" title={row.original.email}>
            {row.original.email}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: '邮箱',
      cell: ({ row }) => (
        <span className="block max-w-[260px] truncate text-slate-500" title={row.original.email}>
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: '手机号',
      cell: ({ row }) => (
        <span className="block max-w-[160px] truncate whitespace-nowrap text-slate-500" title={row.original.phone ?? '-'}>
          {row.original.phone ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'organization.name',
      header: '组织',
      cell: ({ row }) => {
        const name = row.original.organization?.name || '-'
        return (
          <span className="block max-w-[96px] truncate" title={name}>
            {name}
          </span>
        )
      },
    },
    {
      accessorKey: 'accountType',
      header: '账号类型',
      cell: ({ row }) => (
        <Badge className="whitespace-nowrap" variant={row.original.accountType === 'enterprise' ? 'secondary' : 'outline'}>
          {ACCOUNT_TYPE_LABELS[row.original.accountType]}
        </Badge>
      ),
    },
    {
      accessorKey: 'department.name',
      header: '管理范围',
      cell: ({ row }) => {
        const name = row.original.department?.name || '-'
        return (
          <span className="block max-w-[96px] truncate" title={name}>
            {name}
          </span>
        )
      },
    },
    {
      accessorKey: 'clawQuota.creditBalance',
      header: '积分配额',
      cell: ({ row }) => {
        const quota = row.original.clawQuota

        if (quota?.isUnlimited || row.original.isSuperAdmin || row.original.isDepartmentAdmin) {
          return (
            <div className="max-w-[148px] space-y-1">
              <div className="truncate font-semibold text-slate-900" title="无限使用">无限使用</div>
              <div className="truncate text-xs text-slate-500" title="管理员角色不受积分配额限制">
                管理员角色不受积分配额限制
              </div>
            </div>
          )
        }

        if (!quota) {
          return <span className="text-sm text-slate-400">未配置</span>
        }

        return (
          <div className="max-w-[148px] space-y-1">
            <div className="truncate font-semibold text-slate-900" title={`${quota.creditBalance} 积分`}>
              {quota.creditBalance} 积分
            </div>
            <div
              className="truncate text-xs text-slate-500"
              title={`剩余约 ${formatClawDuration(quota.remainingClawSeconds ?? 0)}`}
            >
              剩余约 {formatClawDuration(quota.remainingClawSeconds ?? 0)}
            </div>
            <div className="truncate text-[11px] text-slate-400" title={quota.pricingVersion}>
              {quota.pricingVersion}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'usageSummary.consumedCredits',
      header: '使用情况',
      cell: ({ row }) => (
        <div className="max-w-[148px] space-y-1">
          <div
            className="truncate font-medium text-slate-800"
            title={`已用 ${row.original.usageSummary.consumedCredits} 积分`}
          >
            已用 {row.original.usageSummary.consumedCredits} 积分
          </div>
          <div
            className="truncate text-xs text-slate-500"
            title={`${formatClawDuration(row.original.usageSummary.usedClawSeconds)} · ${row.original.usageSummary.sessions} 次会话`}
          >
            {formatClawDuration(row.original.usageSummary.usedClawSeconds)} · {row.original.usageSummary.sessions} 次会话
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'isSuperAdmin',
      header: '角色',
      cell: ({ row }) => {
        if (row.original.isSuperAdmin) {
          return <Badge className="whitespace-nowrap">超级管理员</Badge>
        }

        if (row.original.isDepartmentAdmin) {
          return <Badge className="whitespace-nowrap" variant="secondary">部门管理员</Badge>
        }

        return (
          <Badge className="whitespace-nowrap" variant="outline">
            {row.original.accountType === 'consumer' ? '普通用户' : '普通员工'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: '状态',
      cell: ({ row }) => (
        <Badge className="whitespace-nowrap" variant={row.original.isActive ? 'default' : 'outline'}>
          {row.original.isActive ? '启用中' : '已停用'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const isProtectedUser = row.original.email === PROTECTED_ADMIN_EMAIL

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={isProtectedUser}
                onClick={() => {
                  if (isProtectedUser) return
                  setEditingUser(row.original)
                  setEditDialogOpen(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={updatingId === row.original.id || isProtectedUser}
                onClick={async () => {
                  if (isProtectedUser) return

                  setUpdatingId(row.original.id)
                  try {
                    const res = await fetch(`/api/v1/admin/users/${row.original.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isActive: !row.original.isActive }),
                    })

                    if (res.ok) {
                      toast({ title: row.original.isActive ? '用户已禁用' : '用户已启用' })
                      await onRefresh()
                    } else {
                      const error = await res.json()
                      toast({ title: '错误', description: error.error, variant: 'destructive' })
                    }
                  } catch {
                    toast({ title: '错误', description: '更新用户状态失败', variant: 'destructive' })
                  } finally {
                    setUpdatingId(null)
                  }
                }}
              >
                <Power className="mr-2 h-4 w-4" />
                {isProtectedUser ? '系统管理员账号不可变更状态' : row.original.isActive ? '禁用' : '启用'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                disabled={deletingId === row.original.id || isProtectedUser}
                onClick={async () => {
                  if (isProtectedUser) return

                  setDeletingId(row.original.id)
                  try {
                    const res = await fetch(`/api/v1/admin/users/${row.original.id}`, { method: 'DELETE' })
                    if (res.ok) {
                      toast({ title: '用户已删除' })
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
                <Trash2 className="mr-2 h-4 w-4" />
                {isProtectedUser ? '系统管理员账号不可删除' : '删除'}
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
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">账号列表</div>
          <p className="text-sm leading-6 text-slate-600">支持创建、编辑、启用、禁用与删除用户，并统一维护邮箱、手机号、组织归属、积分配额和累计使用情况。</p>
        </div>
        <UserFormDialog organizations={organizations} onSuccess={onRefresh} />
      </div>
      <DataTable
        columns={columns}
        data={users}
        searchKey="name"
        searchPlaceholder="搜索姓名、邮箱或手机号..."
        pageCount={pagination.pageCount}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        totalCount={pagination.total}
      />
      <UserEditDialog
        user={editingUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        organizations={organizations}
        onSuccess={onRefresh}
        currentUserId={currentUserId}
      />
    </div>
  )
}

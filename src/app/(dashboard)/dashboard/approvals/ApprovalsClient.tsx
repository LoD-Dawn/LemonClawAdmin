'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Box, Cpu, Clock, CheckCircle2, XCircle, History } from 'lucide-react'
import { ApproveButton } from './approve-button'
import { RejectButton } from './reject-button'
import { RevokeButton } from './revoke-button'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type ApplicationRow = {
  id: string
  resourceType: 'skill' | 'mcp'
  resourceName: string | null
  resourceIdentifier: string | null
  resourceVisibility: string | null
  userName: string | null
  userEmail: string
  userOrgName: string | null
  resourceOrgName: string | null
  status: 'pending' | 'approved' | 'rejected' | 'revoked'
  createdAt: string
  updatedAt: string
  timelineLabel: string
  timelineValue: string
  isRevocable: boolean
}

export function ApprovalsClient({
  initialApplications,
  counts,
  selectedStatus
}: {
  initialApplications: ApplicationRow[]
  counts: Record<string, number>
  selectedStatus: string
}) {
  const [applications] = useState<ApplicationRow[]>(initialApplications)

  const statusOptions = [
    { key: 'pending', label: '待审核', Icon: Clock },
    { key: 'approved', label: '已通过', Icon: CheckCircle2 },
    { key: 'rejected', label: '已拒绝', Icon: XCircle },
    { key: 'revoked', label: '已撤销', Icon: History },
  ]

  const statusMeta: Record<string, { badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { badgeVariant: 'secondary' },
    approved: { badgeVariant: 'default' },
    rejected: { badgeVariant: 'destructive' },
    revoked: { badgeVariant: 'outline' },
  }

  const columns: ColumnDef<ApplicationRow>[] = [
    {
      accessorKey: 'resourceName',
      header: '资源申请',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            {row.original.resourceType === 'skill' ? (
              <Box className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Cpu className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.original.resourceName || '资源已删除'}</span>
              <Badge variant={row.original.resourceType === 'skill' ? 'outline' : 'secondary'} className="text-[10px] h-4 px-1">
                {row.original.resourceType === 'skill' ? 'Skill' : 'MCP'}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{row.original.resourceIdentifier || '-'}</span>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'userName',
      header: '申请人',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{row.original.userName || row.original.userEmail}</span>
          <span className="text-xs text-muted-foreground">{row.original.userEmail}</span>
        </div>
      )
    },
    {
      accessorKey: 'userOrgName',
      header: '目标组织',
      cell: ({ row }) => row.original.userOrgName || '-'
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Badge variant={statusMeta[row.original.status].badgeVariant}>
          {statusOptions.find(o => o.key === row.original.status)?.label}
        </Badge>
      )
    },
    {
      accessorKey: 'createdAt',
      header: '申请时间',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString()
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        if (row.original.status === 'pending') {
          return (
            <div className="flex items-center gap-2">
              <ApproveButton applicationId={row.original.id} />
              <RejectButton applicationId={row.original.id} />
            </div>
          )
        }
        if (row.original.isRevocable) {
          return <RevokeButton applicationId={row.original.id} />
        }
        return <span className="text-xs text-muted-foreground">已归档</span>
      }
    }
  ]

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <AdminPageHeader
        title="审核管理"
        description="统一审核 Skill 和 MCP 申请事项，归并处理授权流转。"
      />

      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => {
          const isActive = option.key === selectedStatus
          const count = counts[option.key]
          return (
            <Link
              key={option.key}
              href={`/dashboard/approvals?status=${option.key}`}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              <option.Icon className="h-4 w-4" />
              <span>{option.label}</span>
              <span className={cn('text-xs', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/50')}>{count}</span>
            </Link>
          )
        })}
      </div>

      <div className="flex-1">
        <DataTable
          columns={columns}
          data={applications}
          searchKey="userEmail"
          searchPlaceholder="按邮箱模糊搜索..."
        />
      </div>
    </div>
  )
}

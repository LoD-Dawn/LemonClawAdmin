'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Box, Cpu, Trash2 } from 'lucide-react'
import { GrantRevokeButton } from './GrantRevokeButton'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { ShieldPlus } from 'lucide-react'
import { GrantCreateDialog } from './GrantCreateDialog'

type GrantRow = {
  id: string
  resourceType: 'skill' | 'mcp'
  resourceId: string
  resourceName: string | null
  resourceIdentifier: string | null
  resourceOrgName: string | null
  userId: string
  userName: string | null
  userEmail: string
  userOrgName: string | null
  grantedAt: string
  source: 'application' | 'manual'
  grantorName: string | null
}

export function GrantsClient({
  initialGrants,
  grantableResources,
  grantableUsers
}: {
  initialGrants: GrantRow[]
  grantableResources: any[]
  grantableUsers: any[]
}) {
  const [grants, setGrants] = useState<GrantRow[]>(initialGrants)
  const [open, setOpen] = useState(false)

  const columns: ColumnDef<GrantRow>[] = [
    {
      accessorKey: 'resourceName',
      header: '目标资源',
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
            <span className="text-xs text-muted-foreground font-mono">{row.original.resourceIdentifier || row.original.resourceId}</span>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'userName',
      header: '被授权人',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.userName || row.original.userEmail}</span>
          <span className="text-xs text-muted-foreground">{row.original.userEmail}</span>
        </div>
      )
    },
    {
      accessorKey: 'userOrgName',
      header: '所属组织',
      cell: ({ row }) => row.original.userOrgName || '-'
    },
    {
      accessorKey: 'grantedAt',
      header: '授权时间',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm">{new Date(row.original.grantedAt).toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">
            {row.original.source === 'application' ? '审批流转' : '手工授权'}
          </span>
        </div>
      )
    },
    {
      accessorKey: 'grantorName',
      header: '授权人',
      cell: ({ row }) => row.original.grantorName || '系统'
    },
    {
      id: 'actions',
      cell: ({ row }) => <GrantRevokeButton grantId={row.original.id} />
    }
  ]

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <AdminPageHeader
        title="授权管理"
        description="管理用户与 Skill / MCP 的映射关系，支持手工授权与及时撤销。"
        actions={
          <Button onClick={() => setOpen(true)}>
            <ShieldPlus className="mr-2 h-4 w-4" />
            新建授权
          </Button>
        }
      />

      <div className="flex-1">
        <DataTable
          columns={columns}
          data={grants}
          searchKey="userEmail"
          searchPlaceholder="按邮箱搜索授权..."
        />
      </div>

      <GrantCreateDialog
        open={open}
        onOpenChange={setOpen}
        resources={grantableResources}
        users={grantableUsers}
      />
    </div>
  )
}

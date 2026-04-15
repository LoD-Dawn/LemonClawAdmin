'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, PlusCircle, Power } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SkillTagFormDialog } from '@/components/skill-tags/skill-tag-form-dialog'
import type { SkillTagOption } from '@/lib/skill-tags'
import { ColumnDef } from '@tanstack/react-table'

type SkillTagRow = SkillTagOption & {
  sortOrder: number
  isActive: boolean
}

export function SkillTagsTable({
  tags,
  onRefresh,
}: {
  tags: SkillTagRow[]
  onRefresh: () => Promise<void>
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<SkillTagRow | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const columns = useMemo<ColumnDef<SkillTagRow>[]>(
    () => [
      {
        accessorKey: 'id',
        header: '标签 ID',
        cell: ({ row }) => (
          <code className="rounded border bg-muted/50 px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
            {row.original.id}
          </code>
        ),
      },
      {
        accessorKey: 'zh',
        header: '中文名',
      },
      {
        accessorKey: 'en',
        header: '英文名',
      },
      {
        accessorKey: 'sortOrder',
        header: '排序',
      },
      {
        accessorKey: 'isActive',
        header: '状态',
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? 'default' : 'outline'}>
            {row.original.isActive ? '启用中' : '已停用'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingTag(row.original)
                  setOpen(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={updatingId === row.original.id}
                onClick={async () => {
                  setUpdatingId(row.original.id)
                  try {
                    const res = await fetch(`/api/v1/skill-tags/${row.original.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isActive: !row.original.isActive }),
                    })

                    if (!res.ok) {
                      const error = await res.json().catch(() => null)
                      toast({
                        title: '错误',
                        description: error?.error ?? '更新标签状态失败',
                        variant: 'destructive',
                      })
                      return
                    }

                    toast({ title: row.original.isActive ? '标签已停用' : '标签已启用' })
                    await onRefresh()
                  } catch {
                    toast({ title: '错误', description: '更新标签状态失败', variant: 'destructive' })
                  } finally {
                    setUpdatingId(null)
                  }
                }}
              >
                <Power className="mr-2 h-4 w-4" />
                {row.original.isActive ? '停用' : '启用'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onRefresh, toast, updatingId]
  )

  return (
    <div className="flex flex-1 flex-col gap-4">
      <DataTable
        columns={columns}
        data={tags}
        searchKey="id"
        searchPlaceholder="搜索标签 ID..."
        pageCount={Math.max(1, Math.ceil(tags.length / pageSize))}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize)
          setPage(1)
        }}
        totalCount={tags.length}
      />

      <SkillTagFormDialog
        open={open}
        onOpenChange={setOpen}
        tag={editingTag}
        onSuccess={onRefresh}
      />
    </div>
  )
}

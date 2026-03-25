'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cpu, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkillFormDialog } from '@/components/skills/skill-form-dialog'
import { McpFormDialog } from '@/components/mcps/mcp-form-dialog'

export function ClientCreateActions() {
  const router = useRouter()
  const [skillOpen, setSkillOpen] = useState(false)
  const [mcpOpen, setMcpOpen] = useState(false)

  const handleSuccess = async () => {
    router.refresh()
  }

  return (
    <>
      <div className="rounded-[22px] border border-slate-200 bg-white/90 p-4">
        <p className="text-sm font-medium text-slate-900">创建你自己的个人资源</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          个人级 Skill 和 MCP 仅对你自己可见，创建后会立即出现在当前客户端目录里。
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => setSkillOpen(true)}
            className="rounded-full bg-slate-950 px-4 text-white hover:bg-slate-800"
          >
            <Plus className="mr-2 h-4 w-4" />
            新建个人 Skill
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMcpOpen(true)}
            className="rounded-full border-slate-300 bg-white px-4 text-slate-700 hover:bg-slate-50"
          >
            <Cpu className="mr-2 h-4 w-4" />
            新建个人 MCP
          </Button>
        </div>
      </div>

      <SkillFormDialog
        open={skillOpen}
        onOpenChange={setSkillOpen}
        skill={null}
        organizations={[]}
        managementMode="personal"
        managedDepartmentId={null}
        onSuccess={handleSuccess}
      />

      <McpFormDialog
        open={mcpOpen}
        onOpenChange={setMcpOpen}
        mcp={null}
        organizations={[]}
        managementMode="personal"
        managedDepartmentId={null}
        onSuccess={handleSuccess}
      />
    </>
  )
}

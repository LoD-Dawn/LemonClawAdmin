'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Plus, Loader2 } from 'lucide-react'
import {
  getAllowedUserRoles,
  getAssignableDepartments,
  getOrganizationById,
  isDepartmentOrganization,
  normalizeRoleForOrganization,
  type OrganizationOption,
  type UserRoleValue,
} from '@/lib/user-role-policy'

export function UserFormDialog({
  organizations,
  onSuccess,
}: {
  organizations: OrganizationOption[]
  onSuccess: () => Promise<void>
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [organizationId, setOrganizationId] = useState('')
  const [role, setRole] = useState<UserRoleValue>('user')
  const [departmentId, setDepartmentId] = useState('')

  const selectedOrganization = getOrganizationById(organizations, organizationId)
  const allowedRoles = getAllowedUserRoles(selectedOrganization)
  const availableDepartments = getAssignableDepartments(organizations, organizationId)
  const forceOwnDepartment = isDepartmentOrganization(selectedOrganization)

  useEffect(() => {
    const normalizedRole = normalizeRoleForOrganization(role, selectedOrganization)

    if (normalizedRole !== role) {
      setRole(normalizedRole)
      return
    }

    if (forceOwnDepartment) {
      const nextDepartmentId = role === 'department_admin' ? selectedOrganization?.id ?? '' : ''
      if (departmentId !== nextDepartmentId) {
        setDepartmentId(nextDepartmentId)
      }
      return
    }

    if (role !== 'department_admin' && departmentId) {
      setDepartmentId('')
      return
    }

    if (departmentId && !availableDepartments.some((organization) => organization.id === departmentId)) {
      setDepartmentId('')
    }
  }, [availableDepartments, departmentId, forceOwnDepartment, role, selectedOrganization])

  function resetRoleFields() {
    setOrganizationId('')
    setRole('user')
    setDepartmentId('')
    setErrors({})
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})
    const form = e.currentTarget

    const formData = new FormData(form)
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      organizationId: organizationId || null,
      isSuperAdmin: role === 'super_admin',
      isDepartmentAdmin: role === 'department_admin',
      departmentId: role === 'department_admin'
        ? (forceOwnDepartment ? (selectedOrganization?.id ?? null) : (departmentId || null))
        : null,
    }

    // Basic validation
    const newErrors: Record<string, string> = {}
    if (!data.name) newErrors.name = '姓名不能为空'
    if (!data.email) newErrors.email = '邮箱不能为空'
    if (!data.password || data.password.length < 8) newErrors.password = '密码至少8位'
    if (data.isDepartmentAdmin && !data.departmentId) newErrors.departmentId = '请选择管理部门'
    if (selectedOrganization?.type === 'department' && data.isSuperAdmin) newErrors.role = '部门组织下不能选择超级管理员'
    if (selectedOrganization?.type === 'department' && data.isDepartmentAdmin && data.departmentId !== selectedOrganization.id) {
      newErrors.departmentId = '部门管理员只能管理当前部门'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (res.ok) {
        toast({ title: '用户已创建' })
        setOpen(false)
        form.reset()
        resetRoleFields()
        await onSuccess()
      } else {
        const error = await res.json()
        toast({ title: '错误', description: error.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: '错误', description: '创建用户失败', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          resetRoleFields()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />新建用户</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>新建用户</DialogTitle>
          <DialogDescription>
            填写以下信息创建新用户
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              name="name"
              required
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationId">组织</Label>
            <select
              id="organizationId"
              name="organizationId"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 h-10 bg-white"
            >
              <option value="">无</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">角色</Label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRoleValue)}
              className={`w-full border rounded-md px-3 py-2 h-10 bg-white ${errors.role ? 'border-destructive' : ''}`}
            >
              {allowedRoles.includes('user') && <option value="user">普通员工</option>}
              {allowedRoles.includes('department_admin') && <option value="department_admin">部门管理员</option>}
              {allowedRoles.includes('super_admin') && <option value="super_admin">超级管理员</option>}
            </select>
            {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="departmentId">管理部门</Label>
            <select
              id="departmentId"
              name="departmentId"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className={`w-full border rounded-md px-3 py-2 h-10 bg-white ${errors.departmentId ? 'border-destructive' : ''}`}
              disabled={role !== 'department_admin' || forceOwnDepartment}
            >
              <option value="">无</option>
              {availableDepartments.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            {forceOwnDepartment && role === 'department_admin' && (
              <p className="text-sm text-muted-foreground">所属组织是部门时，管理范围固定为当前部门。</p>
            )}
            {errors.departmentId && <p className="text-sm text-destructive">{errors.departmentId}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                resetRoleFields()
              }}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

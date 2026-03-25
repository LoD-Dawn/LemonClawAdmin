'use client'

import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import {
  getAllowedUserRoles,
  getAssignableDepartments,
  getOrganizationById,
  isDepartmentOrganization,
  normalizeRoleForOrganization,
  type OrganizationOption,
  type UserRoleValue,
} from '@/lib/user-role-policy'

interface User {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
  isDepartmentAdmin: boolean
  departmentId?: string | null
  organization?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
}

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  organizations,
  onSuccess,
  currentUserId,
}: {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  organizations: OrganizationOption[]
  onSuccess: () => Promise<void>
  currentUserId: string
}) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [organizationId, setOrganizationId] = useState(user?.organization?.id || '')
  const [departmentId, setDepartmentId] = useState(user?.department?.id || user?.departmentId || '')
  const [role, setRole] = useState<UserRoleValue>(
    user?.isSuperAdmin ? 'super_admin' : user?.isDepartmentAdmin ? 'department_admin' : 'user'
  )
  const [error, setError] = useState('')

  const selectedOrganization = getOrganizationById(organizations, organizationId)
  const allowedRoles = getAllowedUserRoles(selectedOrganization)
  const availableDepartments = getAssignableDepartments(organizations, organizationId)
  const forceOwnDepartment = isDepartmentOrganization(selectedOrganization)

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setPassword('')
      setConfirmPassword('')
      setOrganizationId(user.organization?.id || '')
      setDepartmentId(user.department?.id || user.departmentId || '')
      setRole(user.isSuperAdmin ? 'super_admin' : user.isDepartmentAdmin ? 'department_admin' : 'user')
      setError('')
    }
  }, [user])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    if (selectedOrganization?.type === 'department' && role === 'super_admin') {
      setError('部门组织下不能选择超级管理员')
      return
    }

    if (role === 'department_admin' && !departmentId) {
      setError('请选择管理部门')
      return
    }

    if (selectedOrganization?.type === 'department' && role === 'department_admin' && departmentId !== selectedOrganization.id) {
      setError('部门管理员只能管理自己的部门')
      return
    }

    if (password && password.length < 8) {
      setError('新密码至少 8 位')
      return
    }

    if (password && password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setError('')
    setIsLoading(true)
    try {
      const passwordChanged = Boolean(password)
      const isCurrentUser = currentUserId === user.id
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          ...(password ? { password } : {}),
          organizationId: organizationId || null,
          isSuperAdmin: role === 'super_admin',
          isDepartmentAdmin: role === 'department_admin',
          departmentId: role === 'department_admin' ? (departmentId || null) : null,
        }),
      })

      if (res.ok) {
        onOpenChange(false)
        await onSuccess()
        if (passwordChanged && isCurrentUser) {
          toast({ title: '密码已修改，请重新登录' })
          await signOut({ callbackUrl: '/login' })
          return
        }
        toast({ title: passwordChanged ? '用户与密码已更新' : '用户已更新' })
      } else {
        const error = await res.json()
        toast({ title: '错误', description: error.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: '错误', description: '更新失败', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>修改用户信息</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">姓名</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">邮箱</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-password">新密码</Label>
            <Input
              id="edit-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              placeholder="留空则不修改密码"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-confirm-password">确认新密码</Label>
            <Input
              id="edit-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              placeholder="再次输入新密码"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-organization">组织</Label>
            <select
              id="edit-organization"
              value={organizationId}
              onChange={e => setOrganizationId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 h-10 bg-white"
            >
              <option value="">无</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">角色</Label>
            <select
              id="edit-role"
              value={role}
              onChange={e => setRole(e.target.value as UserRoleValue)}
              className={`w-full border rounded-md px-3 py-2 h-10 bg-white ${error ? 'border-destructive' : ''}`}
            >
              {allowedRoles.includes('user') && <option value="user">普通员工</option>}
              {allowedRoles.includes('department_admin') && <option value="department_admin">部门管理员</option>}
              {allowedRoles.includes('super_admin') && <option value="super_admin">超级管理员</option>}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-department">管理部门</Label>
            <select
              id="edit-department"
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 h-10 bg-white"
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
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

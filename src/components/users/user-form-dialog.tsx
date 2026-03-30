'use client'

import { useEffect, useState } from 'react'
import {
  ACCOUNT_TYPE_LABELS,
  DEFAULT_CONSUMER_ORGANIZATION_ID,
  isDefaultConsumerOrganizationId,
  type AccountTypeValue,
} from '@/lib/default-organizations'
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
  const [accountType, setAccountType] = useState<AccountTypeValue>('enterprise')
  const [organizationId, setOrganizationId] = useState('')
  const [role, setRole] = useState<UserRoleValue>('user')
  const [departmentId, setDepartmentId] = useState('')
  const [creditBalance, setCreditBalance] = useState('0')
  const [pricingVersion, setPricingVersion] = useState('2026-03-v2')
  const [quotaExpiresAt, setQuotaExpiresAt] = useState('')

  const defaultConsumerOrganization = organizations.find((organization) => isDefaultConsumerOrganizationId(organization.id)) ?? null
  const effectiveOrganizationId = accountType === 'consumer'
    ? defaultConsumerOrganization?.id ?? DEFAULT_CONSUMER_ORGANIZATION_ID
    : organizationId
  const selectedOrganization = getOrganizationById(organizations, effectiveOrganizationId)
  const allowedRoles = getAllowedUserRoles(selectedOrganization, accountType)
  const availableDepartments = getAssignableDepartments(organizations, effectiveOrganizationId, accountType)
  const forceOwnDepartment = accountType === 'enterprise' && isDepartmentOrganization(selectedOrganization)
  const isUnlimitedRole = role === 'super_admin' || role === 'department_admin'
  const enterpriseOrganizations = organizations.filter((organization) => !isDefaultConsumerOrganizationId(organization.id))

  useEffect(() => {
    const normalizedRole = normalizeRoleForOrganization(role, selectedOrganization, accountType)

    if (normalizedRole !== role) {
      setRole(normalizedRole)
      return
    }

    if (accountType === 'consumer') {
      if (departmentId) {
        setDepartmentId('')
      }
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
  }, [accountType, availableDepartments, departmentId, forceOwnDepartment, role, selectedOrganization])

  function resetRoleFields() {
    setAccountType('enterprise')
    setOrganizationId('')
    setRole('user')
    setDepartmentId('')
    setCreditBalance('0')
    setPricingVersion('2026-03-v2')
    setQuotaExpiresAt('')
    setErrors({})
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})
    const form = e.currentTarget

    const formData = new FormData(form)
    const parsedCreditBalance = Number.parseInt(creditBalance || '0', 10)
    const normalizedPricingVersion = pricingVersion.trim() || '2026-03-v2'
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      accountType,
      organizationId: accountType === 'consumer'
        ? (defaultConsumerOrganization?.id ?? DEFAULT_CONSUMER_ORGANIZATION_ID)
        : organizationId || null,
      isSuperAdmin: role === 'super_admin',
      isDepartmentAdmin: role === 'department_admin',
      departmentId: role === 'department_admin'
        ? (forceOwnDepartment ? (selectedOrganization?.id ?? null) : (departmentId || null))
        : null,
      ...(isUnlimitedRole
        ? {}
        : {
            creditBalance: parsedCreditBalance,
            pricingVersion: normalizedPricingVersion,
            quotaExpiresAt: quotaExpiresAt ? new Date(quotaExpiresAt).toISOString() : null,
          }),
    }

    // Basic validation
    const newErrors: Record<string, string> = {}
    if (!data.name) newErrors.name = '姓名不能为空'
    if (!data.email) newErrors.email = '邮箱不能为空'
    if (!data.password || data.password.length < 8) newErrors.password = '密码至少8位'
    if (accountType === 'consumer' && !defaultConsumerOrganization) newErrors.accountType = '默认普通用户组织不存在'
    if (!isUnlimitedRole && (!Number.isFinite(parsedCreditBalance) || parsedCreditBalance < 0)) newErrors.creditBalance = '积分不能小于 0'
    if (!isUnlimitedRole && !normalizedPricingVersion) newErrors.pricingVersion = '计费版本不能为空'
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
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>新建用户</DialogTitle>
          <DialogDescription>
            填写账号类型、角色和配额信息。管理员角色默认无限使用，无需单独配置积分。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
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
            <Label htmlFor="accountType">账号类型</Label>
            <select
              id="accountType"
              name="accountType"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountTypeValue)}
              className={`w-full border rounded-md px-3 py-2 h-10 bg-white ${errors.accountType ? 'border-destructive' : ''}`}
            >
              <option value="enterprise">{ACCOUNT_TYPE_LABELS.enterprise}</option>
              <option value="consumer">{ACCOUNT_TYPE_LABELS.consumer}</option>
            </select>
            {errors.accountType && <p className="text-sm text-destructive">{errors.accountType}</p>}
            </div>
            <div className="space-y-2">
            <Label htmlFor="organizationId">组织</Label>
            <select
              id="organizationId"
              name="organizationId"
              value={accountType === 'consumer' ? (defaultConsumerOrganization?.id ?? '') : organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 h-10 bg-white"
              disabled={accountType === 'consumer'}
            >
              {accountType === 'enterprise' ? <option value="">无</option> : null}
              {(accountType === 'consumer' ? organizations.filter((organization) => isDefaultConsumerOrganizationId(organization.id)) : enterpriseOrganizations).map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            {accountType === 'consumer' ? (
              <p className="text-sm text-muted-foreground">普通用户账号固定归属默认普通用户组织，并通过普通用户入口登录。</p>
            ) : null}
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
              {allowedRoles.includes('user') && <option value="user">{accountType === 'consumer' ? '普通用户' : '普通员工'}</option>}
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
                disabled={accountType === 'consumer' || role !== 'department_admin' || forceOwnDepartment}
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
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Claw 配额</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {accountType === 'consumer'
                    ? '普通用户账号使用个人积分配额，通过普通用户入口访问系统。'
                    : '企业账号中的普通员工使用积分配额。超级管理员和部门管理员默认无限使用。'}
                </p>
              </div>
              {isUnlimitedRole ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  当前角色为管理员，已自动切换为无限使用模式。
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="creditBalance">初始积分</Label>
                      <Input
                        id="creditBalance"
                        type="number"
                        min={0}
                        value={creditBalance}
                        onChange={(e) => setCreditBalance(e.target.value)}
                        className={errors.creditBalance ? 'border-destructive' : ''}
                      />
                      {errors.creditBalance && <p className="text-sm text-destructive">{errors.creditBalance}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pricingVersion">计费版本</Label>
                      <Input
                        id="pricingVersion"
                        value={pricingVersion}
                        onChange={(e) => setPricingVersion(e.target.value)}
                        className={errors.pricingVersion ? 'border-destructive' : ''}
                      />
                      {errors.pricingVersion && <p className="text-sm text-destructive">{errors.pricingVersion}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quotaExpiresAt">配额过期时间</Label>
                    <Input
                      id="quotaExpiresAt"
                      type="datetime-local"
                      value={quotaExpiresAt}
                      onChange={(e) => setQuotaExpiresAt(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">可选，留空表示长期有效。</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="lg:col-span-2 flex justify-end gap-3">
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

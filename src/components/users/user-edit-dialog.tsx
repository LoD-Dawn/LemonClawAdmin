'use client'

import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import {
  ACCOUNT_TYPE_LABELS,
  DEFAULT_CONSUMER_ORGANIZATION_ID,
  isDefaultConsumerOrganizationId,
  type AccountTypeValue,
} from '@/lib/default-organizations'
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
import { isPhoneFormatValid } from '@/lib/phone'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  accountType: AccountTypeValue
  isSuperAdmin: boolean
  isDepartmentAdmin: boolean
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

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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
  const [phone, setPhone] = useState(user?.phone || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountType, setAccountType] = useState<AccountTypeValue>(user?.accountType || 'enterprise')
  const [organizationId, setOrganizationId] = useState(user?.organization?.id || '')
  const [departmentId, setDepartmentId] = useState(user?.department?.id || user?.departmentId || '')
  const [role, setRole] = useState<UserRoleValue>(
    user?.isSuperAdmin ? 'super_admin' : user?.isDepartmentAdmin ? 'department_admin' : 'user'
  )
  const [creditBalance, setCreditBalance] = useState(String(user?.clawQuota?.creditBalance ?? 0))
  const [pricingVersion, setPricingVersion] = useState(user?.clawQuota?.pricingVersion ?? '2026-03-v2')
  const [quotaExpiresAt, setQuotaExpiresAt] = useState(toDateTimeLocalValue(user?.clawQuota?.expiresAt))
  const [error, setError] = useState('')

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
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setPhone(user.phone || '')
      setPassword('')
      setConfirmPassword('')
      setAccountType(user.accountType)
      setOrganizationId(user.organization?.id || '')
      setDepartmentId(user.department?.id || user.departmentId || '')
      setRole(user.isSuperAdmin ? 'super_admin' : user.isDepartmentAdmin ? 'department_admin' : 'user')
      setCreditBalance(String(user.clawQuota?.creditBalance ?? 0))
      setPricingVersion(user.clawQuota?.pricingVersion ?? '2026-03-v2')
      setQuotaExpiresAt(toDateTimeLocalValue(user.clawQuota?.expiresAt))
      setError('')
    }
  }, [user])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    if (accountType === 'consumer' && !defaultConsumerOrganization) {
      setError('默认普通用户组织不存在')
      return
    }

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

    if (phone.trim()) {
      if (!isPhoneFormatValid(phone)) {
        setError('请输入有效的中国大陆手机号')
        return
      }
    } else if (user.phone) {
      setError('已绑定手机号的账号不能清空手机号')
      return
    }

    const parsedCreditBalance = Number.parseInt(creditBalance || '0', 10)
    if (!isUnlimitedRole && (!Number.isFinite(parsedCreditBalance) || parsedCreditBalance < 0)) {
      setError('积分不能小于 0')
      return
    }

    if (!isUnlimitedRole && !pricingVersion.trim()) {
      setError('计费版本不能为空')
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
          ...(phone.trim() ? { phone } : {}),
          ...(password ? { password } : {}),
          accountType,
          organizationId: accountType === 'consumer'
            ? (defaultConsumerOrganization?.id ?? DEFAULT_CONSUMER_ORGANIZATION_ID)
            : organizationId || null,
          isSuperAdmin: role === 'super_admin',
          isDepartmentAdmin: role === 'department_admin',
          departmentId: role === 'department_admin' ? (departmentId || null) : null,
          ...(isUnlimitedRole
            ? {}
            : {
                creditBalance: parsedCreditBalance,
                pricingVersion: pricingVersion.trim(),
                quotaExpiresAt: quotaExpiresAt ? new Date(quotaExpiresAt).toISOString() : null,
              }),
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
        const errorResponse = await res.json()
        toast({ title: '错误', description: errorResponse.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: '错误', description: '更新失败', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px]">
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>统一调整账号类型、组织归属、角色权限和 Claw 使用配置。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_320px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">手机号</Label>
              <Input
                id="edit-phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="请输入手机号，如 13812345678"
              />
              {!user?.phone ? (
                <p className="text-sm text-amber-700">历史用户尚未补齐手机号，建议本次编辑时一并补录。</p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-account-type">账号类型</Label>
                <select
                  id="edit-account-type"
                  value={accountType}
                  onChange={e => setAccountType(e.target.value as AccountTypeValue)}
                  className="w-full border rounded-md px-3 py-2 h-10 bg-white"
                >
                  <option value="enterprise">{ACCOUNT_TYPE_LABELS.enterprise}</option>
                  <option value="consumer">{ACCOUNT_TYPE_LABELS.consumer}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-organization">组织</Label>
                <select
                  id="edit-organization"
                  value={accountType === 'consumer' ? (defaultConsumerOrganization?.id ?? '') : organizationId}
                  onChange={e => setOrganizationId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 h-10 bg-white"
                  disabled={accountType === 'consumer'}
                >
                  {accountType === 'enterprise' ? <option value="">无</option> : null}
                  {(accountType === 'consumer'
                    ? organizations.filter((organization) => isDefaultConsumerOrganizationId(organization.id))
                    : enterpriseOrganizations).map((organization) => (
                    <option key={organization.id} value={organization.id}>{organization.name}</option>
                  ))}
                </select>
                {accountType === 'consumer' ? (
                  <p className="text-sm text-muted-foreground">普通用户账号固定归属默认普通用户组织。</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-role">角色</Label>
                <select
                  id="edit-role"
                  value={role}
                  onChange={e => setRole(e.target.value as UserRoleValue)}
                  className={`w-full border rounded-md px-3 py-2 h-10 bg-white ${error ? 'border-destructive' : ''}`}
                >
                  {allowedRoles.includes('user') && <option value="user">{accountType === 'consumer' ? '普通用户' : '普通员工'}</option>}
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
                  disabled={accountType === 'consumer' || role !== 'department_admin' || forceOwnDepartment}
                >
                  <option value="">无</option>
                  {availableDepartments.map((organization) => (
                    <option key={organization.id} value={organization.id}>{organization.name}</option>
                  ))}
                </select>
                {forceOwnDepartment && role === 'department_admin' && (
                  <p className="text-sm text-muted-foreground">所属组织是部门时，管理范围固定为当前部门。</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Claw 配额设置</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {accountType === 'consumer'
                      ? '普通用户账号通过普通用户入口登录，按个人积分配额控制使用时长。'
                      : '企业账号中的普通员工按积分控制使用时长，管理员默认无限使用。'}
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
                        <Label htmlFor="edit-credit-balance">当前积分</Label>
                        <Input
                          id="edit-credit-balance"
                          type="number"
                          min={0}
                          value={creditBalance}
                          onChange={e => setCreditBalance(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-pricing-version">计费版本</Label>
                        <Input
                          id="edit-pricing-version"
                          value={pricingVersion}
                          onChange={e => setPricingVersion(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-quota-expires-at">配额过期时间</Label>
                      <Input
                        id="edit-quota-expires-at"
                        type="datetime-local"
                        value={quotaExpiresAt}
                        onChange={e => setQuotaExpiresAt(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {user ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">当前额度</div>
                    <div className="mt-1 text-base font-semibold text-slate-900">
                      {user.clawQuota?.isUnlimited ? '无限使用' : `${user.clawQuota?.creditBalance ?? 0} 积分`}
                    </div>
                    <div className="text-xs text-slate-500">
                      {user.clawQuota?.isUnlimited
                        ? '管理员角色不受积分限制'
                        : `约 ${formatClawDuration(user.clawQuota?.remainingClawSeconds ?? 0)}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">累计消耗</div>
                    <div className="mt-1 text-base font-semibold text-slate-900">{user.usageSummary.consumedCredits} 积分</div>
                    <div className="text-xs text-slate-500">{formatClawDuration(user.usageSummary.usedClawSeconds)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">会话次数</div>
                    <div className="mt-1 text-base font-semibold text-slate-900">{user.usageSummary.sessions}</div>
                    <div className="text-xs text-slate-500">{user.clawQuota?.pricingVersion ?? '2026-03-v2'}</div>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">使用情况</div>
              <div className="mt-3 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>累计会话</span>
                  <span className="font-medium text-slate-900">{user?.usageSummary.sessions ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>累计时长</span>
                  <span className="font-medium text-slate-900">{formatClawDuration(user?.usageSummary.usedClawSeconds ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>累计扣减</span>
                  <span className="font-medium text-slate-900">{user?.usageSummary.consumedCredits ?? 0} 积分</span>
                </div>
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

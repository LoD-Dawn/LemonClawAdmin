'use client'

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, Loader2, UploadCloud } from 'lucide-react'
import { parseTagsJson } from '@/lib/skill-catalog'
import type { SkillTagOption } from '@/lib/skill-tags'

const SKILL_PACKAGE_MAX_MB = 100

const formSchema = z.object({
  name: z.string().min(1),
  identifier: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$|^[a-z0-9]$/),
  description: z.string(),
  descriptionEn: z.string(),
  descriptionZh: z.string(),
  tags: z.array(z.string().min(1).max(64)).max(20),
  visibility: z.enum(['company', 'department', 'personal']),
  organizationId: z.string().uuid().nullable(),
  packageUrl: z.string(),
  version: z.string(),
  sourceFrom: z.string(),
  sourceUrl: z.string(),
  sourceAuthor: z.string(),
}).refine(
  (data) => {
    if (data.visibility === 'personal') return true
    return data.organizationId !== null && data.organizationId !== undefined
  },
  { message: '公司级/部门级可见性需要选择所属组织', path: ['organizationId'] }
)

function normalizeOptionalField(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function buildPackageUploadSignature(file: File | null, values: Pick<SkillFormValues, 'identifier' | 'version' | 'visibility' | 'organizationId'>) {
  if (!file) {
    return null
  }

  return JSON.stringify({
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    identifier: values.identifier.trim(),
    version: values.version.trim(),
    visibility: values.visibility,
    organizationId: values.visibility === 'personal' ? null : values.organizationId ?? null,
  })
}

type SkillFormValues = z.infer<typeof formSchema>

type SkillFormOrganization = {
  id: string
  name: string
}

type EditableSkill = {
  id: string
  name?: string | null
  identifier?: string | null
  description?: string | null
  descriptionEn?: string | null
  descriptionZh?: string | null
  tagsJson?: string | null
  visibility?: 'company' | 'department' | 'personal' | null
  organizationId?: string | null
  packageUrl?: string | null
  version?: string | null
  sourceFrom?: string | null
  sourceUrl?: string | null
  sourceAuthor?: string | null
}

function toFormValues(
  skill: EditableSkill | null,
  departmentOnly: boolean,
  personalOnly: boolean,
  managedDepartmentId: string | null
): SkillFormValues {
  if (skill) {
    return {
      name: skill.name ?? '',
      identifier: skill.identifier ?? '',
      description: skill.description ?? '',
      descriptionEn: skill.descriptionEn ?? '',
      descriptionZh: skill.descriptionZh ?? '',
      tags: parseTagsJson(skill.tagsJson),
      visibility: skill.visibility ?? (personalOnly ? 'personal' : departmentOnly ? 'department' : 'company'),
      organizationId: skill.organizationId ?? (departmentOnly ? managedDepartmentId : null),
      packageUrl: skill.packageUrl ?? '',
      version: skill.version ?? '',
      sourceFrom: skill.sourceFrom ?? '',
      sourceUrl: skill.sourceUrl ?? '',
      sourceAuthor: skill.sourceAuthor ?? '',
    }
  }

  return {
    name: '',
    identifier: '',
    description: '',
    descriptionEn: '',
    descriptionZh: '',
    tags: [],
    visibility: personalOnly ? 'personal' : departmentOnly ? 'department' : 'company',
    organizationId: departmentOnly ? managedDepartmentId : null,
    packageUrl: '',
    version: '',
    sourceFrom: '',
    sourceUrl: '',
    sourceAuthor: '',
  }
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-5">
      <div className="mb-4 space-y-1">
        <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-900">{title}</h3>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function SkillFormDialog({
  open,
  onOpenChange,
  skill,
  organizations,
  managementMode,
  managedDepartmentId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill: EditableSkill | null
  organizations: SkillFormOrganization[]
  managementMode: 'super_admin' | 'department_admin' | 'personal'
  managedDepartmentId: string | null
  onSuccess: () => Promise<void>
}) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isPackageUploading, setIsPackageUploading] = useState(false)
  const [packageFile, setPackageFile] = useState<File | null>(null)
  const [uploadedPackageSignature, setUploadedPackageSignature] = useState<string | null>(null)
  const [uploadedPackageUrl, setUploadedPackageUrl] = useState<string | null>(null)
  const [isPackageUrlManuallyEdited, setIsPackageUrlManuallyEdited] = useState(false)
  const [tagOptions, setTagOptions] = useState<SkillTagOption[]>([])
  const [isTagsLoading, setIsTagsLoading] = useState(false)
  const packageInputRef = useRef<HTMLInputElement | null>(null)
  const isMountedRef = useRef(true)
  const packageUploadRequestIdRef = useRef(0)
  const isEditing = !!skill
  const departmentOnly = managementMode === 'department_admin'
  const personalOnly = managementMode === 'personal'
  const availableOrganizations = departmentOnly
    ? organizations.filter((organization) => organization.id === managedDepartmentId)
    : organizations
  const defaultValues = toFormValues(skill, departmentOnly, personalOnly, managedDepartmentId)

  const handleVisibilityChange = (value: string) => {
    if (value === 'personal' || personalOnly) {
      form.setValue('organizationId', null)
    } else if (departmentOnly) {
      form.setValue('organizationId', managedDepartmentId)
    }
  }

  const form = useForm<SkillFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  })

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    form.reset(toFormValues(skill, departmentOnly, personalOnly, managedDepartmentId))
    setPackageFile(null)
    setIsPackageUploading(false)
    setUploadedPackageSignature(null)
    setUploadedPackageUrl(skill?.packageUrl ?? null)
    setIsPackageUrlManuallyEdited(false)
    packageUploadRequestIdRef.current += 1
    if (packageInputRef.current) {
      packageInputRef.current.value = ''
    }
  }, [skill, personalOnly, departmentOnly, managedDepartmentId, form])

  useEffect(() => {
    if (!open) {
      return
    }

    let active = true

    async function loadTags() {
      setIsTagsLoading(true)
      try {
        const response = await fetch('/api/v1/skill-tags')
        const result = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(result?.error || '加载标签失败')
        }

        if (active) {
          setTagOptions(Array.isArray(result?.data) ? result.data : [])
        }
      } catch (error) {
        if (active) {
          setTagOptions([])
          toast({
            title: '错误',
            description: error instanceof Error ? error.message : '加载标签失败',
            variant: 'destructive',
          })
        }
      } finally {
        if (active) {
          setIsTagsLoading(false)
        }
      }
    }

    void loadTags()

    return () => {
      active = false
    }
  }, [open, toast])

  const visibility = useWatch({ control: form.control, name: 'visibility' })
  const identifier = useWatch({ control: form.control, name: 'identifier' })
  const version = useWatch({ control: form.control, name: 'version' })
  const organizationId = useWatch({ control: form.control, name: 'organizationId' })
  const packageUrl = useWatch({ control: form.control, name: 'packageUrl' })
  const isPersonal = visibility === 'personal'
  const packageUploadSignature = buildPackageUploadSignature(packageFile, {
    identifier,
    version,
    visibility,
    organizationId,
  })

  const selectedTags = useWatch({ control: form.control, name: 'tags' }) ?? []
  const unknownSelectedTags = selectedTags.filter((tagId) => !tagOptions.some((tag) => tag.id === tagId))
  const visibleTagOptions = [
    ...tagOptions,
    ...unknownSelectedTags.map((tagId) => ({
      id: tagId,
      en: tagId,
      zh: `${tagId}（历史标签）`,
    })),
  ]

  const toggleTag = (tagId: string) => {
    const currentTags = form.getValues('tags') ?? []
    const nextTags = currentTags.includes(tagId)
      ? currentTags.filter((item) => item !== tagId)
      : [...currentTags, tagId]

    form.setValue('tags', nextTags, { shouldDirty: true, shouldValidate: true })
  }

  const getPackageUploadBlockedReason = useCallback((values: SkillFormValues) => {
    if (!values.identifier.trim()) {
      return '请先填写标识符，再上传 Skill zip'
    }

    if (values.visibility !== 'personal' && !values.organizationId) {
      return '请先选择所属组织，再上传 Skill zip'
    }

    return null
  }, [])

  const uploadPackageFile = useCallback(async (file: File, values: SkillFormValues) => {
    const blockedReason = getPackageUploadBlockedReason(values)
    if (blockedReason) {
      throw new Error(blockedReason)
    }

    const maxBytes = SKILL_PACKAGE_MAX_MB * 1024 * 1024
    if (file.size > maxBytes) {
      throw new Error(`zip 文件不能超过 ${SKILL_PACKAGE_MAX_MB}MB`)
    }

    const formData = new FormData()
    formData.set('file', file)
    formData.set('identifier', values.identifier.trim())
    formData.set('version', values.version.trim())
    formData.set('visibility', values.visibility)

    if (values.visibility !== 'personal' && values.organizationId) {
      formData.set('organizationId', values.organizationId)
    }

    const response = await fetch('/api/v1/skills/upload-package', {
      method: 'POST',
      body: formData,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(payload?.error || '上传 Skill zip 失败')
    }

    const uploadedUrl = typeof payload?.data?.url === 'string' ? payload.data.url : null
    if (!uploadedUrl) {
      throw new Error('上传成功但未返回可用地址')
    }

    return uploadedUrl
  }, [getPackageUploadBlockedReason])

  const applyUploadedPackageUrl = useCallback((signature: string, url: string) => {
    form.setValue('packageUrl', url, { shouldDirty: true, shouldValidate: true })
    setUploadedPackageSignature(signature)
    setUploadedPackageUrl(url)
    setIsPackageUrlManuallyEdited(false)
  }, [form])

  const clearSelectedPackage = useCallback(() => {
    setPackageFile(null)
    setUploadedPackageSignature(null)
    setUploadedPackageUrl(skill?.packageUrl ?? null)
    setIsPackageUrlManuallyEdited(false)
    packageUploadRequestIdRef.current += 1
    form.setValue('packageUrl', skill?.packageUrl ?? '', { shouldDirty: true, shouldValidate: true })
    if (packageInputRef.current) {
      packageInputRef.current.value = ''
    }
  }, [form, skill])

  useEffect(() => {
    if (!packageFile || !packageUploadSignature || isPackageUploading || isPackageUrlManuallyEdited) {
      return
    }

    const file = packageFile
    const signature = packageUploadSignature
    const values = form.getValues()
    if (getPackageUploadBlockedReason(values)) {
      return
    }
    if (uploadedPackageSignature === signature && uploadedPackageUrl === normalizeOptionalField(packageUrl)) {
      return
    }

    const requestId = packageUploadRequestIdRef.current + 1
    packageUploadRequestIdRef.current = requestId

    async function startUpload() {
      setIsPackageUploading(true)
      try {
        const uploadedUrl = await uploadPackageFile(file, values)
        if (isMountedRef.current && packageUploadRequestIdRef.current === requestId) {
          applyUploadedPackageUrl(signature, uploadedUrl)
          toast({
            title: 'Skill zip 已上传',
            description: '客户端包地址已自动回填。',
          })
        }
      } catch (error) {
        if (isMountedRef.current && packageUploadRequestIdRef.current === requestId) {
          toast({
            title: '错误',
            description: error instanceof Error ? error.message : '上传 Skill zip 失败',
            variant: 'destructive',
          })
        }
      } finally {
        if (isMountedRef.current && packageUploadRequestIdRef.current === requestId) {
          setIsPackageUploading(false)
        }
      }
    }

    void startUpload()
  }, [
    applyUploadedPackageUrl,
    form,
    getPackageUploadBlockedReason,
    isPackageUploading,
    isPackageUrlManuallyEdited,
    packageFile,
    packageUploadSignature,
    packageUrl,
    toast,
    uploadPackageFile,
    uploadedPackageSignature,
    uploadedPackageUrl,
  ])

  async function onSubmit(values: SkillFormValues) {
    if (isPackageUploading) {
      toast({
        title: '请稍候',
        description: 'Skill zip 还在上传，上传完成后再保存。',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    const method = isEditing ? 'PUT' : 'POST'
    const url = isEditing ? `/api/v1/skills/${skill.id}` : '/api/v1/skills'

    try {
      let uploadedPackageUrl = normalizeOptionalField(values.packageUrl)
      const shouldUploadPackage = packageFile
        && (
          !uploadedPackageUrl
          || (!isPackageUrlManuallyEdited && uploadedPackageSignature !== packageUploadSignature)
        )

      if (packageFile && packageUploadSignature && shouldUploadPackage) {
        const file = packageFile
        const signature = packageUploadSignature
        setIsPackageUploading(true)
        const requestId = packageUploadRequestIdRef.current + 1
        packageUploadRequestIdRef.current = requestId
        const nextUploadedPackageUrl = await uploadPackageFile(file, values)
        uploadedPackageUrl = nextUploadedPackageUrl

        if (packageUploadRequestIdRef.current === requestId) {
          applyUploadedPackageUrl(signature, nextUploadedPackageUrl)
        }
      }

      const payload = {
        name: values.name.trim(),
        identifier: values.identifier.trim(),
        description: normalizeOptionalField(values.description),
        descriptionEn: normalizeOptionalField(values.descriptionEn),
        descriptionZh: normalizeOptionalField(values.descriptionZh),
        tags: values.tags,
        visibility: values.visibility,
        organizationId: values.visibility === 'personal' ? null : values.organizationId,
        packageUrl: uploadedPackageUrl,
        version: normalizeOptionalField(values.version),
        sourceFrom: normalizeOptionalField(values.sourceFrom),
        sourceUrl: normalizeOptionalField(values.sourceUrl),
        sourceAuthor: normalizeOptionalField(values.sourceAuthor),
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        toast({ title: isEditing ? 'Skill 已更新' : 'Skill 已创建' })
        clearSelectedPackage()
        onOpenChange(false)
        await onSuccess()
      } else {
        const error = await res.json()
        toast({ title: '错误', description: error.error, variant: 'destructive' })
      }
    } catch (error) {
      const description = error instanceof Error ? error.message : '保存失败'
      toast({ title: '错误', description, variant: 'destructive' })
    } finally {
      setIsPackageUploading(false)
      setIsLoading(false)
    }
  }

  const packageUploadBlockedReason = getPackageUploadBlockedReason(form.getValues())
  const normalizedPackageUrl = normalizeOptionalField(packageUrl)
  const isCurrentPackageUploadReady = !!packageFile
    && !!packageUploadSignature
    && uploadedPackageSignature === packageUploadSignature
    && normalizedPackageUrl !== null
    && uploadedPackageUrl === normalizedPackageUrl
    && !isPackageUrlManuallyEdited
  const packageUploadNeedsRefresh = !!packageFile
    && !!packageUploadSignature
    && !isPackageUrlManuallyEdited
    && uploadedPackageSignature !== packageUploadSignature
  const packageStatusTitle = isPackageUploading
    ? '正在上传压缩包'
    : isCurrentPackageUploadReady
      ? '压缩包已上传'
      : isPackageUrlManuallyEdited && normalizedPackageUrl
        ? '已手动覆盖地址'
        : packageUploadNeedsRefresh
          ? '压缩包待更新'
          : packageFile
            ? '压缩包已选择'
            : normalizedPackageUrl
              ? '已配置客户端包地址'
              : '拖拽或点击上传 zip 包'
  const packageStatusDescription = packageFile
    ? `${packageFile.name} · ${(packageFile.size / 1024 / 1024).toFixed(2)} MB`
    : normalizedPackageUrl ?? '选择 zip 后会自动上传并回填客户端包地址。'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[980px]">
        <DialogHeader className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-6 pb-4 pt-6">
          <DialogTitle className="text-[22px] text-slate-950">
            {isEditing ? '编辑 Skill' : '新建 Skill'}
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            这里同时维护后台资源信息和客户端展示信息。字段已经按用途分区，尽量减少纵向滚动和来回找字段的成本。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <FormSection
                title="基础配置"
                description="先定义资源身份和权限范围，这部分会影响后台管理和授权流程。"
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>名称</FormLabel>
                      <FormControl><Input {...field} placeholder="Email Assistant" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="identifier" render={({ field }) => (
                    <FormItem>
                      <FormLabel>标识符</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="github-skill" disabled={isEditing} />
                      </FormControl>
                      {isEditing && <FormDescription>标识符创建后不再修改，保持客户端引用稳定。</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField control={form.control} name="visibility" render={({ field }) => (
                    <FormItem>
                      <FormLabel>可见性</FormLabel>
                      <Select
                        onValueChange={(value) => { handleVisibilityChange(value); field.onChange(value) }}
                        defaultValue={field.value}
                        disabled={isEditing}
                      >
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {!departmentOnly && !personalOnly && <SelectItem value="company">公司级</SelectItem>}
                          {!personalOnly && <SelectItem value="department">部门级</SelectItem>}
                          {!departmentOnly && <SelectItem value="personal">个人级</SelectItem>}
                        </SelectContent>
                      </Select>
                      {isPersonal && (
                        <FormDescription>个人级技能仅对您可见</FormDescription>
                      )}
                      {isEditing && !isPersonal && (
                        <FormDescription>可见范围创建后保持不变，避免影响已授权关系。</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  {!isPersonal && !personalOnly ? (
                    <FormField control={form.control} name="organizationId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>所属组织</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isEditing}>
                          <FormControl><SelectTrigger><SelectValue placeholder="选择组织" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {availableOrganizations.map(org => (
                              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isEditing && <FormDescription>所属组织创建后不支持直接修改。</FormDescription>}
                        <FormMessage />
                      </FormItem>
                    )} />
                  ) : (
                    <div className="hidden lg:block" />
                  )}
                </div>
              </FormSection>

              <FormSection
                title="展示文案"
                description="这部分主要给客户端和目录页使用，尽量一次把文案信息整理完整。"
              >
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>概述</FormLabel>
                    <FormControl><Textarea {...field} className="min-h-[112px]" placeholder="用于后台管理和站内展示的通用说明" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField control={form.control} name="descriptionEn" render={({ field }) => (
                    <FormItem>
                      <FormLabel>英文描述</FormLabel>
                      <FormControl><Textarea {...field} className="min-h-[96px]" placeholder="Read and send email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="descriptionZh" render={({ field }) => (
                    <FormItem>
                      <FormLabel>中文描述</FormLabel>
                      <FormControl><Textarea {...field} className="min-h-[96px]" placeholder="收发邮件" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField
                  control={form.control}
                  name="tags"
                  render={() => (
                    <FormItem>
                      <FormLabel>标签</FormLabel>
                      <FormControl>
                        <div className="space-y-3 rounded-[22px] border border-slate-200/80 bg-white/85 p-4">
                          {isTagsLoading ? (
                            <p className="text-sm text-slate-500">正在加载标签选项...</p>
                          ) : visibleTagOptions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {visibleTagOptions.map((tag) => {
                                const checked = selectedTags.includes(tag.id)

                                return (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleTag(tag.id)}
                                    className={`rounded-2xl border px-3 py-2 text-left transition ${
                                      checked
                                        ? 'border-slate-900 bg-slate-900 text-white shadow-[0_10px_26px_-18px_rgba(15,23,42,0.7)]'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="text-sm font-medium">{tag.zh}</div>
                                    <div className={`text-xs ${checked ? 'text-slate-300' : 'text-slate-400'}`}>
                                      {tag.en} · {tag.id}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">暂无可用标签，请先在标签管理里创建。</p>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        新建 Skill 时只能从标签管理字典中选择；历史标签会自动保留，避免编辑时丢失。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSection
                title="发布信息"
                description="这里填写客户端能看到的版本与来源信息，用来支撑下载、追溯和目录展示。"
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
                  <FormItem className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)]">
                    <FormLabel>上传 Skill zip</FormLabel>
                    <FormControl>
                      <Input
                        ref={packageInputRef}
                        type="file"
                        accept=".zip,application/zip"
                        className="hidden"
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null
                          setPackageFile(nextFile)
                          setUploadedPackageSignature(null)
                          setUploadedPackageUrl(null)
                          setIsPackageUrlManuallyEdited(false)
                          packageUploadRequestIdRef.current += 1
                          form.setValue('packageUrl', '', { shouldDirty: true, shouldValidate: true })
                        }}
                        disabled={isLoading || isPackageUploading}
                      />
                    </FormControl>
                    <div className="mt-3 rounded-[22px] border border-dashed border-slate-300 bg-white/90 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                            {isPackageUploading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : isCurrentPackageUploadReady ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <UploadCloud className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{packageStatusTitle}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-500">{packageStatusDescription}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => packageInputRef.current?.click()}
                            disabled={isLoading || isPackageUploading}
                          >
                            {packageFile ? '重新选择' : '选择文件'}
                          </Button>
                          {packageFile ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="rounded-full text-slate-500 hover:text-slate-900"
                              onClick={clearSelectedPackage}
                              disabled={isLoading || isPackageUploading}
                            >
                              清空
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <FormDescription>
                      {isPackageUploading
                        ? '正在上传到本地文件存储，完成后会自动回填到右侧地址框。'
                        : packageUploadNeedsRefresh
                          ? packageUploadBlockedReason ?? '检测到标识符、版本或可见范围发生变化，会按最新配置重新上传。'
                          : isCurrentPackageUploadReady
                            ? '上传完成，客户端包地址已自动回填；你仍然可以手动覆盖成其他分发链接。'
                            : isPackageUrlManuallyEdited && normalizedPackageUrl
                              ? '当前地址已改为手动输入，不会再被自动上传结果覆盖。'
                              : normalizedPackageUrl
                                ? '当前使用已有客户端包地址；如需替换，可重新上传或手动修改。'
                                : packageUploadBlockedReason ?? `支持 zip 文件，最大 ${SKILL_PACKAGE_MAX_MB}MB。留空时仍可手动填写客户端包地址。`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                  <FormField control={form.control} name="packageUrl" render={({ field }) => (
                    <FormItem className="rounded-[24px] border border-slate-200/80 bg-white/88 p-5">
                      <FormLabel>客户端包地址</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://example.com/skills/imap-smtp-email.zip"
                          disabled={isLoading || isPackageUploading}
                          className="font-mono text-xs"
                          onChange={(event) => {
                            field.onChange(event)
                            setIsPackageUrlManuallyEdited(normalizeOptionalField(event.target.value) !== uploadedPackageUrl)
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        客户端展示的下载或安装地址。上传 zip 后会自动回填，也可以手动覆盖成其他分发链接。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <FormField control={form.control} name="version" render={({ field }) => (
                    <FormItem>
                      <FormLabel>版本</FormLabel>
                      <FormControl><Input {...field} placeholder="1.2.0" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid gap-4 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
                  <FormField control={form.control} name="sourceFrom" render={({ field }) => (
                    <FormItem>
                      <FormLabel>来源平台</FormLabel>
                      <FormControl><Input {...field} placeholder="GitHub" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sourceAuthor" render={({ field }) => (
                    <FormItem>
                      <FormLabel>来源作者</FormLabel>
                      <FormControl><Input {...field} placeholder="someone" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sourceUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>来源地址</FormLabel>
                      <FormControl><Input {...field} placeholder="https://github.com/org/imap-smtp-email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </FormSection>
            </div>

            <div className="shrink-0 border-t border-slate-200/80 bg-white/95 px-6 py-4">
              <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isLoading || isPackageUploading} className="min-w-[112px]">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? '保存' : '创建'}
              </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

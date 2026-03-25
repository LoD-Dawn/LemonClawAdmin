'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/hooks/use-toast'
import { KeyRound, Loader2, PlusCircle, Tags, TerminalSquare, Trash2 } from 'lucide-react'
import { parseLineSeparatedValues, toLineSeparatedValues } from '@/lib/mcp-config'
import type { SkillTagOption } from '@/lib/skill-tags'

type EnvVarRequirement = 'required' | 'optional'

const envVarEntrySchema = z.object({
  id: z.string(),
  key: z.string().trim().min(1, '请输入环境变量名').max(100, '环境变量名不能超过 100 个字符'),
  requirement: z.enum(['required', 'optional']),
})

const formSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,62}$/),
  name: z.string().min(1),
  description_zh: z.string().optional(),
  description_en: z.string().optional(),
  category: z.string().min(1, '请选择分类标签'),
  transportType: z.string().min(1),
  command: z.string().min(1),
  defaultArgsText: z.string().optional(),
  envVarEntries: z.array(envVarEntrySchema).max(100),
  visibility: z.enum(['company', 'department', 'personal']),
  organizationId: z.string().uuid().nullable(),
}).refine(
  (data) => {
    if (data.visibility === 'personal') return true
    return data.organizationId !== null && data.organizationId !== undefined
  },
  { message: '公司级/部门级可见性需要选择所属组织', path: ['organizationId'] }
)

type McpFormValues = z.infer<typeof formSchema>

type EditableMcp = {
  id: string
  name?: string | null
  mcpId?: string | null
  descriptionZh?: string | null
  descriptionEn?: string | null
  category?: string | null
  transportType?: string | null
  command?: string | null
  defaultArgs?: string[] | null
  requiredEnvKeys?: string[] | null
  optionalEnvKeys?: string[] | null
  visibility?: 'company' | 'department' | 'personal' | null
  organizationId?: string | null
}

type McpFormOrganization = {
  id: string
  name: string
}

function createEnvVarEntry(key = '', requirement: EnvVarRequirement = 'required') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key,
    requirement,
  }
}

function toEnvVarEntries(requiredEnvKeys?: string[] | null, optionalEnvKeys?: string[] | null) {
  return [
    ...(requiredEnvKeys ?? []).map((key) => createEnvVarEntry(key, 'required')),
    ...(optionalEnvKeys ?? []).map((key) => createEnvVarEntry(key, 'optional')),
  ]
}

function splitEnvVarEntries(entries: McpFormValues['envVarEntries']) {
  const requiredSet = new Set<string>()
  const optionalSet = new Set<string>()

  entries.forEach((entry) => {
    const normalizedKey = entry.key.trim()
    if (!normalizedKey) {
      return
    }

    if (entry.requirement === 'required') {
      requiredSet.add(normalizedKey)
      optionalSet.delete(normalizedKey)
      return
    }

    if (!requiredSet.has(normalizedKey)) {
      optionalSet.add(normalizedKey)
    }
  })

  return {
    requiredEnvKeys: Array.from(requiredSet),
    optionalEnvKeys: Array.from(optionalSet),
  }
}

function toFormValues(
  mcp: EditableMcp | null,
  departmentOnly: boolean,
  personalOnly: boolean,
  managedDepartmentId: string | null
): McpFormValues {
  if (mcp) {
    return {
      id: mcp.mcpId ?? '',
      name: mcp.name ?? '',
      description_zh: mcp.descriptionZh ?? '',
      description_en: mcp.descriptionEn ?? '',
      category: mcp.category ?? '',
      transportType: mcp.transportType ?? 'stdio',
      command: mcp.command ?? '',
      defaultArgsText: toLineSeparatedValues(mcp.defaultArgs),
      envVarEntries: toEnvVarEntries(mcp.requiredEnvKeys, mcp.optionalEnvKeys),
      visibility: mcp.visibility ?? (personalOnly ? 'personal' : departmentOnly ? 'department' : 'company'),
      organizationId: mcp.organizationId ?? (departmentOnly ? managedDepartmentId : null),
    }
  }

  return {
    id: '',
    name: '',
    description_zh: '',
    description_en: '',
    category: '',
    transportType: 'stdio',
    command: '',
    defaultArgsText: '',
    envVarEntries: [],
    visibility: personalOnly ? 'personal' : departmentOnly ? 'department' : 'company',
    organizationId: departmentOnly ? managedDepartmentId : null,
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

export function McpFormDialog({
  open,
  onOpenChange,
  mcp,
  organizations,
  managementMode,
  managedDepartmentId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mcp: EditableMcp | null
  organizations: McpFormOrganization[]
  managementMode: 'super_admin' | 'department_admin' | 'personal'
  managedDepartmentId: string | null
  onSuccess: () => Promise<void>
}) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [tagOptions, setTagOptions] = useState<SkillTagOption[]>([])
  const [isTagsLoading, setIsTagsLoading] = useState(false)
  const isEditing = !!mcp
  const departmentOnly = managementMode === 'department_admin'
  const personalOnly = managementMode === 'personal'
  const availableOrganizations = departmentOnly
    ? organizations.filter((organization) => organization.id === managedDepartmentId)
    : organizations
  const defaultValues = toFormValues(mcp, departmentOnly, personalOnly, managedDepartmentId)

  const form = useForm<McpFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const envVarFields = useFieldArray({
    control: form.control,
    name: 'envVarEntries',
    keyName: 'fieldKey',
  })

  useEffect(() => {
    form.reset(toFormValues(mcp, departmentOnly, personalOnly, managedDepartmentId))
  }, [mcp, personalOnly, departmentOnly, managedDepartmentId, form])

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
  const selectedCategory = useWatch({ control: form.control, name: 'category' })
  const isPersonal = visibility === 'personal'
  const categoryExists = tagOptions.some((tag) => tag.id === selectedCategory)
  const visibleTagOptions = selectedCategory && !categoryExists
    ? [...tagOptions, { id: selectedCategory, en: selectedCategory, zh: `${selectedCategory}（历史标签）` }]
    : tagOptions

  const handleVisibilityChange = (value: McpFormValues['visibility']) => {
    if (value === 'personal' || personalOnly) {
      form.setValue('organizationId', null)
    } else if (departmentOnly) {
      form.setValue('organizationId', managedDepartmentId)
    }
    form.setValue('visibility', value)
  }

  async function onSubmit(values: McpFormValues) {
    setIsLoading(true)
    const method = isEditing ? 'PUT' : 'POST'
    const url = isEditing ? `/api/v1/mcps/${mcp.id}` : '/api/v1/mcps'
    const { requiredEnvKeys, optionalEnvKeys } = splitEnvVarEntries(values.envVarEntries)

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: values.id,
          name: values.name,
          description_zh: values.description_zh?.trim() || undefined,
          description_en: values.description_en?.trim() || undefined,
          category: values.category,
          transportType: values.transportType,
          command: values.command,
          defaultArgs: parseLineSeparatedValues(values.defaultArgsText ?? ''),
          requiredEnvKeys,
          optionalEnvKeys,
          visibility: values.visibility,
          organizationId: values.visibility === 'personal' ? null : values.organizationId,
        }),
      })

      if (res.ok) {
        toast({ title: isEditing ? 'MCP 已更新' : 'MCP 已创建' })
        onOpenChange(false)
        await onSuccess()
      } else {
        const error = await res.json()
        toast({ title: '错误', description: error.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: '错误', description: '保存失败', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[980px]">
        <DialogHeader className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-6 pb-4 pt-6">
          <DialogTitle className="text-[22px] text-slate-950">
            {isEditing ? '编辑 MCP' : '新建 MCP'}
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            把 MCP 的身份、接入方式和运行参数一次配完整。表单按使用场景重新拆分后，信息更集中，也更接近 Skill 的录入体验。
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <FormSection
                title="基础配置"
                description="先确定 MCP 的身份、分类和权限范围，这些字段会直接影响后台管理与客户端展示。"
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>名称</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Filesystem MCP" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MCP ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="filesystem" />
                        </FormControl>
                        <FormDescription>建议保持稳定，便于客户端和配置模板长期引用。</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>可见性</FormLabel>
                        <Select onValueChange={handleVisibilityChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {!departmentOnly && !personalOnly && <SelectItem value="company">公司级</SelectItem>}
                            {!personalOnly && <SelectItem value="department">部门级</SelectItem>}
                            {!departmentOnly && <SelectItem value="personal">个人级</SelectItem>}
                          </SelectContent>
                        </Select>
                        {isPersonal ? (
                          <FormDescription>个人级 MCP 只对当前账号可见。</FormDescription>
                        ) : (
                          <FormDescription>创建后就能按组织范围进行统一授权和管理。</FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!isPersonal && !personalOnly ? (
                    <FormField
                      control={form.control}
                      name="organizationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>所属组织</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="选择组织" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableOrganizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="hidden lg:block" />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="category"
                  render={() => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <Tags className="h-4 w-4 text-slate-400" />
                        <FormLabel>分类标签</FormLabel>
                      </div>
                      <FormControl>
                        <div className="space-y-3 rounded-[22px] border border-slate-200/80 bg-white/85 p-4">
                          {isTagsLoading ? (
                            <p className="text-sm text-slate-500">正在加载标签字典...</p>
                          ) : visibleTagOptions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {visibleTagOptions.map((tag) => {
                                const checked = selectedCategory === tag.id

                                return (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => form.setValue('category', tag.id, { shouldDirty: true, shouldValidate: true })}
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
                            <p className="text-sm text-slate-500">暂无可用标签，请先在标签管理里维护分类字典。</p>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        分类和 Skill 一样从标签字典里选。历史分类会自动保留，避免编辑旧数据时丢失。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSection
                title="接入方式"
                description="这里定义 MCP 的运行入口和默认启动参数，尽量填写成可以直接复用的标准模板。"
              >
                <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
                  <FormField
                    control={form.control}
                    name="transportType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>传输类型</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="stdio" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="command"
                    render={({ field }) => (
                      <FormItem className="rounded-[24px] border border-slate-200/80 bg-white/88 p-5">
                        <div className="flex items-center gap-2">
                          <TerminalSquare className="h-4 w-4 text-slate-400" />
                          <FormLabel>启动命令</FormLabel>
                        </div>
                        <FormControl>
                          <Input {...field} placeholder="npx" />
                        </FormControl>
                        <FormDescription>例如 `npx`、`uvx`、`node` 或具体可执行文件路径。</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="defaultArgsText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>默认参数</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ''}
                          className="min-h-[120px]"
                          placeholder="-y&#10;@modelcontextprotocol/server-filesystem&#10;."
                        />
                      </FormControl>
                      <FormDescription>每行一个参数，提交后会自动写入 `defaultArgs` 数组。</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSection
                title="环境变量"
                description="改成分组式录入后，一行就是一组变量配置，可以随时增加、删除，也能明确区分必需和可选。"
              >
                <FormField
                  control={form.control}
                  name="envVarEntries"
                  render={() => (
                    <FormItem>
                      <FormControl>
                        <div className="space-y-3 rounded-[22px] border border-slate-200/80 bg-white/85 p-4">
                          {envVarFields.fields.length > 0 ? (
                            envVarFields.fields.map((field, index) => (
                              <div
                                key={field.fieldKey}
                                className="grid gap-3 rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]"
                              >
                                <FormField
                                  control={form.control}
                                  name={`envVarEntries.${index}.key`}
                                  render={({ field: envField }) => (
                                    <FormItem>
                                      <FormLabel>环境变量名</FormLabel>
                                      <FormControl>
                                        <Input {...envField} placeholder="OPENAI_API_KEY" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`envVarEntries.${index}.requirement`}
                                  render={({ field: envField }) => (
                                    <FormItem>
                                      <FormLabel>类型</FormLabel>
                                      <Select onValueChange={envField.onChange} value={envField.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="required">必需</SelectItem>
                                          <SelectItem value="optional">可选</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full rounded-2xl border-dashed lg:w-auto"
                                    onClick={() => envVarFields.remove(index)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    删除
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm leading-6 text-slate-500">
                              还没有配置环境变量组。需要时直接新增一行，每行填写一个变量和它的要求级别。
                            </div>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => envVarFields.append(createEnvVarEntry())}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            新增环境变量组
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        提交时会自动按“必需 / 可选”拆分回原有字段，所以现有接口和客户端配置不需要同步改动。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSection
                title="展示文案"
                description="给管理后台和客户端准备中英文说明，后续检索、授权页和目录卡片都会复用这些信息。"
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="description_zh"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>中文描述</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ''} className="min-h-[104px]" placeholder="用于本地文件读写与目录操作" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>英文描述</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ''} className="min-h-[104px]" placeholder="Access files and directories from the local workspace" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </FormSection>
            </div>

            <div className="shrink-0 border-t border-slate-200/80 bg-white/95 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
                  <KeyRound className="h-4 w-4" />
                  <span>字段已按配置、运行和展示分区，录入会更顺手一些。</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    取消
                  </Button>
                  <Button type="submit" disabled={isLoading} className="min-w-[112px]">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? '保存' : '创建'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

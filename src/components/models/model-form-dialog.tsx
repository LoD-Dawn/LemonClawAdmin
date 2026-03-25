'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/hooks/use-toast'
import { Loader2, PlusCircle, Sparkles, Star, Trash2 } from 'lucide-react'
import { modelItemIdPattern, modelProviderKeyPattern } from '@/lib/model-config'
import {
  CHINA_PROVIDER_KEYS,
  EN_PRIORITY_PROVIDER_KEYS,
  GLOBAL_PROVIDER_KEYS,
  MODEL_PROVIDER_PRESETS,
  MODEL_PROVIDER_PRESET_OPTIONS,
} from '@/lib/model-provider-presets'

const formSchema = z.object({
  name: z.string().min(1),
  providerKey: z.string().regex(modelProviderKeyPattern),
  visibility: z.enum(['company', 'department', 'personal']),
  organizationId: z.string().uuid().nullable(),
  enabled: z.boolean(),
  apiKeyMode: z.enum(['keep', 'replace', 'clear']),
  apiKey: z.string(),
  baseUrl: z.string(),
  apiFormat: z.string().min(1),
  codingPlanEnabled: z.boolean(),
  isDefault: z.boolean(),
  defaultModelId: z.string().regex(modelItemIdPattern).nullable(),
  models: z.array(z.object({
    id: z.string().regex(modelItemIdPattern),
    name: z.string().min(1),
    supportsImage: z.boolean(),
  })).min(1),
}).superRefine((value, context) => {
  if (value.visibility !== 'personal' && !value.organizationId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: '公司级/部门级可见性需要选择所属组织',
      path: ['organizationId'],
    })
  }

  if (value.defaultModelId && !value.models.some((model) => model.id === value.defaultModelId)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: '默认模型必须来自当前模型清单',
      path: ['defaultModelId'],
    })
  }

  const uniqueIds = new Set(value.models.map((model) => model.id))
  if (uniqueIds.size !== value.models.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: '同一提供商下模型 ID 不能重复',
      path: ['models'],
    })
  }
})

type ModelFormValues = z.infer<typeof formSchema>

type EditableProvider = {
  id: string
  name: string
  providerKey: string
  visibility: 'company' | 'department' | 'personal'
  organizationId?: string | null
  enabled: boolean
  hasApiKey?: boolean
  baseUrl?: string | null
  apiFormat: string
  codingPlanEnabled: boolean
  isDefault: boolean
  defaultModelId?: string | null
  models: Array<{
    id: string
    modelId?: string
    name: string
    supportsImage: boolean
  }>
}

type ModelFormOrganization = {
  id: string
  name: string
}

function normalizeOptionalField(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function toFormValues(
  provider: EditableProvider | null,
  departmentOnly: boolean,
  personalOnly: boolean,
  managedDepartmentId: string | null
): ModelFormValues {
  if (provider) {
    const models = provider.models.map((model) => ({
      id: model.modelId ?? model.id,
      name: model.name,
      supportsImage: model.supportsImage,
    }))

    return {
      name: provider.name ?? '',
      providerKey: provider.providerKey ?? '',
      visibility: provider.visibility ?? (personalOnly ? 'personal' : departmentOnly ? 'department' : 'company'),
      organizationId: provider.organizationId ?? (departmentOnly ? managedDepartmentId : null),
      enabled: provider.enabled ?? true,
      apiKeyMode: provider.hasApiKey ? 'keep' : 'replace',
      apiKey: '',
      baseUrl: provider.baseUrl ?? '',
      apiFormat: provider.apiFormat ?? 'openai',
      codingPlanEnabled: provider.codingPlanEnabled ?? false,
      isDefault: provider.isDefault ?? false,
      defaultModelId: provider.defaultModelId ?? models[0]?.id ?? null,
      models: models.length > 0 ? models : [{ id: '', name: '', supportsImage: false }],
    }
  }

  return {
    name: '',
    providerKey: '',
    visibility: personalOnly ? 'personal' : departmentOnly ? 'department' : 'company',
    organizationId: departmentOnly ? managedDepartmentId : null,
    enabled: true,
    apiKeyMode: 'replace',
    apiKey: '',
    baseUrl: '',
    apiFormat: 'openai',
    codingPlanEnabled: false,
    isDefault: false,
    defaultModelId: null,
    models: [{ id: '', name: '', supportsImage: false }],
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

function BooleanSelect({
  value,
  onChange,
  trueLabel,
  falseLabel,
  disabled,
}: {
  value: boolean
  onChange: (value: boolean) => void
  trueLabel: string
  falseLabel: string
  disabled?: boolean
}) {
  return (
    <Select value={String(value)} onValueChange={(nextValue) => onChange(nextValue === 'true')} disabled={disabled}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="true">{trueLabel}</SelectItem>
        <SelectItem value="false">{falseLabel}</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function ModelFormDialog({
  open,
  onOpenChange,
  provider,
  organizations,
  managementMode,
  managedDepartmentId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: EditableProvider | null
  organizations: ModelFormOrganization[]
  managementMode: 'super_admin' | 'department_admin' | 'personal'
  managedDepartmentId: string | null
  onSuccess: () => Promise<void>
}) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPresetKey, setSelectedPresetKey] = useState('')
  const isEditing = !!provider
  const departmentOnly = managementMode === 'department_admin'
  const personalOnly = managementMode === 'personal'
  const availableOrganizations = departmentOnly
    ? organizations.filter((organization) => organization.id === managedDepartmentId)
    : organizations

  const form = useForm<ModelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(provider, departmentOnly, personalOnly, managedDepartmentId),
  })

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'models',
  })

  useEffect(() => {
    form.reset(toFormValues(provider, departmentOnly, personalOnly, managedDepartmentId))
    setSelectedPresetKey('')
  }, [provider, departmentOnly, personalOnly, managedDepartmentId, form])

  const visibility = useWatch({ control: form.control, name: 'visibility' })
  const apiKeyMode = useWatch({ control: form.control, name: 'apiKeyMode' })
  const watchedModels = useWatch({ control: form.control, name: 'models' })
  const defaultModelId = useWatch({ control: form.control, name: 'defaultModelId' })
  const isPersonal = visibility === 'personal'

  useEffect(() => {
    if (isPersonal || personalOnly) {
      form.setValue('organizationId', null)
    } else if (departmentOnly) {
      form.setValue('organizationId', managedDepartmentId)
    }
  }, [departmentOnly, form, isPersonal, managedDepartmentId, personalOnly])

  useEffect(() => {
    const models = watchedModels ?? []

    if (!defaultModelId && models[0]?.id) {
      form.setValue('defaultModelId', models[0].id)
      return
    }

    if (defaultModelId && !models.some((model) => model.id === defaultModelId)) {
      form.setValue('defaultModelId', models[0]?.id ?? null)
    }
  }, [defaultModelId, form, watchedModels])

  function applyProviderPreset(presetKey: string) {
    const preset = MODEL_PROVIDER_PRESETS[presetKey]
    if (!preset) {
      return
    }

    setSelectedPresetKey(presetKey)
    form.setValue('name', preset.label, { shouldDirty: true })
    form.setValue('providerKey', presetKey, { shouldDirty: true })
    form.setValue('enabled', preset.enabled, { shouldDirty: true })
    form.setValue('apiKey', preset.apiKey, { shouldDirty: true })
    form.setValue('baseUrl', preset.baseUrl, { shouldDirty: true })
    form.setValue('apiFormat', preset.apiFormat, { shouldDirty: true })
    form.setValue('codingPlanEnabled', preset.codingPlanEnabled ?? false, { shouldDirty: true })

    replace(
      preset.models.length > 0
        ? preset.models.map((model) => ({
            id: model.id,
            name: model.name,
            supportsImage: model.supportsImage,
          }))
        : [{ id: '', name: '', supportsImage: false }]
    )

    form.setValue('defaultModelId', preset.models[0]?.id ?? null, { shouldDirty: true })
  }

  async function onSubmit(values: ModelFormValues) {
    setIsLoading(true)
    const method = isEditing ? 'PUT' : 'POST'
    const url = isEditing ? `/api/v1/models/${provider.id}` : '/api/v1/models'

    try {
      const normalizedApiKey = normalizeOptionalField(values.apiKey)
      if (isEditing && values.apiKeyMode === 'replace' && !normalizedApiKey) {
        form.setError('apiKey', { message: '请输入新的 API Key' })
        setIsLoading(false)
        return
      }

      const payload = {
        name: values.name.trim(),
        providerKey: values.providerKey.trim(),
        visibility: values.visibility,
        organizationId: values.visibility === 'personal' ? null : values.organizationId,
        enabled: values.enabled,
        baseUrl: normalizeOptionalField(values.baseUrl),
        apiFormat: values.apiFormat.trim(),
        codingPlanEnabled: values.codingPlanEnabled,
        isDefault: values.isDefault,
        defaultModelId: values.defaultModelId,
        models: values.models.map((model) => ({
          id: model.id.trim(),
          name: model.name.trim(),
          supportsImage: model.supportsImage,
        })),
        ...(!isEditing
          ? { apiKey: normalizedApiKey }
          : values.apiKeyMode === 'replace'
          ? { apiKey: normalizedApiKey, clearApiKey: false }
          : values.apiKeyMode === 'clear'
          ? { clearApiKey: true }
          : {}),
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast({ title: isEditing ? '模型提供商已更新' : '模型提供商已创建' })
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
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1080px]">
        <DialogHeader className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-6 pb-4 pt-6">
          <DialogTitle className="text-[22px] text-slate-950">
            {isEditing ? '编辑模型提供商' : '新建模型提供商'}
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            这里维护的是客户端直接消费的模型配置。一个提供商下可以配置多条模型，并指定默认模型与默认提供商。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {!isEditing ? (
                <FormSection
                  title="预设模板"
                  description="先选供应商模板，系统会自动填入对应的地址、协议和模型列表，你只需要补 API Key 或做少量调整。"
                >
                  <div className="space-y-4">
                    <FormItem>
                      <FormLabel>供应商预设</FormLabel>
                      <Select value={selectedPresetKey} onValueChange={applyProviderPreset}>
                        <FormControl><SelectTrigger><SelectValue placeholder="选择供应商模板" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {MODEL_PROVIDER_PRESET_OPTIONS.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {option.label} · {option.key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {selectedPresetKey
                          ? `已应用 ${MODEL_PROVIDER_PRESETS[selectedPresetKey]?.label ?? selectedPresetKey} 预设，下面的字段都可以继续改。`
                          : '建议先选一个常用供应商模板，再确认可见范围、默认模型和 API Key。'}
                      </FormDescription>
                    </FormItem>
                    <div className="rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3 text-xs leading-6 text-slate-500">
                      国际：{GLOBAL_PROVIDER_KEYS.join(' / ')}
                      <br />
                      国内：{CHINA_PROVIDER_KEYS.join(' / ')}
                      <br />
                      英文优先：{EN_PRIORITY_PROVIDER_KEYS.join(' / ')}
                    </div>
                  </div>
                </FormSection>
              ) : null}

              <FormSection
                title="基础范围"
                description="先明确提供商身份和可见范围，和 Skill/MCP 一样，这会影响后台能看到和能编辑这条配置的人。"
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>名称</FormLabel>
                      <FormControl><Input {...field} placeholder="Qwen Provider" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="providerKey" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Key</FormLabel>
                      <FormControl><Input {...field} placeholder="qwen" disabled={isEditing} /></FormControl>
                      {isEditing ? <FormDescription>Provider Key 创建后保持稳定，便于客户端按 key 取值。</FormDescription> : null}
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField control={form.control} name="visibility" render={({ field }) => (
                    <FormItem>
                      <FormLabel>可见性</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {!departmentOnly && !personalOnly ? <SelectItem value="company">公司级</SelectItem> : null}
                          {!personalOnly ? <SelectItem value="department">部门级</SelectItem> : null}
                          {!departmentOnly ? <SelectItem value="personal">个人级</SelectItem> : null}
                        </SelectContent>
                      </Select>
                      {isEditing ? <FormDescription>创建后不再修改可见范围，避免客户端覆盖关系发生跳变。</FormDescription> : null}
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
                            {availableOrganizations.map((organization) => (
                              <SelectItem key={organization.id} value={organization.id}>
                                {organization.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isEditing ? <FormDescription>所属组织创建后不支持直接修改。</FormDescription> : null}
                        <FormMessage />
                      </FormItem>
                    )} />
                  ) : (
                    <div className="hidden lg:block" />
                  )}
                </div>
              </FormSection>

              <FormSection
                title="接入配置"
                description="这些字段会进入客户端模型配置；其中 API Key 会以密文存库，并在服务端下发时按需解密。"
              >
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                  <FormField control={form.control} name="enabled" render={({ field }) => (
                    <FormItem>
                      <FormLabel>启用状态</FormLabel>
                      <FormControl>
                        <BooleanSelect value={field.value} onChange={field.onChange} trueLabel="启用" falseLabel="停用" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="apiFormat" render={({ field }) => (
                    <FormItem>
                      <FormLabel>API 格式</FormLabel>
                      <FormControl><Input {...field} placeholder="openai" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="codingPlanEnabled" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coding Plan</FormLabel>
                      <FormControl>
                        <BooleanSelect value={field.value} onChange={field.onChange} trueLabel="开启" falseLabel="关闭" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="isDefault" render={({ field }) => (
                    <FormItem>
                      <FormLabel>默认提供商</FormLabel>
                      <FormControl>
                        <BooleanSelect value={field.value} onChange={field.onChange} trueLabel="设为默认" falseLabel="非默认" />
                      </FormControl>
                      <FormDescription>客户端会优先取启用状态下被标记为默认的提供商。</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                  <FormField control={form.control} name="baseUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base URL</FormLabel>
                      <FormControl><Input {...field} placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="space-y-4">
                    {isEditing ? (
                      <FormField control={form.control} name="apiKeyMode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key 处理方式</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="keep">保留当前密钥</SelectItem>
                              <SelectItem value="replace">更新为新密钥</SelectItem>
                              <SelectItem value="clear">清空密钥</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {provider?.hasApiKey
                              ? '当前密钥已加密存储，不会在后台明文回显。'
                              : '当前未保存 API Key。'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ) : null}
                    {!isEditing || apiKeyMode === 'replace' ? (
                      <FormField control={form.control} name="apiKey" render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl><Input {...field} placeholder="sk-..." type="password" autoComplete="new-password" /></FormControl>
                          <FormDescription>
                            {isEditing
                              ? '输入新密钥后会加密保存；客户端真正下发配置时，服务端会按需解密。'
                              : '保存时会加密入库；客户端真正下发配置时，服务端会按需解密。'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ) : null}
                    {isEditing && apiKeyMode === 'keep' ? (
                      <div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-500">
                        保留现有密钥，不会覆盖数据库中的加密值。
                      </div>
                    ) : null}
                    {isEditing && apiKeyMode === 'clear' ? (
                      <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        当前保存后会清空这个提供商的 API Key。
                      </div>
                    ) : null}
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="模型清单"
                description="模型列表会按当前顺序输出给客户端。默认模型必须来自这里，可以随时切换。"
              >
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const currentModelId = watchedModels?.[index]?.id || ''
                    const isCurrentDefault = defaultModelId === currentModelId

                    return (
                      <div key={field.id} className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_auto]">
                          <FormField control={form.control} name={`models.${index}.id`} render={({ field: modelField }) => (
                            <FormItem>
                              <FormLabel>模型 ID</FormLabel>
                              <FormControl><Input {...modelField} placeholder="qwen3.5-plus" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`models.${index}.name`} render={({ field: modelField }) => (
                            <FormItem>
                              <FormLabel>展示名称</FormLabel>
                              <FormControl><Input {...modelField} placeholder="Qwen3.5 Plus" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`models.${index}.supportsImage`} render={({ field: modelField }) => (
                            <FormItem>
                              <FormLabel>图片支持</FormLabel>
                              <FormControl>
                                <BooleanSelect
                                  value={modelField.value}
                                  onChange={modelField.onChange}
                                  trueLabel="支持"
                                  falseLabel="不支持"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="flex items-end justify-end gap-2">
                            <Button
                              type="button"
                              variant={isCurrentDefault ? 'default' : 'outline'}
                              className="min-w-[112px]"
                              onClick={() => form.setValue('defaultModelId', currentModelId || null, { shouldDirty: true })}
                              disabled={!currentModelId}
                            >
                              {isCurrentDefault ? <Star className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                              {isCurrentDefault ? '默认模型' : '设为默认'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const removedModelId = watchedModels?.[index]?.id
                                remove(index)
                                if (removedModelId && removedModelId === form.getValues('defaultModelId')) {
                                  const nextModels = form.getValues('models')
                                  form.setValue('defaultModelId', nextModels[0]?.id ?? null)
                                }
                              }}
                              disabled={fields.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ id: '', name: '', supportsImage: false })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    添加模型
                  </Button>
                </div>
              </FormSection>
            </div>

            <div className="shrink-0 border-t border-slate-200/80 bg-white/95 px-6 py-4">
              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={isLoading} className="min-w-[112px]">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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

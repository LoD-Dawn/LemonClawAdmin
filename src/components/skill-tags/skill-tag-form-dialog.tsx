'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const tagIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/

const formSchema = z.object({
  id: z.string().regex(tagIdPattern, '标签 ID 仅支持小写字母、数字和连字符'),
  en: z.string().trim().min(1).max(64),
  zh: z.string().trim().min(1).max(64),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
})

type SkillTagFormValues = z.infer<typeof formSchema>

type EditableSkillTag = {
  id: string
  en: string
  zh: string
  sortOrder: number
  isActive: boolean
}

function toFormValues(tag: EditableSkillTag | null): SkillTagFormValues {
  return {
    id: tag?.id ?? '',
    en: tag?.en ?? '',
    zh: tag?.zh ?? '',
    sortOrder: tag?.sortOrder ?? 0,
    isActive: tag?.isActive ?? true,
  }
}

export function SkillTagFormDialog({
  open,
  onOpenChange,
  tag,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: EditableSkillTag | null
  onSuccess: () => Promise<void>
}) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = Boolean(tag)
  const defaultValues = useMemo(() => toFormValues(tag), [tag])

  const form = useForm<SkillTagFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  useEffect(() => {
    form.reset(toFormValues(tag))
  }, [form, tag])

  async function onSubmit(values: SkillTagFormValues) {
    setIsLoading(true)

    try {
      const endpoint = isEditing && tag ? `/api/v1/skill-tags/${tag.id}` : '/api/v1/skill-tags'
      const res = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => null)
        toast({
          title: '错误',
          description: error?.error ?? '保存标签失败',
          variant: 'destructive',
        })
        return
      }

      toast({ title: isEditing ? '标签已更新' : '标签已创建' })
      onOpenChange(false)
      await onSuccess()
    } catch {
      toast({ title: '错误', description: '保存标签失败', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑标签' : '新建标签'}</DialogTitle>
          <DialogDescription>
            标签 ID 会写入 Skill 的标签数组里，创建后建议保持稳定；中英文名称可以后续继续调整。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标签 ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="productivity" disabled={isEditing} />
                  </FormControl>
                  <FormDescription>用于 Skill 标签值存储，推荐和客户端枚举保持一致。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>英文名</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Productivity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>中文名</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="效率" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>排序</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} max={9999} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={field.value ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => field.onChange(true)}
                      >
                        启用
                      </Button>
                      <Button
                        type="button"
                        variant={!field.value ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => field.onChange(false)}
                      >
                        停用
                      </Button>
                    </div>
                    <FormDescription>停用后不会再出现在新建 Skill 的标签选项里。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isEditing ? '保存' : '创建'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

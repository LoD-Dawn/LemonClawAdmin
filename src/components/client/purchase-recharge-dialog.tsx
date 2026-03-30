'use client'

import { CreditCard, Wallet } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const purchasePlanMeta = {
  'personal-pro': {
    title: '个人专业版',
    price: '10 元',
    credits: '1000 积分',
  },
  pro: {
    title: '专业 Pro 版',
    price: '50 元',
    credits: '5000 积分',
  },
} as const

type PurchasePlan = keyof typeof purchasePlanMeta

interface PurchaseRechargeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchasePlan?: string | null
}

export function PurchaseRechargeDialog({ open, onOpenChange, purchasePlan }: PurchaseRechargeDialogProps) {
  const plan = (() => {
    if (!purchasePlan || !(purchasePlan in purchasePlanMeta)) {
      return null
    }

    return purchasePlanMeta[purchasePlan as PurchasePlan]
  })()

  if (!plan) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 text-white shadow-[0_18px_32px_-22px_rgba(249,115,22,0.85)]">
            <Wallet className="h-5 w-5" />
          </div>
          <DialogTitle className="font-client-serif text-[30px] text-slate-950">充值确认</DialogTitle>
          <DialogDescription className="text-sm leading-7 text-slate-500">
            这里先做充值框展示效果，实际充值流程暂未接入。你当前选择的是 <span className="font-medium text-slate-900">{plan.title}</span>。
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/85 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">套餐名称</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{plan.title}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">支付金额</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{plan.price}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">到账积分</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{plan.credits}</p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-500">
            后续这里可以接支付方式、订单确认和充值结果反馈。当前版本仅演示弹窗入口与页面流程。
          </p>
        </div>

        <DialogFooter className="gap-3 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            暂不充值
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            我知道了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

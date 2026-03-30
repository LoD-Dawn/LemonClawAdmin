'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PurchaseRechargeDialog } from '@/components/client/purchase-recharge-dialog'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface GuestPlan {
  title: string
  marker: string
  unit: string
  quota: string
  subtitle: string
  description: string
  cta: string
  href: string
  loginHref: string
  purchaseKey?: string
  tone: 'default' | 'featured'
  points: string[]
}

interface GuestPricingGridProps {
  plans: GuestPlan[]
  isAuthenticated?: boolean
}

export function GuestPricingGrid({ plans, isAuthenticated = false }: GuestPricingGridProps) {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [selectedPurchasePlan, setSelectedPurchasePlan] = useState<string | null>(null)

  const handlePurchase = (purchaseKey: string | undefined, loginHref: string) => {
    if (!agreed) {
      toast({
        title: '请先勾选服务条款',
        description: '勾选并同意 LemonClawAI 流量包服务条款后，才能继续购买。',
        variant: 'destructive',
      })
      return
    }

    if (isAuthenticated) {
      if (purchaseKey) {
        setSelectedPurchasePlan(purchaseKey)
      }
      return
    }

    router.push(loginHref)
  }

  return (
    <>
      <PurchaseRechargeDialog
        open={Boolean(selectedPurchasePlan)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPurchasePlan(null)
          }
        }}
        purchasePlan={selectedPurchasePlan}
      />

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const featured = plan.tone === 'featured'

          return (
            <Card
              key={plan.title}
              className={cn(
                'relative overflow-hidden rounded-[2rem] border p-0 transition-all duration-300',
                featured
                  ? 'border-slate-900 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(15,23,42,0.96))] text-white shadow-[0_34px_90px_-42px_rgba(15,23,42,0.88)]'
                  : 'border-white/80 bg-white/82 text-slate-900 shadow-[0_28px_80px_-46px_rgba(15,23,42,0.35)]'
              )}
            >
              {featured && (
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
              )}
              <CardContent className="flex h-full flex-col p-7">
                <div className="text-left">
                  <p className={cn('text-sm', featured ? 'text-orange-200' : 'text-slate-500')}>{plan.title}</p>
                  <div className="mt-4 flex items-end gap-2">
                    <p className={cn('font-client-serif text-5xl leading-none', featured ? 'text-white' : 'text-slate-950')}>
                      {plan.marker}
                    </p>
                    <p className={cn('pb-1 text-lg', featured ? 'text-slate-200' : 'text-slate-500')}>{plan.unit}</p>
                  </div>
                  <p className={cn('mt-2 text-sm', featured ? 'text-slate-300' : 'text-slate-500')}>
                    {plan.quota}
                  </p>
                  <p className={cn('mt-4 text-lg font-medium', featured ? 'text-slate-100' : 'text-slate-900')}>
                    {plan.subtitle}
                  </p>
                  <p className={cn('mt-2 text-sm leading-6', featured ? 'text-slate-300' : 'text-slate-500')}>
                    {plan.description}
                  </p>
                </div>

                <div className="mt-7 flex-1 space-y-3 text-left">
                  {plan.points.map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-2 h-1.5 w-1.5 shrink-0 rounded-full',
                          featured ? 'bg-orange-300' : 'bg-slate-400'
                        )}
                      />
                      <p className={cn('text-sm leading-6', featured ? 'text-slate-100' : 'text-slate-700')}>
                        {point}
                      </p>
                    </div>
                  ))}
                </div>

                {plan.cta === '立即购买' ? (
                  <Button
                    className={cn(
                      'mt-8 h-12 rounded-2xl text-base',
                      featured
                        ? 'border-white/10 bg-white text-slate-950 hover:bg-slate-100'
                        : 'border-slate-200 bg-white/92 text-slate-900 hover:bg-white'
                    )}
                    onClick={() => handlePurchase(plan.purchaseKey, plan.loginHref)}
                    type="button"
                    variant={featured ? 'secondary' : 'outline'}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    asChild
                    className={cn(
                      'mt-8 h-12 rounded-2xl text-base',
                      featured
                        ? 'border-white/10 bg-white text-slate-950 hover:bg-slate-100'
                        : 'border-slate-200 bg-white/92 text-slate-900 hover:bg-white'
                    )}
                    variant={featured ? 'secondary' : 'outline'}
                  >
                    <Link href={plan.href}>
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center gap-3 text-center text-sm text-slate-500">
        <p>
          联系我们：
          <a
            className="text-slate-700 underline decoration-slate-300 underline-offset-4"
            href="mailto:lemonclaw.project@rd.netease.com"
          >
            lemonclaw.project@rd.netease.com
          </a>
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-500">
          <input
            checked={agreed}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 accent-slate-900"
            onChange={(event) => setAgreed(event.target.checked)}
            type="checkbox"
          />
          <span>
            支付即表示你已阅读并同意
            <Link className="text-slate-700 underline decoration-slate-300 underline-offset-4" href="/docs">
              LemonClawAI 流量包服务条款
            </Link>
          </span>
        </label>
      </div>
    </>
  )
}

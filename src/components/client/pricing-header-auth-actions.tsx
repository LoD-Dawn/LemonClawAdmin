'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { LogOut, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PricingHeaderAuthActionsProps {
  currentUserLabel: string
}

export function PricingHeaderAuthActions({ currentUserLabel }: PricingHeaderAuthActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800">
        <Link href="/profile">
          <UserRound className="mr-2 h-4 w-4" />
          {currentUserLabel}
        </Link>
      </Button>
      <Button
        className="rounded-full px-4"
        onClick={async () => {
          await signOut({ redirect: false })
          window.location.href = '/login'
        }}
        type="button"
        variant="outline"
      >
        退出
        <LogOut className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}

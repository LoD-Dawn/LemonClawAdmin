'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Sun, Moon, Info } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface ClientHeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function ClientHeader({ user }: ClientHeaderProps) {
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white overflow-hidden shadow-sm ring-1 ring-slate-200 transition-transform group-hover:scale-105">
                <Image 
                  src="/images/Logo.png" 
                  alt="LemonClaw Logo" 
                  fill
                  className="object-contain p-1"
                  priority
                />
              </div>
              <div className="flex flex-col -space-y-1">
                <span className="text-xl font-black tracking-tighter text-slate-900">LemonClaw</span>
                <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase ml-0.5">柠檬虾</span>
              </div>
            </Link>

            <nav className="hidden items-center lg:flex">
              <span className="text-[13px] font-black text-slate-900">控制台</span>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 p-1 pr-4 shadow-sm">
              <Avatar className="h-8 w-8 ring-2 ring-white">
                <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                <AvatarFallback className="bg-slate-100 text-slate-900 text-[10px] font-black border border-slate-200">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="text-[11px] font-black text-slate-700 tracking-tight">{user.name || user.email?.split('@')[0]}</span>
            </div>
          </div>
        </div>
      </header>
    </div>
  )
}

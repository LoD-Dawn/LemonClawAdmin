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
      {/* Top Banner */}
      <div className="flex h-10 w-full items-center justify-center bg-emerald-500 px-4 text-center text-xs font-bold text-white">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5" />
          <span>Codex 现已支持插件，可在 Codex 应用程序、命令行界面 (CLI) 和 IDE 扩展中使用</span>
        </div>
      </div>
      
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white overflow-hidden shadow-sm ring-1 ring-slate-200 transition-transform group-hover:scale-105">
                <Image 
                  src="/images/Logo.png" 
                  alt="伊莉忠Code Logo" 
                  fill
                  className="object-contain p-1"
                  priority
                />
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-900">伊莉忠Code</span>
            </Link>

            <nav className="hidden items-center lg:flex">
              <span className="text-[13px] font-black text-emerald-500">控制台</span>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 p-1 pr-4 shadow-sm">
              <Avatar className="h-8 w-8 ring-2 ring-white">
                <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                <AvatarFallback className="bg-emerald-500 text-white text-[10px] font-black">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="text-[11px] font-black text-slate-700 tracking-tight">{user.name || user.email?.split('@')[0]}</span>
            </div>
          </div>
        </div>
      </header>
    </div>
  )
}

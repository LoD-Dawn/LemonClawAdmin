'use client'

import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ProfileDropdown } from './profile-dropdown'
import { Search } from './search'
import { ThemeSwitch } from './theme-switch'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    accountType?: 'consumer' | 'enterprise'
    isSuperAdmin: boolean
    isDepartmentAdmin?: boolean
  }
}

export function Header({ user }: HeaderProps) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    }
    document.addEventListener('scroll', onScroll, { passive: true })
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-shadow duration-300 sm:px-4',
        offset > 10 && 'shadow-sm border-b border-sidebar-border/50'
      )}
    >
      <div className='flex items-center gap-2.5 sm:gap-3'>
        <SidebarTrigger variant='outline' className='h-8 w-8 rounded-md' />
        <Separator orientation='vertical' className='mx-0.5 h-5' />
        <Search />
      </div>

      <div className='flex items-center gap-2'>
        <ThemeSwitch />
        <Button variant='ghost' size='icon' className='h-8 w-8 rounded-full'>
          <Settings className='h-4 w-4' />
        </Button>
        <ProfileDropdown user={user} />
      </div>
    </header>
  )
}

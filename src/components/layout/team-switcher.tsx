'use client'

import * as React from 'react'
import Image from 'next/image'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function TeamSwitcher({
  roleLabel
}: {
  roleLabel: string
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground pointer-events-none'
        >
          <div className='relative aspect-square size-8 overflow-hidden rounded-lg'>
            <Image
              src='/images/Logo.png'
              alt='LemonClaw logo'
              fill
              sizes='32px'
              className='object-cover'
            />
          </div>
          <div className='grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden'>
            <span className='truncate text-[15px] font-semibold tracking-[-0.01em]'>
              LemonClaw
            </span>
            <span className='truncate text-[12px] font-normal text-sidebar-foreground/65'>
              {roleLabel}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

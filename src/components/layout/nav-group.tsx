'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface NavLeafItem {
  href: string
  label: string
  icon?: any
  badge?: string
  items?: never
}

export interface NavParentItem {
  label: string
  icon?: any
  badge?: string
  items: NavLeafItem[]
  href?: never
}

export type NavItem = NavLeafItem | NavParentItem

export interface NavGroupProps {
  title: string
  items: NavItem[]
}

function isNavLeafItem(item: NavItem): item is NavLeafItem {
  return typeof (item as NavLeafItem).href === 'string'
}

export function NavGroup({ title, items }: NavGroupProps) {
  const { state, isMobile } = useSidebar()
  const pathname = usePathname()

  return (
    <SidebarGroup>
      {title && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const key = `${item.label}-${isNavLeafItem(item) ? item.href : 'group'}`

          if (isNavLeafItem(item))
            return <SidebarMenuLink key={key} item={item} pathname={pathname} />

          if (state === 'collapsed' && !isMobile)
            return (
              <SidebarMenuCollapsedDropdown key={key} item={item} pathname={pathname} />
            )

          return <SidebarMenuCollapsible key={key} item={item} pathname={pathname} />
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavBadge({ children, className }: { children: ReactNode; className?: string }) {
  return <Badge className={cn('rounded-full px-1 py-0 text-xs', className)}>{children}</Badge>
}

function SidebarMenuLink({ item, pathname }: { item: NavLeafItem; pathname: string }) {
  const { setOpenMobile } = useSidebar()
  const isActive = pathname === item.href

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
      >
        <Link href={item.href} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon className="h-4 w-4" />}
          <span>{item.label}</span>
          {item.badge && <NavBadge className='group-data-[collapsible=icon]:hidden'>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsible({
  item,
  pathname,
}: {
  item: NavParentItem
  pathname: string
}) {
  const { setOpenMobile } = useSidebar()
  const hasActiveChild = item.items?.some((subItem) => pathname === subItem.href)

  return (
    <Collapsible
      asChild
      defaultOpen={hasActiveChild}
      className='group/collapsible'
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.label}>
            {item.icon && <item.icon className="h-4 w-4" />}
            <span>{item.label}</span>
            {item.badge && <NavBadge className='group-data-[collapsible=icon]:hidden'>{item.badge}</NavBadge>}
            <ChevronRight className='ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items?.map((subItem) => (
              <SidebarMenuSubItem key={subItem.label}>
                <SidebarMenuSubButton
                  asChild
                  isActive={pathname === subItem.href}
                >
                  <Link href={subItem.href} onClick={() => setOpenMobile(false)}>
                    {subItem.icon && <subItem.icon className="h-4 w-4" />}
                    <span>{subItem.label}</span>
                    {subItem.badge && <NavBadge className='group-data-[collapsible=icon]:hidden'>{subItem.badge}</NavBadge>}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function SidebarMenuCollapsedDropdown({
  item,
  pathname,
}: {
  item: NavParentItem
  pathname: string
}) {
  const hasActiveChild = item.items?.some((subItem) => pathname === subItem.href)

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.label}
            isActive={hasActiveChild}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            <span>{item.label}</span>
            {item.badge && <NavBadge className='group-data-[collapsible=icon]:hidden'>{item.badge}</NavBadge>}
            <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={4}>
          <DropdownMenuLabel>
            {item.label} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items?.map((sub) => (
            <DropdownMenuItem key={`${sub.label}-${sub.href}`} asChild>
              <Link
                href={sub.href}
                className={pathname === sub.href ? 'bg-secondary' : ''}
              >
                {sub.icon && <sub.icon className="h-4 w-4" />}
                <span className='max-w-52 truncate'>{sub.label}</span>
                {sub.badge && (
                  <span className='ml-auto text-xs'>{sub.badge}</span>
                )}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

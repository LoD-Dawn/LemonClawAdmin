# Shadcn-UI 全面 UI 改造实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 shadcn-ui 风格全面美化系统，采用现代简洁设计语言

**Architecture:**
- 使用 Next.js 15 App Router + Server Components
- 表格数据通过 URL search params 实现服务端分页/排序/筛选
- 新增组件：`avatar`, `skeleton`, `breadcrumb`, `separator`, `dropdown-menu`, `tooltip`, `pagination`
- 样式：现代简洁风格，以灰色为主，大量留白，`rounded-xl` 圆角

**Tech Stack:** Next.js 15, Tailwind CSS, shadcn/ui (Radix UI), Prisma, PostgreSQL

---

## Chunk 1: 全局样式配置

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: 更新 globals.css 中的 CSS 变量，使用更现代的灰色调**

```css
:root {
  --background: 0 0% 98%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --radius: 0.75rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 50.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 25%;
  --input: 217.2 32.6% 25%;
  --ring: 224.3 76.3% 48%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
}
```

- [ ] **Step 2: 更新 tailwind.config.ts，添加 `rounded-xl` 和动画**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)'
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-out': { '0%': { opacity: '1', transform: 'translateY(0)' }, '100%': { opacity: '0', transform: 'translateY(4px)' } }
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-in'
      }
    }
  },
  plugins: []
}
export default config
```

- [ ] **Step 3: 提交更改**

```bash
git add src/app/globals.css tailwind.config.ts
git commit -m "style: update CSS variables for modern shadcn-ui look"
```

---

## Chunk 2: 新增基础组件

**Files:**
- Create: `src/components/ui/avatar.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/breadcrumb.tsx`
- Create: `src/components/ui/separator.tsx`
- Create: `src/components/ui/dropdown-menu.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/pagination.tsx`

- [ ] **Step 0: 安装依赖包**

```bash
npm install @radix-ui/react-avatar @radix-ui/react-dropdown-menu @radix-ui/react-tooltip @radix-ui/react-separator @tanstack/react-table
```

- [ ] **Step 1: 创建 avatar 组件**

```tsx
'use client'

import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full', className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium',
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
```

- [ ] **Step 2: 创建 skeleton 组件**

```tsx
import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

export { Skeleton }
```

- [ ] **Step 3: 创建 breadcrumb 组件**

```tsx
'use client'

import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & {
    separator?: React.ReactNode
  }
>(({ className, separator, ...props }, ref) => (
  <nav ref={ref} aria-label="breadcrumb" className={cn('flex items-center', className)} {...props}>
    <ol className="flex items-center gap-2">{props.children}</ol>
  </nav>
))
Breadcrumb.displayName = 'Breadcrumb'

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('inline-flex items-center gap-2', className)} {...props} />
))
BreadcrumbItem.displayName = 'BreadcrumbItem'

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    asChild?: boolean
  }
>(({ className, asChild, ...props }, ref) => {
  if (asChild) {
    return <span ref={ref} className={cn('text-muted-foreground hover:text-foreground transition-colors', className)} {...props} />
  }
  return <a ref={ref} className={cn('text-muted-foreground hover:text-foreground transition-colors', className)} {...props} />
})
BreadcrumbLink.displayName = 'BreadcrumbLink'

const BreadcrumbSeparator = ({ children, className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
  <li role="presentation" className={cn('text-muted-foreground', className)} {...props}>
    {children || <ChevronRight className="h-4 w-4" />}
  </li>
)

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn('font-normal text-foreground', className)}
    {...props}
  />
))
BreadcrumbPage.displayName = 'BreadcrumbPage'

export { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage }
```

- [ ] **Step 4: 创建 separator 组件**

```tsx
'use client'

import * as React from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { cn } from '@/lib/utils'

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className
    )}
    {...props}
  />
))
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
```

- [ ] **Step 5: 创建 dropdown-menu 组件**

```tsx
'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuPortal = DropdownMenuPrimitive.Portal
const DropdownMenuSub = DropdownMenuPrimitive.Sub
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />
)
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
```

- [ ] **Step 6: 创建 tooltip 组件**

```tsx
'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```

- [ ] **Step 7: 创建 pagination 组件**

```tsx
'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ButtonProps, buttonVariants } from './button'

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
)
Pagination.displayName = 'Pagination'

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props} />
  )
)
PaginationContent.displayName = 'PaginationContent'

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('', className)} {...props} />
)
PaginationItem.displayName = 'PaginationItem'

type PaginationButtonProps = {
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
} & React.ComponentProps<'a'> & { isActive?: boolean }

const PaginationLink = ({ className, isActive, size = 'sm', variant = 'ghost', ...props }: PaginationButtonProps) => (
  <a
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      buttonVariants({ variant: isActive ? 'outline' : variant, size }),
      className
    )}
    {...props}
  />
)
PaginationLink.displayName = 'PaginationLink'

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="sm"
    className={cn('gap-1 pl-2.5', className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>上一页</span>
  </PaginationLink>
)
PaginationPrevious.displayName = 'PaginationPrevious'

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="sm"
    className={cn('gap-1 pr-2.5', className)}
    {...props}
  >
    <span>下一页</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = 'PaginationNext'

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    aria-hidden
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = 'PaginationEllipsis'

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
```

- [ ] **Step 8: 提交更改**

```bash
git add src/components/ui/avatar.tsx src/components/ui/skeleton.tsx src/components/ui/breadcrumb.tsx src/components/ui/separator.tsx src/components/ui/dropdown-menu.tsx src/components/ui/tooltip.tsx src/components/ui/pagination.tsx package.json package-lock.json
git commit -m "feat: add shadcn-ui components (avatar, skeleton, breadcrumb, separator, dropdown-menu, tooltip, pagination)"
```

---

## Chunk 3: 重构 Sidebar 组件

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: 重写 Sidebar 组件，添加 avatar 和 dropdown**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { LayoutDashboard, Users, Building2, Box, Cpu, Settings, LogOut } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: '概览', icon: LayoutDashboard },
  { href: '/dashboard/users', label: '用户管理', icon: Users },
  { href: '/dashboard/organizations', label: '组织架构', icon: Building2 },
  { href: '/dashboard/skills', label: 'Skills', icon: Box },
  { href: '/dashboard/mcps', label: 'MCPs', icon: Cpu },
]

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    isSuperAdmin: boolean
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white dark:bg-gray-900">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-lg font-bold text-foreground">Skill/MCP 管理</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <Separator className="mx-3" />

      {/* User section */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="font-medium text-foreground">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                设置
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: 更新 dashboard layout 传递 user 数据给 Sidebar**

修改 `src/app/(dashboard)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1">
        <Header user={session.user} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 提交更改**

```bash
git add src/components/layout/sidebar.tsx src/app/\(dashboard\)/layout.tsx
git commit -m "refactor: enhance sidebar with avatar and dropdown menu"
```

---

## Chunk 4: 重构 Header 组件

**Files:**
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: 重写 Header 组件，添加 breadcrumb**

```tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'

const routeNames: Record<string, string> = {
  '/dashboard': '概览',
  '/dashboard/users': '用户管理',
  '/dashboard/organizations': '组织架构',
  '/dashboard/skills': 'Skills',
  '/dashboard/mcps': 'MCPs',
}

export function Header({ user }: { user: { name?: string | null; email?: string | null; isSuperAdmin: boolean } }) {
  const pathname = usePathname()

  const pathSegments = pathname.split('/').filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/')
    const label = routeNames[href] || segment
    return { href, label, isLast: index === pathSegments.length - 1 }
  })

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6 dark:bg-gray-900">
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">首页</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbs.map(breadcrumb => (
          <BreadcrumbItem key={breadcrumb.href}>
            <BreadcrumbSeparator />
            {breadcrumb.isLast ? (
              <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </Breadcrumb>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        {user.isSuperAdmin && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
            管理员
          </span>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: 提交更改**

```bash
git add src/components/layout/header.tsx
git commit -m "refactor: enhance header with breadcrumb navigation"
```

---

## Chunk 5: 增强概览页卡片

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/components/ui/card.tsx`

- [ ] **Step 1: 更新 Card 组件，添加 hover 效果**

```tsx
// 在 Card 的 className 中添加 hover:shadow-md transition-shadow
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-gray-200 bg-white text-gray-950 shadow-sm transition-all hover:shadow-md',
      className
    )}
    {...props}
  />
))
```

- [ ] **Step 2: 增强概览页，使用更大的间距和 icon**

```tsx
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Users, Building2, Box, Cpu } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()

  const [userCount, orgCount, skillCount, mcpCount] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.organization.count(),
    db.skill.count({ where: { isActive: true } }),
    db.mcp.count({ where: { isActive: true } })
  ])

  const stats = [
    { title: '用户数', value: userCount, icon: Users, color: 'text-blue-600' },
    { title: '组织数', value: orgCount, icon: Building2, color: 'text-purple-600' },
    { title: 'Skills', value: skillCount, icon: Box, color: 'text-emerald-600' },
    { title: 'MCPs', value: mcpCount, icon: Cpu, color: 'text-orange-600' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">欢迎回来</h1>
        <p className="text-muted-foreground mt-1">这是系统概览页面</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <Icon className={cn('h-5 w-5', stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
              {/* Subtle background decoration */}
              <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-gray-50 dark:bg-gray-800" />
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

需要导入 cn:

```tsx
import { cn } from '@/lib/utils'
```

- [ ] **Step 3: 提交更改**

```bash
git add src/app/\(dashboard\)/dashboard/page.tsx src/components/ui/card.tsx
git commit -m "feat: enhance dashboard cards with icons and hover effects"
```

---

## Chunk 6: 创建可复用表格组件（支持排序、筛选、分页）

**Files:**
- Create: `src/components/ui/data-table.tsx`
- Modify: `src/app/api/v1/users/route.ts`
- Modify: `src/app/api/v1/skills/route.ts`
- Modify: `src/app/api/v1/mcps/route.ts`

- [ ] **Step 1: 创建 DataTable 组件**

```tsx
'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronUp, ChevronsUpDown, Filter, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  pageCount: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  totalCount: number
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = '搜索...',
  pageCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  totalCount,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: { pageIndex: page - 1, pageSize },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const renderPageNumbers = () => {
    const items: React.ReactNode[] = []
    const totalPages = pageCount
    const currentPage = page

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              onClick={(e) => { e.preventDefault(); onPageChange(i); }}
              isActive={i === currentPage}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); onPageChange(1); }} isActive={1 === currentPage}>
            1
          </PaginationLink>
        </PaginationItem>
      )

      if (currentPage > 3) {
        items.push(<PaginationEllipsis key="ellipsis-start" />)
      }

      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink href="#" onClick={(e) => { e.preventDefault(); onPageChange(i); }} isActive={i === currentPage}>
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }

      if (currentPage < totalPages - 2) {
        items.push(<PaginationEllipsis key="ellipsis-end" />)
      }

      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); onPageChange(totalPages); }} isActive={totalPages === currentPage}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      )
    }

    return items
  }

  return (
    <div className="space-y-4">
      {/* Filters and Column Toggle */}
      <div className="flex items-center justify-between gap-4">
        {searchKey && (
          <div className="relative flex-1 max-w-sm">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="pl-9"
            />
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="mr-2 h-4 w-4" />
              列
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          共 {totalCount} 条记录
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">每页</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationPrevious
                onClick={(e) => { e.preventDefault(); if (page > 1) onPageChange(page - 1); }}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
              />
              {renderPageNumbers()}
              <PaginationNext
                onClick={(e) => { e.preventDefault(); if (page < pageCount) onPageChange(page + 1); }}
                className={page >= pageCount ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 更新 Users API 支持分页、排序、筛选**

修改 `src/app/api/v1/admin/users/route.ts` 添加分页参数:

```tsx
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const search = searchParams.get('search') || ''

  const where = {
    isActive: true,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { organization: { select: { id: true, name: true } } },
    }),
    db.user.count({ where }),
  ])

  return NextResponse.json({
    data: users,
    pagination: {
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      total,
    },
  })
}
```

- [ ] **Step 3: 同样更新 Skills 和 MCPs API**

- [ ] **Step 4: 提交更改**

```bash
git add src/components/ui/data-table.tsx src/app/api/v1/users/route.ts src/app/api/v1/skills/route.ts src/app/api/v1/mcps/route.ts
git commit -m "feat: add data-table component with sorting, filtering, and pagination"
```

---

## Chunk 7: 重构 Users 页面使用新表格**

**Files:**
- Modify: `src/app/(dashboard)/dashboard/users/page.tsx`
- Modify: `src/components/users/users-table.tsx`

- [ ] **Step 1: 创建 UsersPage 客户端组件**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UsersTable } from '@/components/users/users-table'
import { Skeleton } from '@/components/ui/skeleton'
import { UserFormDialog } from '@/components/users/user-form-dialog'

interface User {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
  organization?: { id: string; name: string }
}

interface Organization {
  id: string
  name: string
  path: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export function UsersClient({ initialUsers, initialOrganizations, initialPagination }: {
  initialUsers: User[]
  initialOrganizations: Organization[]
  initialPagination: PaginationInfo
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [users, setUsers] = useState<User[]>(initialUsers)
  const [organizations] = useState<Organization[]>(initialOrganizations)
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination)
  const [isLoading, setIsLoading] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const search = searchParams.get('search') || ''

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search && { search }),
      })

      const response = await fetch(`/api/v1/admin/users?${params}`)
      const result = await response.json()

      setUsers(result.data)
      setPagination(result.pagination)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`/dashboard/users?${params.toString()}`)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', String(newPageSize))
    params.set('page', '1')
    router.push(`/dashboard/users?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <UsersTable
      users={users}
      organizations={organizations}
      pagination={pagination}
      page={page}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
    />
  )
}
```

- [ ] **Step 2: 重构 UsersTable 支持分页**

```tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { UserFormDialog } from './user-form-dialog'
import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type User = {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
  organization?: { id: string; name: string }
}

type PaginationInfo = {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export function UsersTable({
  users,
  organizations,
  pagination,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  users: User[]
  organizations: { id: string; name: string }[]
  pagination: PaginationInfo
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: '姓名',
    },
    {
      accessorKey: 'email',
      header: '邮箱',
    },
    {
      accessorKey: 'organization.name',
      header: '组织',
      cell: ({ row }) => row.original.organization?.name || '-',
    },
    {
      accessorKey: 'isSuperAdmin',
      header: '角色',
      cell: ({ row }) =>
        row.original.isSuperAdmin ? (
          <Badge>管理员</Badge>
        ) : (
          <Badge variant="outline">用户</Badge>
        ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <UserFormDialog organizations={organizations} />
      </div>
      <DataTable
        columns={columns}
        data={users}
        searchKey="name"
        searchPlaceholder="搜索姓名或邮箱..."
        pageCount={pagination.pageCount}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        totalCount={pagination.total}
      />
    </div>
  )
}
```

- [ ] **Step 3: 更新 UsersPage 使用客户端组件**

```tsx
import { db } from '@/lib/db'
import { UsersClient } from './UsersClient'

export default async function UsersPage() {
  const [users, organizations] = await Promise.all([
    db.user.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { organization: { select: { id: true, name: true } } },
    }),
    db.organization.findMany({ orderBy: { path: 'asc' } }),
  ])

  const total = await db.user.count({ where: { isActive: true } })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">用户管理</h1>
      <UsersClient
        initialUsers={users}
        initialOrganizations={organizations}
        initialPagination={{
          page: 1,
          pageSize: 10,
          pageCount: Math.ceil(total / 10),
          total,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: 提交更改**

```bash
git add src/app/\(dashboard\)/dashboard/users/page.tsx src/components/users/users-table.tsx
git commit -m "refactor: users page to use data-table with pagination"
```

---

## Chunk 8: 增强 Skills 和 MCPs 页面

**Files:**
- Modify: `src/app/(dashboard)/dashboard/skills/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/mcps/page.tsx`
- Modify: `src/components/skills/skills-table.tsx`
- Modify: `src/components/mcps/mcps-table.tsx`
- Modify: `src/app/api/v1/skills/route.ts`
- Modify: `src/app/api/v1/mcps/route.ts`

- [ ] **Step 1: 更新 Skills API 支持分页、排序、筛选**

修改 `src/app/api/v1/skills/route.ts`:

```tsx
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const search = searchParams.get('search') || ''

  const where = {
    isActive: true,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { identifier: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [skills, total] = await Promise.all([
    db.skill.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { organization: { select: { id: true, name: true } } },
    }),
    db.skill.count({ where }),
  ])

  return NextResponse.json({
    data: skills,
    pagination: {
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      total,
    },
  })
}
```

- [ ] **Step 2: 重构 SkillsTable 使用 DataTable**

```tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { SkillFormDialog } from './skill-form-dialog'
import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Skill = {
  id: string
  name: string
  identifier: string
  description?: string
  visibility: string
  organization?: { id: string; name: string }
}

export function SkillsTable({
  skills,
  pagination,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  skills: Skill[]
  pagination: { page: number; pageSize: number; pageCount: number; total: number }
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const columns: ColumnDef<Skill>[] = [
    { accessorKey: 'name', header: '名称' },
    { accessorKey: 'identifier', header: '标识符' },
    { accessorKey: 'visibility', header: '可见性' },
    {
      accessorKey: 'organization.name',
      header: '组织',
      cell: ({ row }) => row.original.organization?.name || '-',
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem><Pencil className="mr-2 h-4 w-4" />编辑</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />删除</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SkillFormDialog />
      </div>
      <DataTable
        columns={columns}
        data={skills}
        searchKey="name"
        searchPlaceholder="搜索名称或标识符..."
        pageCount={pagination.pageCount}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        totalCount={pagination.total}
      />
    </div>
  )
}
```

- [ ] **Step 3: 重构 Skills 页面**

参考 `src/app/(dashboard)/dashboard/users/page.tsx` 的模式，将 `skills/page.tsx` 重构为：
1. Server Component 获取初始数据
2. 客户端 `SkillsClient` 组件处理分页/搜索状态
3. 传递初始数据和分页信息给客户端组件

- [ ] **Step 4: 同样更新 MCPs 页面** - 参考上述步骤 1-3

- [ ] **Step 5: 提交更改**

---

## Chunk 9: 添加 Empty State 和 Loading Skeleton

**Files:**
- Create: `src/components/ui/empty-state.tsx`
- Modify: `src/components/ui/data-table.tsx`

- [ ] **Step 1: 创建 EmptyState 组件**

```tsx
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Box } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        {icon || <Box className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  )
}
```

- [ ] **Step 2: 更新 DataTable 使用 EmptyState**

在 `src/components/ui/data-table.tsx` 中，找到：

```tsx
<TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
  暂无数据
</TableCell>
```

替换为：

```tsx
<TableCell colSpan={columns.length}>
  <EmptyState
    title="暂无数据"
    description="没有找到任何记录，请尝试调整搜索条件"
  />
</TableCell>
```

- [ ] **Step 3: 提交更改**

```bash
git add src/components/ui/empty-state.tsx src/components/ui/data-table.tsx
git commit -m "feat: add empty-state component"
```

---

## Chunk 10: 表单对话框优化

**Files:**
- Modify: `src/components/users/user-form-dialog.tsx`
- Modify: `src/components/skills/skill-form-dialog.tsx`
- Modify: `src/components/mcps/mcp-form-dialog.tsx`

- [ ] **Step 1: 增强 UserFormDialog**

更新 `src/components/users/user-form-dialog.tsx`:

```tsx
// DialogContent 添加 className="max-w-md"
<DialogContent className="sm:max-w-[425px]">
  <DialogHeader>
    <DialogTitle>添加用户</DialogTitle>
    <DialogDescription>
      填写以下信息创建新用户
    </DialogDescription>
  </DialogHeader>
  <form onSubmit={handleSubmit} className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="name">姓名</Label>
      <Input
        id="name"
        {...register('name')}
        className={errors.name ? 'border-destructive' : ''}
      />
      {errors.name && (
        <p className="text-sm text-destructive">{errors.name.message}</p>
      )}
    </div>
    <div className="space-y-2">
      <Label htmlFor="email">邮箱</Label>
      <Input
        id="email"
        type="email"
        {...register('email')}
        className={errors.email ? 'border-destructive' : ''}
      />
      {errors.email && (
        <p className="text-sm text-destructive">{errors.email.message}</p>
      )}
    </div>
    {/* 其他字段类似 */}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
        取消
      </Button>
      <Button type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        创建
      </Button>
    </DialogFooter>
  </form>
</DialogContent>
```

关键改进点：
- `DialogContent` 添加 `sm:max-w-[425px]` 限制宽度
- `DialogHeader` 包含 `DialogTitle` 和 `DialogDescription`
- 表单字段使用 `space-y-4` 垂直排列
- 每个字段包含 `<Label>` 和 `<Input>`，错误时输入框添加 `border-destructive` class
- 错误信息使用 `text-destructive` 颜色显示在字段下方
- 提交按钮使用 `isLoading` state 显示 loading spinner

- [ ] **Step 2: 同样更新 SkillFormDialog 和 McpFormDialog**

参考上述模式更新：
- `src/components/skills/skill-form-dialog.tsx`
- `src/components/mcps/mcp-form-dialog.tsx`

- [ ] **Step 3: 提交更改**

```bash
git add src/components/users/user-form-dialog.tsx src/components/skills/skill-form-dialog.tsx src/components/mcps/mcp-form-dialog.tsx
git commit -m "refactor: enhance form dialogs with better validation feedback"
```

---

## Plan Complete

Plan saved to `docs/superpowers/plans/2026-03-20-shadcn-ui-redesign.md`

**Ready to execute?**

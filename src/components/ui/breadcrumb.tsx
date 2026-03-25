'use client'

import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
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

const BreadcrumbSeparator = ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span role="presentation" className={cn('text-muted-foreground', className)} {...props}>
    {children || <ChevronRight className="h-4 w-4" />}
  </span>
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

'use client'

import { Search as SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type SearchProps = {
  className?: string
  placeholder?: string
}

export function Search({
  className = '',
  placeholder = '搜索 (⌘K)',
}: SearchProps) {
  return (
    <Button
      variant='outline'
      className={cn(
        'group relative h-8 w-full flex-1 justify-start rounded-md bg-muted/25 px-3 text-sm font-normal text-muted-foreground shadow-none hover:bg-muted/50 sm:w-36 sm:pr-11 md:flex-none lg:w-56',
        className
      )}
      onClick={() => {
          // Logic for opening command menu
      }}
    >
      <SearchIcon
        aria-hidden='true'
        className='absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground'
      />
      <span className='ml-5'>{placeholder.includes('搜索') ? 'Search' : placeholder}</span>
      <kbd className='pointer-events-none absolute right-1.5 top-1/2 hidden h-5 -translate-y-1/2 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 select-none group-hover:bg-accent sm:flex'>
        <span className='text-[10px] font-sans'>⌘</span>K
      </kbd>
    </Button>
  )
}

import Image from 'next/image'
import Link from 'next/link'

type AuthLayoutProps = {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className='container grid h-svh max-w-none items-center justify-center lg:grid-cols-1'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[480px] sm:p-8'>
        <div className='flex flex-col space-y-2 text-center'>
          <div className='mb-4 flex items-center justify-center gap-2'>
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border shadow-sm">
                <Image src="/images/Logo.png" alt="LemonClaw logo" fill className="object-cover" />
            </div>
            <h1 className='text-xl font-bold tracking-tight'>LemonClaw</h1>
          </div>
          <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
          <p className='text-sm text-muted-foreground'>
            {subtitle}
          </p>
        </div>
        <div className='grid gap-6'>
          {children}
        </div>
        <p className='px-8 text-center text-sm text-muted-foreground leading-relaxed'>
          通过登录，您同意我们的{' '}
          <Link
            href='/terms'
            className='underline underline-offset-4 hover:text-primary transition-colors'
          >
            服务条款
          </Link>{' '}
          和{' '}
          <Link
            href='/privacy'
            className='underline underline-offset-4 hover:text-primary transition-colors'
          >
            隐私政策
          </Link>
          。
        </p>
      </div>
    </div>
  )
}

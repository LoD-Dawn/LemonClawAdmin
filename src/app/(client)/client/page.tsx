import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'

export default async function ClientPage() {
  const session = await auth()
  redirect(session?.user ? '/profile' : '/login')
}

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import {
  canUserAccessLoginEntryMode,
  type AccountTypeValue,
  type LoginEntryMode,
} from '@/lib/default-organizations'
import { recordOperationLog } from '@/lib/operation-log'

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  trustHost: true,
  debug: process.env.AUTH_DEBUG === 'true',
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        entryMode: { label: 'Entry Mode', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const entryMode: LoginEntryMode = credentials.entryMode === 'enterprise' ? 'enterprise' : 'consumer'

        const user = await db.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.isActive) {
          return null
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!passwordMatch) {
          return null
        }

        if (!canUserAccessLoginEntryMode(user, entryMode)) {
          return null
        }

        await recordOperationLog({
          actor: user,
          module: 'auth',
          action: 'auth.login',
          targetType: 'auth_session',
          targetId: user.id,
          targetName: user.email,
          targetUserId: user.id,
          summary: `${user.name || user.email} 登录${entryMode === 'enterprise' ? '企业工作区' : '个人工作台'}`,
          metadata: {
            entryMode,
            accountType: user.accountType,
            isSuperAdmin: user.isSuperAdmin,
            isDepartmentAdmin: user.isDepartmentAdmin,
            organizationId: user.organizationId,
            departmentId: user.departmentId,
          },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          accountType: user.accountType,
          isSuperAdmin: user.isSuperAdmin,
          organizationId: user.organizationId,
          isDepartmentAdmin: user.isDepartmentAdmin,
          departmentId: user.departmentId,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string
          accountType: AccountTypeValue
          isSuperAdmin: boolean
          organizationId: string | null
          isDepartmentAdmin?: boolean
          departmentId?: string | null
        }
        token.id = u.id
        token.accountType = u.accountType
        token.isSuperAdmin = u.isSuperAdmin
        token.organizationId = u.organizationId
        token.isDepartmentAdmin = u.isDepartmentAdmin ?? false
        token.departmentId = u.departmentId ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.accountType = token.accountType as AccountTypeValue
        session.user.isSuperAdmin = token.isSuperAdmin as boolean
        session.user.organizationId = token.organizationId as string | null
        session.user.isDepartmentAdmin = token.isDepartmentAdmin as boolean
        session.user.departmentId = token.departmentId as string | null
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt'
  }
})

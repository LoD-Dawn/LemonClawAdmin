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
import { isPhoneFormatValid, normalizePhone } from '@/lib/phone'

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  trustHost: true,
  debug: process.env.AUTH_DEBUG === 'true',
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Identifier', type: 'text' },
        password: { label: 'Password', type: 'password' },
        entryMode: { label: 'Entry Mode', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null
        }

        const entryMode: LoginEntryMode = credentials.entryMode === 'enterprise' ? 'enterprise' : 'consumer'
        const rawIdentifier = String(credentials.identifier).trim()
        const normalizedEmail = rawIdentifier.toLowerCase()

        let user = null
        let loginIdentifierType: 'phone' | 'email' = 'email'

        if (entryMode === 'enterprise') {
          user = await db.user.findUnique({
            where: { email: normalizedEmail }
          })
        } else {
          if (isPhoneFormatValid(rawIdentifier)) {
            loginIdentifierType = 'phone'
            user = await db.user.findUnique({
              where: { phone: normalizePhone(rawIdentifier) }
            })
          }

          if (!user && rawIdentifier.includes('@')) {
            const fallbackUser = await db.user.findUnique({
              where: { email: normalizedEmail }
            })

            if (fallbackUser?.accountType === 'consumer' && !fallbackUser.phone) {
              user = fallbackUser
              loginIdentifierType = 'email'
            }
          }
        }

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
            loginIdentifierType,
            phone: user.phone,
            requiresPhoneBinding: user.accountType === 'consumer' && !user.phone,
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
          phone: user.phone,
          name: user.name,
          accountType: user.accountType,
          isSuperAdmin: user.isSuperAdmin,
          organizationId: user.organizationId,
          isDepartmentAdmin: user.isDepartmentAdmin,
          departmentId: user.departmentId,
          requiresPhoneBinding: user.accountType === 'consumer' && !user.phone,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      const mutableToken = token as typeof token & {
        id?: string
        phone?: string | null
        accountType?: AccountTypeValue
        isSuperAdmin?: boolean
        organizationId?: string | null
        isDepartmentAdmin?: boolean
        departmentId?: string | null
        requiresPhoneBinding?: boolean
      }
      if (user) {
        const u = user as {
          id: string
          accountType: AccountTypeValue
          isSuperAdmin: boolean
          organizationId: string | null
          phone?: string | null
          isDepartmentAdmin?: boolean
          departmentId?: string | null
          requiresPhoneBinding?: boolean
        }
        mutableToken.id = u.id
        mutableToken.accountType = u.accountType
        mutableToken.isSuperAdmin = u.isSuperAdmin
        mutableToken.organizationId = u.organizationId
        mutableToken.phone = u.phone ?? null
        mutableToken.isDepartmentAdmin = u.isDepartmentAdmin ?? false
        mutableToken.departmentId = u.departmentId ?? null
        mutableToken.requiresPhoneBinding = u.requiresPhoneBinding ?? false
      }
      return mutableToken
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionToken = token as typeof token & {
          id?: string
          phone?: string | null
          accountType?: AccountTypeValue
          isSuperAdmin?: boolean
          organizationId?: string | null
          isDepartmentAdmin?: boolean
          departmentId?: string | null
        }
        const freshUser = sessionToken.id
          ? await db.user.findUnique({
              where: { id: sessionToken.id as string },
              select: {
                id: true,
                email: true,
                phone: true,
                name: true,
                accountType: true,
                isSuperAdmin: true,
                organizationId: true,
                isDepartmentAdmin: true,
                departmentId: true,
              },
            })
          : null
        const effectiveUser = freshUser ?? null

        session.user.id = sessionToken.id as string
        session.user.email = effectiveUser?.email ?? session.user.email
        session.user.name = effectiveUser?.name ?? session.user.name
        session.user.phone = effectiveUser?.phone ?? sessionToken.phone ?? null
        session.user.accountType = (effectiveUser?.accountType ?? sessionToken.accountType) as AccountTypeValue
        session.user.isSuperAdmin = (effectiveUser?.isSuperAdmin ?? sessionToken.isSuperAdmin) as boolean
        session.user.organizationId = (effectiveUser?.organizationId ?? sessionToken.organizationId) as string | null
        session.user.isDepartmentAdmin = (effectiveUser?.isDepartmentAdmin ?? sessionToken.isDepartmentAdmin) as boolean
        session.user.departmentId = (effectiveUser?.departmentId ?? sessionToken.departmentId) as string | null
        session.user.requiresPhoneBinding = session.user.accountType === 'consumer' && !session.user.phone
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

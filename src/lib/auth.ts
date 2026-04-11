import { randomUUID } from 'crypto'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import {
  DEFAULT_CONSUMER_ORGANIZATION_ID,
  canUserAccessLoginEntryMode,
  type AccountTypeValue,
  type LoginEntryMode,
} from '@/lib/default-organizations'
import { recordOperationLog } from '@/lib/operation-log'
import { isPhoneFormatValid, normalizePhone } from '@/lib/phone'
import {
  consumePhoneVerificationCode,
  getPhoneVerificationCodeErrorMessage,
  PHONE_VERIFICATION_PURPOSE_LOGIN,
} from '@/lib/phone-verification'
import { createSelfServiceConsumerRegistrationQuota } from '@/lib/user-claw-quota-policy'
import { resolveLoginClientBinding } from '@/lib/login-client-binding'

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

type AuthUserRecord = {
  id: string
  email: string
  phone: string | null
  name: string
  accountType: AccountTypeValue
  isSuperAdmin: boolean
  organizationId: string | null
  isDepartmentAdmin: boolean
  departmentId: string | null
  isActive: boolean
}

function buildConsumerPlaceholderEmail(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `phone-${digits}@placeholder.lemonclaw.local`
}

function buildConsumerDefaultName(phone: string) {
  return `用户${phone.slice(-4)}`
}

function toAuthUser(user: Omit<AuthUserRecord, 'isActive'>) {
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

async function authenticateConsumerByPhoneCode(phoneInput: string, smsCode: string, loginClientId?: string) {
  if (!isPhoneFormatValid(phoneInput) || getPhoneVerificationCodeErrorMessage(smsCode)) {
    return null
  }

  const registrationQuota = createSelfServiceConsumerRegistrationQuota()
  let autoRegistered = false
  let boundOrganizationId: string | null = null
  let boundOrganizationName: string | null = null
  let bindingApplied = false

  const user = await db.$transaction(async (tx) => {
    const binding = await resolveLoginClientBinding(tx, loginClientId)
    const normalizedPhone = await consumePhoneVerificationCode(
      tx,
      phoneInput,
      PHONE_VERIFICATION_PURPOSE_LOGIN,
      smsCode
    )

    const existingUser = await tx.user.findUnique({
      where: { phone: normalizedPhone },
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
        isActive: true,
      },
    })

    if (existingUser) {
      if (existingUser.accountType !== 'consumer') {
        throw new Error('PHONE_LOGIN_NOT_SUPPORTED_FOR_ACCOUNT')
      }

      if (binding) {
        boundOrganizationId = binding.organizationId
        boundOrganizationName = binding.organizationName

        if (existingUser.organizationId !== binding.organizationId) {
          bindingApplied = true
          return tx.user.update({
            where: { id: existingUser.id },
            data: {
              organizationId: binding.organizationId,
            },
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
              isActive: true,
            },
          })
        }
      }

      return existingUser
    }

    let organizationId = DEFAULT_CONSUMER_ORGANIZATION_ID
    if (binding) {
      organizationId = binding.organizationId
      boundOrganizationId = binding.organizationId
      boundOrganizationName = binding.organizationName
      bindingApplied = true
    } else {
      const defaultOrganization = await tx.organization.findUnique({
        where: { id: DEFAULT_CONSUMER_ORGANIZATION_ID },
        select: { id: true },
      })

      if (!defaultOrganization) {
        throw new Error('DEFAULT_CONSUMER_ORGANIZATION_MISSING')
      }

      organizationId = defaultOrganization.id
    }

    const createdUser = await tx.user.create({
      data: {
        name: buildConsumerDefaultName(normalizedPhone),
        email: buildConsumerPlaceholderEmail(normalizedPhone),
        phone: normalizedPhone,
        passwordHash: await bcrypt.hash(randomUUID(), 12),
        accountType: 'consumer',
        organizationId,
        isSuperAdmin: false,
        isDepartmentAdmin: false,
        departmentId: null,
        isActive: true,
      },
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
        isActive: true,
      },
    })

    await tx.userClawQuota.create({
      data: {
        userId: createdUser.id,
        creditBalance: registrationQuota.creditBalance,
        pricingVersion: registrationQuota.pricingVersion,
        expiresAt: registrationQuota.expiresAt,
      },
    })

    autoRegistered = true
    return createdUser
  })

  if (!user.isActive || !canUserAccessLoginEntryMode(user, 'consumer')) {
    return null
  }

  await recordOperationLog({
    actor: user,
    module: 'auth',
    action: autoRegistered ? 'auth.consumer.auto-register-login' : 'auth.consumer.sms-login',
    targetType: 'auth_session',
    targetId: user.id,
    targetName: user.email,
    targetUserId: user.id,
    summary: `${user.name || user.email} 通过手机号验证码登录个人工作台`,
      metadata: {
        entryMode: 'consumer',
        loginIdentifierType: 'phone_sms_code',
        phone: user.phone,
        requiresPhoneBinding: false,
      accountType: user.accountType,
        isSuperAdmin: user.isSuperAdmin,
        isDepartmentAdmin: user.isDepartmentAdmin,
        organizationId: user.organizationId,
        departmentId: user.departmentId,
        autoRegistered,
        loginClientId: loginClientId ?? null,
        boundOrganizationId,
        boundOrganizationName,
        bindingApplied,
      },
    })

  return toAuthUser(user)
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  trustHost: true,
  debug: process.env.AUTH_DEBUG === 'true',
  providers: [
    Credentials({
      id: 'credentials',
      name: 'credentials',
        credentials: {
          identifier: { label: 'Identifier', type: 'text' },
          password: { label: 'Password', type: 'password' },
          entryMode: { label: 'Entry Mode', type: 'text' },
          clientId: { label: 'Client Id', type: 'text' },
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

        let effectiveUser = user
        let boundOrganizationId: string | null = null
        let boundOrganizationName: string | null = null
        let bindingApplied = false

        if (entryMode === 'consumer' && user.accountType === 'consumer') {
          effectiveUser = await db.$transaction(async (tx) => {
            const binding = await resolveLoginClientBinding(tx, String(credentials.clientId || ''))
            if (!binding) {
              return user
            }

            boundOrganizationId = binding.organizationId
            boundOrganizationName = binding.organizationName

            if (user.organizationId === binding.organizationId) {
              return user
            }

            bindingApplied = true
            return tx.user.update({
              where: { id: user.id },
              data: {
                organizationId: binding.organizationId,
              },
            })
          })
        }

        if (!canUserAccessLoginEntryMode(effectiveUser, entryMode)) {
          return null
        }

        await recordOperationLog({
          actor: effectiveUser,
          module: 'auth',
          action: 'auth.login',
          targetType: 'auth_session',
          targetId: effectiveUser.id,
          targetName: effectiveUser.email,
          targetUserId: effectiveUser.id,
          summary: `${effectiveUser.name || effectiveUser.email} 登录${entryMode === 'enterprise' ? '企业工作区' : '个人工作台'}`,
          metadata: {
            entryMode,
            loginIdentifierType,
            phone: effectiveUser.phone,
            requiresPhoneBinding: effectiveUser.accountType === 'consumer' && !effectiveUser.phone,
            accountType: effectiveUser.accountType,
            isSuperAdmin: effectiveUser.isSuperAdmin,
            isDepartmentAdmin: effectiveUser.isDepartmentAdmin,
            organizationId: effectiveUser.organizationId,
            departmentId: effectiveUser.departmentId,
            loginClientId: credentials.clientId ? String(credentials.clientId) : null,
            boundOrganizationId,
            boundOrganizationName,
            bindingApplied,
          },
        })

        return toAuthUser(effectiveUser)
      }
    }),
    Credentials({
      id: 'consumer-phone-code',
      name: 'consumer-phone-code',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        smsCode: { label: 'Sms Code', type: 'text' },
        clientId: { label: 'Client Id', type: 'text' },
      },
      async authorize(credentials) {
        const phone = String(credentials?.phone || '').trim()
        const smsCode = String(credentials?.smsCode || '').trim()
        const clientId = String(credentials?.clientId || '').trim()

        try {
          return await authenticateConsumerByPhoneCode(phone, smsCode, clientId)
        } catch (error) {
          if (!(error instanceof Error) || (
            error.message !== 'PHONE_LOGIN_NOT_SUPPORTED_FOR_ACCOUNT'
            && error.message !== 'DEFAULT_CONSUMER_ORGANIZATION_MISSING'
            && error.message !== 'PHONE_VERIFICATION_CODE_INVALID'
            && error.message !== 'PHONE_VERIFICATION_CODE_EXPIRED'
          )) {
            console.error('[auth.consumer-phone-code] authorize failed:', error)
          }

          return null
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

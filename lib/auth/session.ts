import "server-only"

import { redirect } from "next/navigation"

import { auth } from "@/lib/auth/server"

interface RequireAuthOptions {
  message?: string
  redirectTo?: string
  verificationRedirectTo?: string
}

export async function getVerifiedUserId() {
  const { data: session } = await auth.getSession()

  if (!session?.user?.id || !session.user.emailVerified) {
    return null
  }

  return session.user.id
}

export async function requireAuth(options: RequireAuthOptions = {}) {
  const { data: session } = await auth.getSession()

  if (!session?.user?.id) {
    if (options.redirectTo) {
      redirect(options.redirectTo)
    }

    throw new Error(options.message ?? "You must be logged in.")
  }

  if (!session.user.emailVerified) {
    if (options.redirectTo) {
      redirect(options.verificationRedirectTo ?? "/verify-email")
    }

    throw new Error("Verify your email before accessing finance data.")
  }

  return session
}

export async function requireUserId(options: RequireAuthOptions = {}) {
  const session = await requireAuth(options)
  return session.user.id
}

import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import {
  AuthCard,
  authInlineLinkClasses,
  AuthPageShell,
  AuthStatusMessage,
} from "@/components/auth/auth-page-shell"
import { LoginForm } from "@/components/auth/login-form"
import { auth } from "@/lib/auth/server"

export const metadata: Metadata = {
  title: "Login | Finance",
  description: "Sign in to the finance app.",
}

export const dynamic = "force-dynamic"

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string | string[]
    password?: string | string[]
    verification?: string | string[]
  }>
}) {
  const params = await searchParams
  const leakedEmail = firstSearchParam(params.email)
  const leakedPassword = firstSearchParam(params.password)

  if (leakedEmail || leakedPassword) {
    const verification = firstSearchParam(params.verification)
    redirect(
      verification
        ? `/login?verification=${encodeURIComponent(verification)}`
        : "/login",
    )
  }

  const verification = firstSearchParam(params.verification)
  const { data: session } = await auth.getSession()

  if (session?.user?.emailVerified) {
    redirect("/")
  }

  return (
    <AuthPageShell>
      <AuthCard title="Login" titleId="login-heading">
        {verification === "required" || verification === "complete" ? (
          <div className="mb-4">
            <AuthStatusMessage
              variant={verification === "complete" ? "success" : "info"}
            >
              {verification === "complete"
                ? "Your email is verified. You can now sign in."
                : "Verify your email before accessing your finance data."}
            </AuthStatusMessage>
          </div>
        ) : null}

        <LoginForm />

        <p className="text-muted-foreground mt-8 text-center text-sm leading-normal">
          Need to create an account?{" "}
          <Link href="/sign-up" className={authInlineLinkClasses}>
            Sign Up
          </Link>
        </p>
        <p className="text-muted-foreground mt-4 text-center text-sm leading-normal">
          Need a new verification code?{" "}
          <Link href="/verify-email" className={authInlineLinkClasses}>
            Verify Email
          </Link>
        </p>
      </AuthCard>
    </AuthPageShell>
  )
}

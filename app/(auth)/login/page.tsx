import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import {
  AuthCard,
  authInlineLinkClasses,
  AuthPageShell,
} from "@/components/auth/auth-page-shell"
import { LoginForm } from "@/components/auth/login-form"
import { auth } from "@/lib/auth/server"

export const metadata: Metadata = {
  title: "Login | Finance",
  description: "Sign in to the finance app.",
}

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const { data: session } = await auth.getSession()

  if (session?.user) {
    redirect("/")
  }

  return (
    <AuthPageShell>
      <AuthCard title="Login" titleId="login-heading">
        <LoginForm />

        <p className="text-muted-foreground mt-8 text-center text-sm leading-normal">
          Need to create an account?{" "}
          <Link href="/sign-up" className={authInlineLinkClasses}>
            Sign Up
          </Link>
        </p>
      </AuthCard>
    </AuthPageShell>
  )
}

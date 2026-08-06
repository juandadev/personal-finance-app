import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import {
  AuthCard,
  authInlineLinkClasses,
  AuthPageShell,
} from "@/components/auth/auth-page-shell"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { auth } from "@/lib/auth/server"

export const metadata: Metadata = {
  title: "Sign Up | Finance",
  description: "Create a finance app account.",
}

export const dynamic = "force-dynamic"

export default async function SignUpPage() {
  const { data: session } = await auth.getSession()

  if (session?.user?.emailVerified) {
    redirect("/")
  }

  return (
    <AuthPageShell>
      <AuthCard title="Sign Up" titleId="sign-up-heading">
        <SignUpForm />

        <p className="text-muted-foreground mt-8 text-center text-sm leading-normal">
          Already have an account?{" "}
          <Link href="/login" className={authInlineLinkClasses}>
            Login
          </Link>
        </p>
      </AuthCard>
    </AuthPageShell>
  )
}

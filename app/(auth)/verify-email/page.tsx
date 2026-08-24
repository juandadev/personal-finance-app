import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import {
  AuthCard,
  authInlineLinkClasses,
  AuthPageShell,
  AuthStatusMessage,
} from "@/components/auth/auth-page-shell"
import { VerifyEmailForm } from "@/components/auth/verify-email-form"
import { auth } from "@/lib/auth/server"

export const metadata: Metadata = {
  title: "Verify Email | Finance",
  description: "Verify the email address for an invited finance account.",
}

export const dynamic = "force-dynamic"

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string | string[] }>
}) {
  const { sent } = await searchParams
  const { data: session } = await auth.getSession()

  if (session?.user?.emailVerified) {
    redirect("/")
  }

  return (
    <AuthPageShell>
      <AuthCard title="Verify Email" titleId="verify-email-heading">
        {sent === "1" ? (
          <div className="mb-4">
            <AuthStatusMessage>
              Enter the code sent to the email address on your invitation.
            </AuthStatusMessage>
          </div>
        ) : null}

        <VerifyEmailForm />

        <p className="text-muted-foreground mt-8 text-center text-sm leading-normal">
          Already verified?{" "}
          <Link href="/login" className={authInlineLinkClasses}>
            Login
          </Link>
        </p>
      </AuthCard>
    </AuthPageShell>
  )
}

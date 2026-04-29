import type { Metadata } from "next"
import Link from "next/link"

import {
  AuthCard,
  AuthField,
  AuthPageShell,
  AuthPasswordField,
  AuthSubmitButton,
} from "@/components/auth/auth-page-shell"

export const metadata: Metadata = {
  title: "Sign Up | Finance",
  description: "A static sign-up page for the finance app.",
}

export default function SignUpPage() {
  return (
    <AuthPageShell>
      <AuthCard title="Sign Up" titleId="sign-up-heading">
        <form className="space-y-4" aria-label="Sign-up form">
          <AuthField
            id="name"
            name="name"
            type="text"
            label="Name"
            autoComplete="name"
          />
          <AuthField
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
          />
          <AuthPasswordField
            id="password"
            name="password"
            label="Create Password"
            autoComplete="new-password"
            helperText="Passwords must be at least 8 characters"
          />
          <AuthSubmitButton>Create Account</AuthSubmitButton>
        </form>

        <p className="text-muted-foreground mt-8 text-center text-sm leading-normal">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground hover:text-foreground/75 focus-visible:ring-ring/30 font-bold underline underline-offset-2 transition-colors outline-none focus-visible:rounded-sm focus-visible:ring-[3px]"
          >
            Login
          </Link>
        </p>
      </AuthCard>
    </AuthPageShell>
  )
}

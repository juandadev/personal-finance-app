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
  title: "Login | Finance",
  description: "A static login page for the finance app.",
}

export default function LoginPage() {
  return (
    <AuthPageShell>
      <AuthCard title="Login" titleId="login-heading">
        <form className="space-y-4" aria-label="Login form">
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
            label="Password"
            autoComplete="current-password"
          />
          <AuthSubmitButton>Login</AuthSubmitButton>
        </form>

        <p className="text-muted-foreground mt-8 text-center text-sm leading-normal">
          Need to create an account?{" "}
          <Link
            href="/sign-up"
            className="text-foreground hover:text-foreground/75 focus-visible:ring-ring/30 font-bold underline underline-offset-2 transition-colors outline-none focus-visible:rounded-sm focus-visible:ring-[3px]"
          >
            Sign Up
          </Link>
        </p>
      </AuthCard>
    </AuthPageShell>
  )
}

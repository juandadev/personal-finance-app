"use client"

import { useState, type ComponentProps, type ReactNode } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/sidebar/logo"
import { cn } from "@/lib/utils"
import Link from "next/link"

export const authInlineLinkClasses =
  "text-foreground hover:text-foreground/75 focus-visible:ring-ring/30 font-bold underline underline-offset-2 transition-colors outline-none focus-visible:rounded-sm focus-visible:ring-[3px]"

interface AuthPageShellProps {
  children: ReactNode
}

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <div className="bg-background min-h-svh lg:grid lg:grid-cols-[minmax(384px,40vw)_1fr] lg:gap-5 lg:p-5 xl:grid-cols-[560px_1fr]">
      <header className="bg-primary flex h-22 items-center justify-center rounded-b-xl md:h-17.5 lg:hidden">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <aside className="bg-primary text-primary-foreground relative hidden min-h-[calc(100svh-2.5rem)] overflow-hidden rounded-xl p-8 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/images/illustration-authentication.svg')] bg-cover bg-center"
        />

        <Link href="/">
          <Logo className="relative z-10" />
        </Link>

        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="text-3xl leading-[1.2] font-bold tracking-tight md:text-4xl">
            Keep Track of Your Money and Save for Your Future
          </h1>
          <p className="text-primary-foreground/80 text-sm leading-normal">
            Personal finance app puts you in control of your spending. Track
            transactions, set budgets, and add to savings pots easily.
          </p>
        </div>
      </aside>

      <main className="flex min-h-[calc(100svh-5.5rem)] items-center justify-center px-5 py-8 md:min-h-[calc(100svh-4.375rem)] md:px-10 lg:min-h-[calc(100svh-2.5rem)] lg:px-0 lg:py-0">
        {children}
      </main>
    </div>
  )
}

interface AuthCardProps {
  children: ReactNode
  title: string
  titleId: string
}

export function AuthCard({ children, title, titleId }: AuthCardProps) {
  return (
    <Card asChild className="w-full max-w-140" padding="overview">
      <section aria-labelledby={titleId}>
        <h2
          id={titleId}
          className="text-foreground mb-8 text-3xl leading-[1.2] font-bold tracking-tight md:text-4xl"
        >
          {title}
        </h2>

        {children}
      </section>
    </Card>
  )
}

interface AuthFieldProps extends ComponentProps<"input"> {
  label: string
  error?: string
  helperText?: string
}

export function AuthField({
  className,
  error,
  helperText,
  id,
  label,
  ...props
}: AuthFieldProps) {
  const helperId = helperText ? `${id}-helper` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="space-y-1">
      <Label
        htmlFor={id}
        className="text-muted-foreground text-xs leading-normal font-bold"
      >
        {label}
      </Label>
      <Input
        {...props}
        id={id}
        variant="auth"
        className={className}
        aria-invalid={error ? "true" : props["aria-invalid"]}
        aria-describedby={
          [errorId, helperId].filter(Boolean).join(" ") || undefined
        }
      />
      {error ? (
        <p id={errorId} className="text-destructive text-xs leading-normal">
          {error}
        </p>
      ) : helperText ? (
        <p
          id={helperId}
          className="text-muted-foreground text-xs leading-normal"
        >
          {helperText}
        </p>
      ) : null}
    </div>
  )
}

type AuthPasswordFieldProps = AuthFieldProps

export function AuthPasswordField({
  className,
  error,
  helperText,
  id,
  label,
  ...props
}: AuthPasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const Icon = showPassword ? EyeOff : Eye
  const helperId = helperText ? `${id}-helper` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="space-y-1">
      <Label
        htmlFor={id}
        className="text-muted-foreground text-xs leading-normal font-bold"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          {...props}
          id={id}
          variant="auth"
          type={showPassword ? "text" : "password"}
          className={cn("pr-14", className)}
          aria-invalid={error ? "true" : props["aria-invalid"]}
          aria-describedby={
            [errorId, helperId].filter(Boolean).join(" ") || undefined
          }
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full"
          onClick={() => setShowPassword((visible) => !visible)}
        >
          <Icon className="size-5" aria-hidden="true" strokeWidth={3} />
        </Button>
      </div>
      {error ? (
        <p id={errorId} className="text-destructive text-xs leading-normal">
          {error}
        </p>
      ) : helperText ? (
        <p
          id={helperId}
          className="text-muted-foreground text-right text-xs leading-normal"
        >
          {helperText}
        </p>
      ) : null}
    </div>
  )
}

interface AuthSubmitButtonProps extends ComponentProps<"button"> {
  children: ReactNode
}

export function AuthSubmitButton({
  children,
  className,
  type = "submit",
  ...props
}: AuthSubmitButtonProps) {
  return (
    <Button
      type={type}
      size="finance-submit"
      className={cn("mt-8", className)}
      {...props}
    >
      {children}
    </Button>
  )
}

interface AuthStatusMessageProps {
  children: ReactNode
  variant?: "error" | "success" | "info"
}

export function AuthStatusMessage({
  children,
  variant = "info",
}: AuthStatusMessageProps) {
  return (
    <p
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm leading-normal",
        variant === "error" && "border-destructive/20 text-destructive",
        variant === "success" && "border-accent/20 text-foreground",
        variant === "info" && "border-border text-muted-foreground",
      )}
    >
      {children}
    </p>
  )
}

import type { ComponentProps, ReactNode } from "react"
import { Eye } from "lucide-react"

import { Logo } from "@/components/sidebar/logo"
import { cn } from "@/lib/utils"

interface AuthPageShellProps {
  children: ReactNode
}

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <div className="bg-background min-h-svh lg:grid lg:grid-cols-[minmax(384px,40vw)_1fr] lg:gap-5 lg:p-5 xl:grid-cols-[560px_1fr]">
      <header className="bg-primary flex h-[88px] items-center justify-center rounded-b-xl md:h-[70px] lg:hidden">
        <Logo />
      </header>

      <aside className="bg-primary text-primary-foreground relative hidden min-h-[calc(100svh-2.5rem)] overflow-hidden rounded-xl p-8 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/images/illustration-authentication.svg')] bg-cover bg-center"
        />

        <Logo className="relative z-10" />

        <div className="relative z-10 max-w-[28rem] space-y-6">
          <h1 className="text-[2rem] leading-[1.2] font-bold tracking-tight">
            Keep track of your money and save for your future
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
    <section
      aria-labelledby={titleId}
      className="bg-card w-full max-w-[35rem] rounded-xl p-6 shadow-none md:p-8"
    >
      <h2
        id={titleId}
        className="text-card-foreground mb-8 text-[2rem] leading-[1.2] font-bold tracking-tight"
      >
        {title}
      </h2>

      {children}
    </section>
  )
}

interface AuthFieldProps extends ComponentProps<"input"> {
  label: string
}

export function AuthField({ className, id, label, ...props }: AuthFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-muted-foreground text-xs leading-normal font-bold"
      >
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "bg-card text-card-foreground focus-visible:border-ring focus-visible:ring-ring/30 h-[2.8125rem] w-full rounded-lg border border-[#98908b] px-5 text-base transition-[border-color,box-shadow] outline-none focus-visible:ring-[3px]",
          className,
        )}
        {...props}
      />
    </div>
  )
}

interface AuthPasswordFieldProps extends AuthFieldProps {
  helperText?: string
}

export function AuthPasswordField({
  className,
  helperText,
  id,
  label,
  ...props
}: AuthPasswordFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-muted-foreground text-xs leading-normal font-bold"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="password"
          className={cn(
            "bg-card text-card-foreground focus-visible:border-ring focus-visible:ring-ring/30 h-[2.8125rem] w-full rounded-lg border border-[#98908b] px-5 pr-14 text-base transition-[border-color,box-shadow] outline-none focus-visible:ring-[3px]",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          aria-label="Show password"
          className="text-foreground hover:text-foreground/75 focus-visible:ring-ring/30 absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-[3px]"
        >
          <Eye className="size-5" aria-hidden="true" strokeWidth={3} />
        </button>
      </div>
      {helperText ? (
        <p className="text-muted-foreground text-right text-xs leading-normal">
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
  type = "button",
  ...props
}: AuthSubmitButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/40 mt-8 flex h-[3.3125rem] w-full items-center justify-center rounded-lg px-4 text-sm font-bold transition-colors outline-none focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

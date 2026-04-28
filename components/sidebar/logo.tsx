import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  collapsed?: boolean
}

export function Logo({ className, collapsed = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold"
      >
        f
      </span>
      {!collapsed && (
        <span className="text-xl font-bold tracking-tight text-sidebar-primary-foreground">finance</span>
      )}
    </div>
  )
}

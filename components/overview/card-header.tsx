import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface CardHeaderProps {
  title: string
  actionLabel?: string
  href?: string
}

export function CardHeader({ title, actionLabel, href }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {actionLabel && href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {actionLabel}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  )
}

import Link from "next/link"
import CaretRightIcon from "@/components/icons/CaretRightIcon"

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
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-3 text-sm transition-colors"
        >
          {actionLabel}
          <CaretRightIcon className="size-2" aria-hidden />
        </Link>
      )}
    </div>
  )
}

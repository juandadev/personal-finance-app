"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

interface ContactAvatarProps {
  name: string
  initials: string
  color: ThemeColor
  avatarUrl?: string
  className?: string
}

export function ContactAvatar({
  name,
  initials,
  color,
  avatarUrl,
  className,
}: ContactAvatarProps) {
  return (
    <Avatar className={cn("size-10", className)}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt="" className="object-cover" />
      ) : null}
      <AvatarFallback
        aria-label={name}
        className={cn(
          "border-2 text-xs font-bold text-white",
          themeColorClasses[color].bg,
          themeColorClasses[color].border,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

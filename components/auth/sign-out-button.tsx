"use client"

import { useState } from "react"
import { DoorOpenIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SidebarIconTooltip, SidebarLabel } from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth/client"
import { cn } from "@/lib/utils"

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await authClient.signOut()
    window.location.assign("/login")
  }

  return (
    <SidebarIconTooltip label="Sign out">
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "text-sidebar-foreground hover:text-sidebar-primary-foreground flex h-12 items-center justify-start gap-4 rounded-r-xl px-2 text-sm font-bold transition-[padding,color] hover:bg-transparent",
          "focus-visible:ring-sidebar-ring focus-visible:ring-2 focus-visible:ring-offset-0",
          "group-data-[collapsible=icon]:size-12 group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:px-3 [&>span:last-child]:truncate",
        )}
        aria-label="Sign out"
        disabled={isSigningOut}
        onClick={() => void handleSignOut()}
      >
        <DoorOpenIcon className="size-5 shrink-0" aria-hidden="true" />
        <SidebarLabel className="font-bold">
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </SidebarLabel>
      </Button>
    </SidebarIconTooltip>
  )
}

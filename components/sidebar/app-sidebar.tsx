"use client"

import { navItems } from "@/lib/data"
import type { NavKey } from "@/lib/types"
import {
  Sidebar,
  SidebarCollapseButton,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar"
import { Logo } from "./logo"
import { NavItem } from "./nav-item"

interface AppSidebarProps {
  activeKey: NavKey
}

export function AppSidebar({ activeKey }: AppSidebarProps) {
  return (
    <div className="hidden lg:block">
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarLogo />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <nav aria-label="Main navigation">
                <SidebarMenu>
                  {navItems.map((item) => (
                    <NavItem
                      key={item.key}
                      item={item}
                      active={activeKey === item.key}
                    />
                  ))}
                </SidebarMenu>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarCollapseButton />
        </SidebarFooter>
      </Sidebar>
    </div>
  )
}

function SidebarLogo() {
  const { state } = useSidebar()

  return <Logo collapsed={state === "collapsed"} />
}

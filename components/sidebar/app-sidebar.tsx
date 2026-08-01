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
import { SignOutButton } from "@/components/auth/sign-out-button"
import type { NavItem as NavItemType } from "@/lib/types"
import { Logo } from "./logo"
import { NavItem } from "./nav-item"

interface AppSidebarProps {
  activeKey: string
  navItems: NavItemType[]
}

function isActiveNavItem(activeKey: string, href: string) {
  return href === "/" ? activeKey === href : activeKey.startsWith(href)
}

export function AppSidebar({ activeKey, navItems }: AppSidebarProps) {
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
                      active={isActiveNavItem(activeKey, item.href)}
                    />
                  ))}
                </SidebarMenu>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarFooterActions />
        </SidebarFooter>
      </Sidebar>
    </div>
  )
}

function SidebarLogo() {
  const { state } = useSidebar()

  return <Logo collapsed={state === "collapsed"} />
}

function SidebarFooterActions() {
  return (
    <>
      <SignOutButton />
      <SidebarCollapseButton />
    </>
  )
}

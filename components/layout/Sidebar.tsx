"use client";

import Link from "next/link";
import Image from "next/image";
import { logout } from "@/app/auth/actions";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import type { UserRole } from "@/lib/types";
import { LogOut } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/sop",
    label: "SOP List",
    roles: ["staff", "document_controller", "admin"],
  },
  {
    href: "/sop/new",
    label: "New SOP",
    roles: ["staff", "document_controller", "admin"],
  },
  {
    href: "/sop/my-trainings",
    label: "My Trainings",
    roles: ["staff", "document_controller", "admin"],
  },
  {
    href: "/sop/master-data",
    label: "Master Data",
    roles: ["document_controller", "admin"], // only visible for this role
  },
] as const;

// Named AppSidebar (not "Sidebar") to avoid clashing with shadcn's own
// `Sidebar` primitive imported above — this is the app-specific nav
// content rendered inside it.
export function AppSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <Sidebar>
      {/* <SidebarHeader>
        <span className="px-2 py-1 text-lg font-semibold">SOP Manager</span>
      </SidebarHeader> */}
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild className="h-auto py-2">
            <Link href="/" className="flex items-center justify-start w-full">
              <Image
                src="/sop-logo.svg"
                alt="SOP Logo Mark"
                width={100}
                height={50}
                priority
                className="h-8 w-auto object-contain"
              />
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                // exact match for "/sop", startsWith for its sub-routes
                const isActive =
                  item.href === "/sop"
                    ? pathname === "/sop"
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>{item.label}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="pb-18">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <form action={logout} className="w-full">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 active:scale-95 cursor-pointer text-left"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </form>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

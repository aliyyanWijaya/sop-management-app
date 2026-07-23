"use client";

import Link from "next/link";
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
} from "@/components/ui/sidebar";
import type { UserRole } from "@/lib/types";

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
      <SidebarHeader>
        <span className="px-2 py-1 text-lg font-semibold">SOP Manager</span>
      </SidebarHeader>
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
    </Sidebar>
  );
}

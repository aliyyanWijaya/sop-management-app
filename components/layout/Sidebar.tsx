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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import type { UserRole } from "@/lib/types";
import {
  LayoutGrid,
  FilePlus2,
  GraduationCap,
  Database,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/sop",
    label: "SOP List",
    icon: LayoutGrid,
    roles: ["staff", "document_controller", "admin"],
  },
  {
    href: "/sop/new",
    label: "New SOP",
    icon: FilePlus2,
    roles: ["staff", "document_controller", "admin"],
  },
  {
    href: "/sop/my-trainings",
    label: "My Trainings",
    icon: GraduationCap,
    roles: ["staff", "document_controller", "admin"],
  },
  {
    href: "/sop/master-data",
    label: "Master Data",
    icon: Database,
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
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="h-auto py-2 hover:bg-transparent"
          >
            <Link href="/" className="flex items-center justify-start w-full">
              <Image
                src="/sop-logo.svg"
                alt="SOP Pro Logo"
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
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className="transition-all duration-150 ease-out hover:bg-sidebar-foreground hover:text-sidebar active:scale-[0.97]"
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-2 w-full"
                      >
                        <Icon className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
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
            <SidebarMenuButton
              onClick={() => logout()}
              className="text-sidebar-foreground transition-all duration-150 ease-out hover:bg-destructive hover:text-destructive-foreground active:scale-[0.97]"
            >
              <LogOut className="size-4" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    href: "/sop/master-data",
    label: "Master Data",
    roles: ["document_controller", "admin"], // only visible for this role
  },
] as const;

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-gray-50">
      <div className="border-b px-4 py-4">
        <span className="text-lg font-semibold">SOP Manager</span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {visibleItems.map((item) => {
          // exact match for "/sop", startsWith for its sub-routes
          const isActive =
            item.href === "/sop"
              ? pathname === "/sop"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded px-3 py-2 text-sm ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Bell, ClipboardCheck, Stamp, GraduationCap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NotificationItem = {
  id: string;
  type: "review" | "approval" | "quiz";
  title: string;
  documentNumber: string;
  href: string;
};

const TYPE_META = {
  review: { label: "Review request", icon: ClipboardCheck },
  approval: { label: "Approval request", icon: Stamp },
  quiz: { label: "Quiz to complete", icon: GraduationCap },
} as const;

export function NotificationsMenu({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const count = items.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-accent active:scale-95">
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            Notifications
            {count > 0 && (
              <span className="ml-1 font-normal text-muted-foreground">
                ({count})
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {count === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            items.map((item) => {
              const meta = TYPE_META[item.type];
              const Icon = meta.icon;
              return (
                <DropdownMenuItem
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    // Deferred so the menu fully closes (and releases the
                    // pointer-events lock it puts on <body> while open)
                    // before the route changes — otherwise the destination
                    // page can load fully unclickable.
                    setTimeout(() => router.push(item.href), 0);
                  }}
                  className="flex cursor-pointer items-start gap-2 py-2"
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">
                      {meta.label}
                    </span>
                    <span className="text-xs leading-tight text-muted-foreground">
                      {item.documentNumber} — {item.title}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

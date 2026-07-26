"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, User, LogOut } from "lucide-react";
import { logout } from "@/app/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CurrentUser } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  staff: "Staff",
  document_controller: "Document Controller",
  admin: "Admin",
};

export function ProfileMenu({ user }: { user: CurrentUser }) {
  const router = useRouter();

  // Extract initials for the Avatar fallback state (e.g., "John Doe" -> "JD")
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-accent active:scale-[0.97]">
        <div className="hidden text-right text-sm sm:block">
          <p className="font-medium leading-none">{user.name}</p>
          <p className="mt-1 text-xs leading-none text-muted-foreground">
            {ROLE_LABEL[user.role] ?? user.role}
          </p>
        </div>

        <Avatar className="h-8 w-8">
          <AvatarImage src="" alt={user.name} />
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <p className="font-medium leading-none">{user.name}</p>
            <p className="mt-1 text-xs font-normal leading-none text-muted-foreground">
              {user.email}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              // Deferred so the menu fully closes (and releases the
              // pointer-events lock it puts on <body> while open) before
              // the route changes — otherwise the destination page can
              // load fully unclickable.
              setTimeout(() => router.push("/account/edit-profile"), 0);
            }}
            className="flex cursor-pointer items-center gap-2"
          >
            <User className="size-4" />
            Edit profile
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => logout()}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

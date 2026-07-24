import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CurrentUser } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  staff: "Staff",
  document_controller: "Document Controller",
  admin: "Admin",
};

export function Header({ user }: { user: CurrentUser }) {
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
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background pl-4 pr-6 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        {/* Separator primitive cleanly replaces structural borders */}
        <Separator orientation="vertical" className="mr-2 h-4" />
      </div>

      <div className="flex items-center gap-4">
        {/* User Metadata */}
        <div className="text-right text-sm hidden sm:block">
          <p className="font-medium leading-none">{user.name}</p>
          <p className="mt-1 text-xs text-muted-foreground leading-none">
            {ROLE_LABEL[user.role] ?? user.role}
          </p>
        </div>

        {/* shadcn UI Avatar Primitive */}
        <Avatar className="h-8 w-8">
          {/* Optional: Add user.avatarUrl to your user type if available later */}
          <AvatarImage src="" alt={user.name} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

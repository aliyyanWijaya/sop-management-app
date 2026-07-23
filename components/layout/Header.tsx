import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  staff: "Staff",
  document_controller: "Document Controller",
  admin: "Admin",
};

export function Header({ user }: { user: CurrentUser }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <div />

      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
          <p className="font-medium leading-tight">{user.name}</p>
          <p className="text-xs text-muted-foreground leading-tight">
            {ROLE_LABEL[user.role] ?? user.role}
          </p>
        </div>

        {/* Form action to a Server Action — no "use client" or onClick needed */}
        <form action={logout}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="cursor-pointer transition-transform active:scale-95"
          >
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}

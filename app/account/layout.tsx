import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { getCurrentUser } from "@/lib/get-current-user";

// This layout applies to /account, /account/edit-profile, etc — mirrors
// app/sop/layout.tsx exactly so the Sidebar & Header (and notifications,
// search, profile menu) look and behave the same outside the /sop
// namespace. Kept as a separate layout file (rather than moving
// /account/edit-profile under /sop) so the URL stays /account/edit-profile
// rather than /sop/account/edit-profile.
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Middleware already handles redirecting unauthenticated visitors, but
  // this is a safety net in case the `users` row is missing for some
  // reason (e.g. the signup trigger failed) — never render with a null user.
  if (!user) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <AppSidebar role={user.role} />
      <SidebarInset>
        <Header user={user} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { getCurrentUser } from "@/lib/get-current-user";

// This layout applies to /sop, /sop/new, /sop/[id], etc — so the
// Sidebar & Header are written ONCE here, not repeated per page.
// getCurrentUser() is also only called once here, not in every child page.
export default async function SopLayout({
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

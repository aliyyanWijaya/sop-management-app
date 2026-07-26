import { createClient } from "@/lib/supabase/server";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SearchBar } from "./SearchBar";
import { NotificationsMenu, type NotificationItem } from "./NotificationsMenu";
import { ProfileMenu } from "./ProfileMenu";
import type { CurrentUser } from "@/lib/types";

type SopRef = { id: string; title: string; document_number: string } | null;

// Async Server Component — fetches the three kinds of pending actions
// (review requests, approval requests, quiz requests) that this user
// needs to act on, then hands them to the client-side NotificationsMenu
// for display. Kept in the server component so no client-side data
// fetching/loading state is needed for something this small.
export async function Header({ user }: { user: CurrentUser }) {
  const supabase = await createClient();
  const notifications: NotificationItem[] = [];

  // --- Pending reviews assigned to this user ---
  const { data: reviewVersions } = await supabase
    .from("sop_versions")
    .select(
      "id, sop:sops!sop_versions_sop_id_fkey ( id, title, document_number )",
    )
    .eq("status", "in_review")
    .eq("reviewer_id", user.id);

  for (const v of reviewVersions ?? []) {
    const sop = (Array.isArray(v.sop) ? v.sop[0] : v.sop) as SopRef;
    if (!sop) continue;
    notifications.push({
      id: v.id,
      type: "review",
      title: sop.title,
      documentNumber: sop.document_number,
      href: `/sop/${sop.id}`,
    });
  }

  // --- Pending approvals assigned to this user ---
  const { data: approvalVersions } = await supabase
    .from("sop_versions")
    .select(
      "id, sop:sops!sop_versions_sop_id_fkey ( id, title, document_number )",
    )
    .eq("status", "in_approval")
    .eq("approver_id", user.id);

  for (const v of approvalVersions ?? []) {
    const sop = (Array.isArray(v.sop) ? v.sop[0] : v.sop) as SopRef;
    if (!sop) continue;
    notifications.push({
      id: v.id,
      type: "approval",
      title: sop.title,
      documentNumber: sop.document_number,
      href: `/sop/${sop.id}`,
    });
  }

  // --- Socialization quizzes still pending for this user ---
  const { data: quizRecords } = await supabase
    .from("socialization_records")
    .select(
      `
      id,
      sop_version:sop_versions (
        id,
        sop:sops!sop_versions_sop_id_fkey ( id, title, document_number )
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("passed", false)
    .not("notified_at", "is", null);

  for (const r of quizRecords ?? []) {
    const version = Array.isArray(r.sop_version)
      ? r.sop_version[0]
      : r.sop_version;
    const sop = (
      Array.isArray(version?.sop) ? version.sop[0] : version?.sop
    ) as SopRef;
    if (!sop) continue;
    notifications.push({
      id: r.id,
      type: "quiz",
      title: sop.title,
      documentNumber: sop.document_number,
      href: `/sop/${sop.id}/quiz`,
    });
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background pl-4 pr-6 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        {/* Separator primitive cleanly replaces structural borders */}
        <Separator orientation="vertical" className="mr-2 h-4" />
        <SearchBar />
      </div>

      <div className="flex items-center gap-2">
        <NotificationsMenu items={notifications} />
        <Separator orientation="vertical" className="h-6" />
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}

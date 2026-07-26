"use client";

import { MoreVertical, History, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteSop } from "@/app/sop/[id]/actions";

export function MoreActionsMenu({
  sopId,
  canDelete,
}: {
  sopId: string;
  canDelete: boolean;
}) {
  function handleViewChangeLog() {
    // Plain DOM scroll, not a route change, so this doesn't need the
    // setTimeout-before-navigate workaround used elsewhere for router.push.
    document
      .getElementById("activity-log")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      "Delete this SOP? This permanently removes the draft and its history and cannot be undone.",
    );
    if (!confirmed) return;
    // Deferred so the menu fully closes first — same reasoning as the
    // router.push cases: avoids a stuck pointer-events:none on <body>.
    setTimeout(() => {
      deleteSop(sopId);
    }, 0);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-accent active:scale-95">
        <MoreVertical className="size-4" />
        <span className="sr-only">More actions</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={handleViewChangeLog}
            className="cursor-pointer gap-2"
          >
            <History className="size-4" />
            View Change Log
          </DropdownMenuItem>

          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Delete SOP
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

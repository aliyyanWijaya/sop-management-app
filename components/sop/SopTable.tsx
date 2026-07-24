"use client";

import Link from "next/link";
import type { SopListItem } from "@/lib/types";
import { SopStatusBadge } from "./SopStatusBadge";
import { useRouter } from "next/navigation";

export function SopTable({ sops }: { sops: SopListItem[] }) {
  const router = useRouter();

  const handleNavigation = (id: string | number) => {
    router.push(`/sop/${id}`);
  };
  if (sops.length === 0) {
    return (
      <p className="rounded border border-dashed p-8 text-center text-sm text-gray-500">
        No SOPs yet. Click &quot;New SOP&quot; in the sidebar to get started.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse overflow-hidden rounded-lg bg-white text-sm shadow-sm">
      <thead>
        <tr className="border-b bg-gray-50 text-left text-gray-600">
          <th className="px-4 py-3 font-medium">Doc. Number</th>
          <th className="px-4 py-3 font-medium">Title</th>
          <th className="px-4 py-3 font-medium">Category</th>
          <th className="px-4 py-3 font-medium">Version</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium">Valid Until</th>
        </tr>
      </thead>
      <tbody>
        {sops.map((sop) => (
          <tr
            onClick={() => handleNavigation(sop.id)}
            key={sop.id}
            className="cursor-pointer border-b last:border-0 hover:bg-gray-50"
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNavigation(sop.id);
              }
            }}
          >
            <td className="px-4 py-3 font-mono text-xs text-gray-600">
              {sop.document_number}
            </td>
            <td className="px-4 py-3">
              <Link
                href={`/sop/${sop.id}`}
                className="font-medium text-gray-900 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {sop.title}
              </Link>
            </td>
            <td className="px-4 py-3 text-gray-600">
              {sop.category?.name ?? "-"}
            </td>
            <td className="px-4 py-3 text-gray-600">
              {sop.current_version
                ? `v${sop.current_version.version_number}`
                : "-"}
            </td>
            <td className="px-4 py-3">
              <SopStatusBadge status={sop.status} />
            </td>
            <td className="px-4 py-3 text-gray-600">
              {sop.current_version?.valid_until ?? "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

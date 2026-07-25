// app/sop/[id]/print/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./PrintButton";

export default async function SopPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: sop } = await supabase
    .from("sops")
    .select(
      `
      id, title, document_number, status,
      current_version:sop_versions!fk_sops_current_version (
        id, version_number, content, author_id, reviewer_id, approver_id,
        created_at, reviewed_at, approved_at, published_at
      )
    `,
    )
    .eq("id", id)
    .single();

  if (!sop) notFound();

  const version = Array.isArray(sop.current_version)
    ? sop.current_version[0]
    : sop.current_version;
  if (!version) notFound();
  const content = version.content ?? {};

  // Ambil nama + jabatan author/reviewer/approver dalam satu query
  const stakeholderIds = [
    version.author_id,
    version.reviewer_id,
    version.approver_id,
  ].filter(Boolean);
  const { data: stakeholders } = await supabase
    .from("users")
    .select("id, name, position_title")
    .in("id", stakeholderIds);

  const findUser = (uid: string | null) =>
    stakeholders?.find((u) => u.id === uid);
  const author = findUser(version.author_id);
  const reviewer = findUser(version.reviewer_id);
  const approver = findUser(version.approver_id);

  // Revision history: ikuti rantai previous_version_id dari versi awal s.d. versi ini
  const { data: allVersions } = await supabase
    .from("sop_versions")
    .select(
      "id, version_number, author_id, created_at, published_at, change_summary",
    )
    .eq("sop_id", id)
    .order("version_number", { ascending: true });

  const authorIds = [...new Set((allVersions ?? []).map((v) => v.author_id))];
  const { data: versionAuthors } = await supabase
    .from("users")
    .select("id, name")
    .in("id", authorIds);

  const revisionHistory = (allVersions ?? []).map((v) => ({
    version: v.version_number,
    date: v.published_at ?? v.created_at,
    author: versionAuthors?.find((u) => u.id === v.author_id)?.name ?? "-",
    description:
      v.version_number === 1
        ? "Dokumen pertama kali dibuat"
        : v.change_summary || "-",
  }));

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("id-ID") : "-";

  return (
    <div className="print-page bg-white">
      <PrintButton />

      {/* Header berulang tiap halaman cetak — lihat CSS @media print di bawah */}
      <div className="print-header">
        <table className="header-table">
          <tbody>
            <tr>
              <td rowSpan={2} className="logo-cell">
                Company Logo
              </td>
              <td rowSpan={2} className="doc-type-cell">
                Document Type (Standard Operating Procedure)
                <div className="doc-title">{sop.title}</div>
              </td>
              <td className="label-cell">Doc No</td>
              <td className="colon-cell">:</td>
              <td className="value-cell">{sop.document_number}</td>
            </tr>
            <tr>
              <td className="label-cell">Version</td>
              <td className="colon-cell">:</td>
              <td className="value-cell">v{version.version_number}</td>
            </tr>
            <tr>
              <td rowSpan={2} className="doc-title-cell">
                Document Title
              </td>
              <td className="label-cell">Date</td>
              <td className="colon-cell">:</td>
              <td className="value-cell">
                {fmt(version.published_at ?? version.created_at)}
              </td>
            </tr>
            <tr>
              <td className="label-cell">Page</td>
              <td className="colon-cell">:</td>
              <td className="value-cell page-number" />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tabel pembuat/reviewer/approver — hanya di halaman pertama */}
      <table className="signers-table">
        <thead>
          <tr>
            <th>Created By:</th>
            <th>Reviewed By:</th>
            <th>Approved By:</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{author?.name ?? "-"}</td>
            <td>{reviewer?.name ?? "-"}</td>
            <td>{approver?.name ?? "-"}</td>
          </tr>
          <tr>
            <td>{author?.position_title ?? "-"}</td>
            <td>{reviewer?.position_title ?? "-"}</td>
            <td>{approver?.position_title ?? "-"}</td>
          </tr>
          <tr>
            <td>{fmt(version.created_at)}</td>
            <td>{fmt(version.reviewed_at)}</td>
            <td>{fmt(version.approved_at)}</td>
          </tr>
        </tbody>
      </table>

      <div className="doc-body">
        <section>
          <h3>1.0 Purpose</h3>
          <p>{content.purpose}</p>
        </section>

        <section>
          <h3>2.0 Scope</h3>
          <p>{content.scope?.applies_to}</p>
        </section>

        {content.references?.length > 0 && (
          <section>
            <h3>3.0 References &amp; Related Documents</h3>
            <ul>
              {content.references.map((r: any, i: number) => (
                <li key={i}>
                  {r.doc_number && `${r.doc_number} — `}
                  {r.title}
                </li>
              ))}
            </ul>
          </section>
        )}

        {content.definitions?.length > 0 && (
          <section>
            <h3>4.0 Definitions</h3>
            <ul>
              {content.definitions.map((d: any, i: number) => (
                <li key={i}>
                  <strong>{d.term}</strong>: {d.definition}
                </li>
              ))}
            </ul>
          </section>
        )}

        {content.roles_responsibilities?.length > 0 && (
          <section>
            <h3>5.0 Roles and Responsibilities</h3>
            <ul>
              {content.roles_responsibilities.map((r: any, i: number) => (
                <li key={i}>
                  <strong>{r.role}</strong>: {r.responsibility}
                </li>
              ))}
            </ul>
          </section>
        )}

        {content.procedure?.length > 0 && (
          <section>
            <h3>6.0 Procedure</h3>
            <ol>
              {content.procedure.map((step: any, i: number) => (
                <li key={i}>
                  <strong>{step.major_step}</strong>
                  {step.actions?.length > 0 && (
                    <ul>
                      {step.actions.map((a: string, j: number) => (
                        <li key={j}>{a}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {content.appendices?.length > 0 && (
          <section>
            <h3>7.0 Appendices</h3>
            <ul>
              {content.appendices.map((a: any, i: number) => (
                <li key={i}>
                  {a.description} {a.type && `(${a.type})`}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3>8.0 Revision History</h3>
          <table className="revision-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Date</th>
                <th>Description</th>
                <th>Changed By</th>
              </tr>
            </thead>
            <tbody>
              {revisionHistory.map((r) => (
                <tr key={r.version}>
                  <td>V{r.version}</td>
                  <td>{fmt(r.date)}</td>
                  <td>{r.description}</td>
                  <td>{r.author}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <style>{`
        .print-page { max-width: 800px; margin: 0 auto; padding: 24px; font-size: 13px; color: #111; }
        .header-table, .signers-table, .revision-table {
          width: 100%; border-collapse: collapse; margin-bottom: 16px;
        }
        .header-table td, .signers-table th, .signers-table td,
        .revision-table th, .revision-table td {
          border: 1px solid #000; padding: 4px 8px; text-align: left; font-size: 12px;
        }
        .logo-cell { width: 100px; text-align: center; vertical-align: middle; }
        .doc-type-cell { width: 260px; }
        .doc-title { font-weight: 600; margin-top: 4px; }
        .label-cell { width: 60px; }
        .colon-cell { width: 12px; text-align: center; }
        .doc-body section { margin-bottom: 14px; }
        .doc-body h3 { font-size: 13px; margin: 0 0 4px; }

        /* No-print button */
        .no-print-btn { }

        @media print {
          .no-print-btn { display: none; }
          @page { margin: 100px 24px 40px 24px; size: A4; }

          .print-header {
            position: fixed;
            top: 0; left: 0; right: 0;
          }

          /* "Page X" — dukungan CSS counter utk nomor halaman terbatas di
             sebagian browser. Chrome tidak menaruh nilai ke elemen biasa,
             hanya ke margin box @page. Kalau butuh nomor halaman akurat,
             pakai library seperti Paged.js (lihat catatan di bawah). */
        }
      `}</style>
    </div>
  );
}

-- =========================================================
-- Full dummy-company seed: Tasman BioChem Ltd
-- Imported food ingredients / pharmaceutical raw materials /
-- industrial chemicals distributor, based in Auckland, NZ.
-- =========================================================
-- PREREQUISITES:
--   1. sql-001 .. sql-006 already applied.
--   2. sql-007_ai_chat_support.sql already applied (this file calls
--      regenerate_sop_content_chunks() near the bottom).
--   3. The 13 users below have ALREADY signed up via /signup, so
--      they exist in auth.users / public.users with role='staff'
--      and department_id=null (the default from the signup trigger).
--      This file promotes their role/department by email.
--
-- Dummy users (sign these up first, any password, doesn't matter):
--   michael.davies@tasmanbiochem.co.nz    General Manager
--   sarah.mitchell@tasmanbiochem.co.nz    QA Manager
--   james.ngata@tasmanbiochem.co.nz       QA Officer
--   david.chen@tasmanbiochem.co.nz        Operations Director
--   priya.patel@tasmanbiochem.co.nz       Import & Customs Coordinator
--   mark.thompson@tasmanbiochem.co.nz     Purchasing Manager
--   aroha.wilson@tasmanbiochem.co.nz      Warehouse Supervisor
--   liam.oconnor@tasmanbiochem.co.nz      Transport & Logistics Coordinator
--   tane.williams@tasmanbiochem.co.nz     Supply & Demand Planner
--   grace.liu@tasmanbiochem.co.nz         Customer Support Lead
--   emma.robertson@tasmanbiochem.co.nz    HR Manager
--   ben.anderson@tasmanbiochem.co.nz      IT Administrator
--   rachel.kim@tasmanbiochem.co.nz        Sales & Marketing Manager
-- =========================================================

-- ---------------------------------------------------------
-- 1. DEPARTMENTS
-- ---------------------------------------------------------
insert into departments (name, code) values
  ('Quality', 'QA'),
  ('Operations', 'OPS'),
  ('HR', 'HR'),
  ('Sales & Marketing', 'SM')
on conflict (name) do update set code = excluded.code;

-- ---------------------------------------------------------
-- 2. Promote roles + assign department per user
--
-- Note: trg_prevent_self_role_change (sql-001) blocks role/department_id
-- changes unless is_admin_or_dc() returns true, which checks auth.uid()
-- — NULL in the SQL Editor (no real Auth session here), so it always
-- fails here. Disabled just for this bulk admin step, then re-enabled
-- immediately after.
-- ---------------------------------------------------------
alter table users disable trigger trg_prevent_self_role_change;

update users set role = 'admin', department_id = null
  where email = 'michael.davies@tasmanbiochem.co.nz';

update users set role = 'document_controller',
  department_id = (select id from departments where code = 'QA')
  where email = 'sarah.mitchell@tasmanbiochem.co.nz';

update users set department_id = (select id from departments where code = 'QA')
  where email = 'james.ngata@tasmanbiochem.co.nz';

update users set role = 'admin',
  department_id = (select id from departments where code = 'OPS')
  where email = 'david.chen@tasmanbiochem.co.nz';

update users set department_id = (select id from departments where code = 'OPS')
  where email in (
    'priya.patel@tasmanbiochem.co.nz',
    'mark.thompson@tasmanbiochem.co.nz',
    'aroha.wilson@tasmanbiochem.co.nz',
    'liam.oconnor@tasmanbiochem.co.nz',
    'tane.williams@tasmanbiochem.co.nz',
    'grace.liu@tasmanbiochem.co.nz'
  );

update users set department_id = (select id from departments where code = 'HR')
  where email in ('emma.robertson@tasmanbiochem.co.nz', 'ben.anderson@tasmanbiochem.co.nz');

update users set department_id = (select id from departments where code = 'SM')
  where email = 'rachel.kim@tasmanbiochem.co.nz';

alter table users enable trigger trg_prevent_self_role_change;

-- ---------------------------------------------------------
-- 3. SOP CATEGORIES (19 total)
-- Reviewer/approver mapping (illustrative — adjust to your real org):
--   Quality categories        -> reviewer: Sarah Mitchell, approver: Michael Davies
--   Purchasing                -> reviewer: Mark Thompson,  approver: David Chen
--                                 (mirrors the PO approval chain: Officer -> Manager -> Director -> GM)
--   Other Operations          -> reviewer: David Chen,     approver: Michael Davies
--   HR                        -> reviewer: David Chen,     approver: Michael Davies
--   Sales & Marketing         -> reviewer: Sarah Mitchell, approver: Michael Davies
--                                 (QA reviews marketing/regulatory claims for food & pharma products)
-- ---------------------------------------------------------
insert into sop_categories (name, department_id, default_reviewer_id, default_approver_id) values
  ('Document Control & Records Management', (select id from departments where code='QA'),
    (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Supplier Qualification & Approved Supplier List', (select id from departments where code='QA'),
    (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Incoming Goods Inspection, Traceability & COA Verification', (select id from departments where code='QA'),
    (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Non-Conforming Product, Complaint & Recall Management', (select id from departments where code='QA'),
    (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Internal Audit & Management Review', (select id from departments where code='QA'),
    (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Corrective and Preventive Action (CAPA)', (select id from departments where code='QA'),
    (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),

  ('Import Shipment Processing & Biosecurity Clearance', (select id from departments where code='OPS'),
    (select id from users where email='david.chen@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Purchase Order & Supplier Performance Evaluation', (select id from departments where code='OPS'),
    (select id from users where email='mark.thompson@tasmanbiochem.co.nz'),
    (select id from users where email='david.chen@tasmanbiochem.co.nz')),
  ('Segregated Storage of Food, Pharma & Industrial Chemicals', (select id from departments where code='OPS'),
    (select id from users where email='david.chen@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Inventory Management (FIFO/FEFO)', (select id from departments where code='OPS'),
    (select id from users where email='david.chen@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Dangerous Goods Transport & Delivery', (select id from departments where code='OPS'),
    (select id from users where email='david.chen@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Demand Forecasting & Stock Replenishment', (select id from departments where code='OPS'),
    (select id from users where email='david.chen@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Customer Order Handling & Complaint Intake', (select id from departments where code='OPS'),
    (select id from users where email='david.chen@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),

  ('Employee Onboarding & Safety Induction', (select id from departments where code='HR'),
    (select id from users where email='david.chen@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Leave & Attendance Management', (select id from departments where code='HR'),
    (select id from users where email='david.chen@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('IT User Access Provisioning & Deprovisioning', (select id from departments where code='HR'),
    (select id from users where email='david.chen@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Data Backup & IT Security Incident Response', (select id from departments where code='HR'),
    (select id from users where email='david.chen@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),

  ('Sales Quotation & Contract Review', (select id from departments where code='SM'),
    (select id from users where email='david.chen@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz')),
  ('Marketing Collateral & Regulatory Claims Approval', (select id from departments where code='SM'),
    (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
    (select id from users where email='michael.davies@tasmanbiochem.co.nz'));

-- ---------------------------------------------------------
-- 4. Sync department_sop_counters so future organic SOP creation
-- (via generate_sop_document_number) continues numbering after
-- the ones we're about to hard-insert below.
-- ---------------------------------------------------------
update department_sop_counters set last_number = 6
  where department_id = (select id from departments where code = 'QA');
update department_sop_counters set last_number = 7
  where department_id = (select id from departments where code = 'OPS');
update department_sop_counters set last_number = 4
  where department_id = (select id from departments where code = 'HR');
update department_sop_counters set last_number = 2
  where department_id = (select id from departments where code = 'SM');

-- =========================================================
-- 5. SOPs + first version content
-- 16 published (so the AI Assistant has real content to search),
-- 3 left mid-lifecycle for demo purposes: one draft, one in_review,
-- one in_approval.
-- =========================================================

-- ---------- SOP-QA-0001: Document Control & Records Management ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Document Control & Records Management'),
    'Document Control & Records Management', 'SOP-QA-0001', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Defines how SOPs and quality records are drafted, numbered, reviewed, approved, published, and retired, so every controlled document reflects the current approved procedure.",
    "scope": {"applies_to": "All SOPs, forms, and quality records generated across every department.", "excludes": "Financial/accounting records, which follow a separate retention policy."},
    "references": [{"doc_number": "ISO 9001:2015", "title": "Clause 7.5 Documented Information"}],
    "definitions": [{"term": "Controlled document", "definition": "A document whose creation, revision, and distribution is tracked, so only the current approved version is in use."}],
    "roles_responsibilities": [
      {"role": "Document Controller", "responsibility": "Assigns document numbers, manages the approval workflow, and archives superseded versions."},
      {"role": "Author", "responsibility": "Drafts the SOP content and submits it for review."}
    ],
    "procedure": [
      {"major_step": "Draft creation", "actions": ["Author creates a draft using the standard SOP template.", "Document number is auto-reserved per department on creation."], "notes": []},
      {"major_step": "Review and approval", "actions": ["Reviewer checks technical accuracy and completeness.", "Approver signs off and the SOP status becomes Published."], "notes": ["A rejected/revision-requested SOP returns to Draft for the author to amend."]},
      {"major_step": "Version control and retirement", "actions": ["A new approved version automatically supersedes the previous one.", "Superseded versions remain accessible for audit trail but are marked as not current."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='james.ngata@tasmanbiochem.co.nz'),
  (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '20 days', now() - interval '15 days', now() - interval '15 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-QA-0002: Supplier Qualification & Approved Supplier List ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Supplier Qualification & Approved Supplier List'),
    'Supplier Qualification & Approved Supplier List', 'SOP-QA-0002', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Ensures every supplier of imported food, pharmaceutical, or industrial-chemical raw material is vetted and approved before any purchase order is raised against them.",
    "scope": {"applies_to": "All new suppliers and any new grade/material from an existing supplier.", "excludes": "Purchases of general office/facility supplies."},
    "references": [{"doc_number": "SOP-OPS-0002", "title": "Purchase Order & Supplier Performance Evaluation"}],
    "definitions": [{"term": "Approved Supplier List (ASL)", "definition": "The master list of suppliers cleared by Quality to supply a given material."}, {"term": "COA", "definition": "Certificate of Analysis provided by the supplier confirming batch specifications."}],
    "roles_responsibilities": [
      {"role": "QA Manager", "responsibility": "Reviews supplier documentation (GMP/HACCP certificates, COA samples) and approves ASL entry."},
      {"role": "Purchasing Manager", "responsibility": "Initiates the qualification request and cannot raise a PO to a supplier not yet on the ASL."}
    ],
    "procedure": [
      {"major_step": "Qualification request", "actions": ["Purchasing submits supplier profile, GMP/HACCP/ISO certificates, and sample COA to Quality.", "For pharma-grade material, a Good Distribution Practice (GDP) declaration is also required."], "notes": []},
      {"major_step": "Quality review", "actions": ["QA Manager verifies certificate validity and checks specification against required grade.", "Site audit or questionnaire is completed for first-time high-risk suppliers."], "notes": []},
      {"major_step": "ASL entry and PO release", "actions": ["Approved supplier and material combination is added to the ASL.", "Purchasing system checks the ASL before releasing any PO."], "notes": ["A PO to a non-ASL supplier must be rejected — no verbal exception permitted."]}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='james.ngata@tasmanbiochem.co.nz'),
  (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '18 days', now() - interval '12 days', now() - interval '12 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-QA-0003: Incoming Goods Inspection, Traceability & COA Verification ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Incoming Goods Inspection, Traceability & COA Verification'),
    'Incoming Goods Inspection, Traceability & COA Verification', 'SOP-QA-0003', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Confirms every incoming batch of imported material matches its COA and specification before release, and establishes lot-level traceability from goods-in to customer dispatch.",
    "scope": {"applies_to": "All imported food ingredient, pharmaceutical raw material, and industrial chemical shipments.", "excludes": ""},
    "references": [{"doc_number": "SOP-OPS-0001", "title": "Import Shipment Processing & Biosecurity Clearance"}, {"doc_number": "SOP-OPS-0003", "title": "Segregated Storage of Food, Pharma & Industrial Chemicals"}],
    "definitions": [{"term": "Lot traceability", "definition": "The ability to trace a specific batch from supplier origin through storage to the customer it was dispatched to."}],
    "roles_responsibilities": [{"role": "QA Officer", "responsibility": "Performs incoming inspection, verifies COA against specification, and records lot numbers."}, {"role": "Warehouse Supervisor", "responsibility": "Holds all incoming goods in the Quarantine Zone until QA releases them."}],
    "procedure": [
      {"major_step": "Goods receipt into quarantine", "actions": ["All incoming pallets are placed in the Quarantine Zone, never directly onto sellable racking.", "Delivery documents and COA are logged against the internal lot number."], "notes": []},
      {"major_step": "COA and specification verification", "actions": ["QA Officer compares supplier COA values against the approved specification range.", "Physical checks (packaging integrity, labelling, temperature indicator if applicable) are performed."], "notes": []},
      {"major_step": "Release or reject", "actions": ["Conforming lots are marked Released and moved to the appropriate storage zone.", "Non-conforming lots are moved to the Rejected Quarantine Cage and a Non-Conformance record is opened."], "notes": ["See SOP-QA-0004 for handling of non-conforming product."]}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='james.ngata@tasmanbiochem.co.nz'),
  (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '17 days', now() - interval '10 days', now() - interval '10 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-QA-0004: Non-Conforming Product, Complaint & Recall Management ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Non-Conforming Product, Complaint & Recall Management'),
    'Non-Conforming Product, Complaint & Recall Management', 'SOP-QA-0004', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Ensures non-conforming material and customer complaints are contained, investigated, and — where necessary — escalated to a product recall, protecting customers from unsafe or out-of-spec material.",
    "scope": {"applies_to": "Any non-conformance found internally or reported by a customer, for any product category.", "excludes": ""},
    "references": [{"doc_number": "SOP-QA-0006", "title": "Corrective and Preventive Action (CAPA)"}],
    "definitions": [{"term": "Recall", "definition": "Removal of a specific lot from customers' custody due to a confirmed quality or safety issue."}],
    "roles_responsibilities": [{"role": "Customer Support Lead", "responsibility": "Logs every complaint the same day it is received and forwards it to Quality."}, {"role": "QA Manager", "responsibility": "Investigates root cause and decides whether a recall is required."}],
    "procedure": [
      {"major_step": "Containment", "actions": ["Affected lot is immediately quarantined at all locations (warehouse and, if needed, in-transit).", "Customer Support notifies affected customers not to use the lot pending investigation."], "notes": []},
      {"major_step": "Investigation", "actions": ["QA reviews COA, storage log, and any deviation records for the lot.", "Root cause is documented and a CAPA is opened if a systemic issue is found."], "notes": []},
      {"major_step": "Recall decision and closure", "actions": ["If risk is confirmed, General Manager authorises a full recall notice to all customers who received the lot.", "Closure report is filed once all affected stock is returned, destroyed, or reworked."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='james.ngata@tasmanbiochem.co.nz'),
  (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '16 days', now() - interval '9 days', now() - interval '9 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-QA-0005: Internal Audit & Management Review ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Internal Audit & Management Review'),
    'Internal Audit & Management Review', 'SOP-QA-0005', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Establishes a recurring internal audit schedule and management review cycle to confirm the QMS remains effective and ISO 9001 conformant.",
    "scope": {"applies_to": "All departments and all published SOPs.", "excludes": ""},
    "references": [{"doc_number": "ISO 9001:2015", "title": "Clause 9.2 Internal Audit, Clause 9.3 Management Review"}],
    "definitions": [{"term": "Management review", "definition": "A periodic meeting where leadership reviews audit results, complaints, and CAPA status to decide on QMS improvements."}],
    "roles_responsibilities": [{"role": "QA Manager", "responsibility": "Plans the annual audit schedule and reports findings."}, {"role": "General Manager", "responsibility": "Chairs the management review and approves resulting action items."}],
    "procedure": [
      {"major_step": "Audit planning", "actions": ["Every department and active SOP is audited at least once per year.", "Audit checklist is derived from the relevant published SOPs."], "notes": []},
      {"major_step": "Audit execution", "actions": ["Auditor interviews staff and reviews records against the SOP requirements.", "Findings are classified as observation, minor non-conformance, or major non-conformance."], "notes": []},
      {"major_step": "Management review", "actions": ["Quarterly review meeting covers audit findings, complaint trends, and CAPA status.", "Action items are assigned an owner and due date."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='james.ngata@tasmanbiochem.co.nz'),
  (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '14 days', now() - interval '8 days', now() - interval '8 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-QA-0006: CAPA ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Corrective and Preventive Action (CAPA)'),
    'Corrective and Preventive Action (CAPA)', 'SOP-QA-0006', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Defines how root causes of non-conformances, complaints, or audit findings are corrected and prevented from recurring.",
    "scope": {"applies_to": "Any issue raised via SOP-QA-0004, internal audit, or a supplier performance failure.", "excludes": ""},
    "references": [{"doc_number": "SOP-QA-0004", "title": "Non-Conforming Product, Complaint & Recall Management"}],
    "definitions": [{"term": "CAPA", "definition": "Corrective and Preventive Action — a documented plan to fix a root cause and prevent recurrence."}],
    "roles_responsibilities": [{"role": "Issue owner", "responsibility": "Investigates root cause and implements the corrective action within the agreed timeframe."}, {"role": "QA Manager", "responsibility": "Verifies effectiveness before closing the CAPA."}],
    "procedure": [
      {"major_step": "CAPA opening", "actions": ["A CAPA record is opened whenever a non-conformance, complaint, or audit finding is confirmed.", "An owner and target closure date are assigned."], "notes": []},
      {"major_step": "Root cause analysis and action plan", "actions": ["Owner documents the root cause (not just the symptom).", "Corrective action addresses the immediate issue; preventive action addresses the systemic cause."], "notes": []},
      {"major_step": "Verification and closure", "actions": ["QA verifies the action was implemented and is effective (e.g. no recurrence after one review cycle).", "CAPA is closed and logged for the next management review."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='james.ngata@tasmanbiochem.co.nz'),
  (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '13 days', now() - interval '7 days', now() - interval '7 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-OPS-0001: Import Shipment Processing & Biosecurity Clearance ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Import Shipment Processing & Biosecurity Clearance'),
    'Import Shipment Processing & Biosecurity Clearance', 'SOP-OPS-0001', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Defines how inbound international shipments of food ingredients, pharmaceutical raw materials, and industrial chemicals are cleared through customs and biosecurity before entering the warehouse.",
    "scope": {"applies_to": "All sea and air freight imports.", "excludes": "Domestic (New Zealand-origin) purchases."},
    "references": [{"doc_number": "Customs and Excise Act 2018", "title": "NZ Customs import requirements"}, {"doc_number": "MPI Import Health Standards", "title": "Ministry for Primary Industries biosecurity clearance"}],
    "definitions": [{"term": "IHS", "definition": "Import Health Standard — MPI's biosecurity requirements for a given commodity."}],
    "roles_responsibilities": [{"role": "Import & Customs Coordinator", "responsibility": "Prepares customs entry documents and liaises with the customs broker and MPI."}, {"role": "Warehouse Supervisor", "responsibility": "Receives cleared goods into the Quarantine Zone."}],
    "procedure": [
      {"major_step": "Pre-arrival documentation", "actions": ["Verify commercial invoice, packing list, and COA are received from the supplier before the vessel/flight arrives.", "Confirm the correct IHS applies to the commodity and HS tariff code."], "notes": []},
      {"major_step": "Customs and biosecurity clearance", "actions": ["Submit customs entry via broker; pay duty/GST as assessed.", "MPI inspection is arranged if the shipment is selected for biosecurity check."], "notes": ["Any MPI hold must be resolved before the shipment can move to the warehouse — no exceptions."]},
      {"major_step": "Handover to warehouse", "actions": ["Cleared shipment is transported to the warehouse and placed directly into the Quarantine Zone.", "Import documents are attached to the internal lot record for traceability."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='priya.patel@tasmanbiochem.co.nz'),
  (select id from users where email='david.chen@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '20 days', now() - interval '14 days', now() - interval '14 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-OPS-0002: Purchase Order & Supplier Performance Evaluation ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Purchase Order & Supplier Performance Evaluation'),
    'Purchase Order & Supplier Performance Evaluation', 'SOP-OPS-0002', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Sets the approval levels required to raise a purchase order and how supplier performance is periodically reviewed.",
    "scope": {"applies_to": "All purchase orders for imported raw materials.", "excludes": "Petty cash and office supply purchases under NZD 500."},
    "references": [{"doc_number": "SOP-QA-0002", "title": "Supplier Qualification & Approved Supplier List"}],
    "definitions": [{"term": "ASL", "definition": "Approved Supplier List — a PO cannot be raised to a supplier/material combination not on this list."}],
    "roles_responsibilities": [{"role": "Purchasing Manager", "responsibility": "Approves POs within their delegated authority and escalates larger POs."}, {"role": "Operations Director", "responsibility": "Approves POs between NZD 25,000 and 100,000."}, {"role": "General Manager", "responsibility": "Approves POs over NZD 100,000, jointly with the QA Manager."}],
    "procedure": [
      {"major_step": "PO approval thresholds", "actions": ["Under NZD 5,000: Purchasing Officer self-approves.", "NZD 5,000-25,000: Purchasing Manager approves.", "NZD 25,000-100,000: Operations Director approves.", "Over NZD 100,000: General Manager approves, with QA Manager co-sign."], "notes": ["Any pharma-grade material PO requires QA Manager co-sign regardless of value.", "Splitting one order into multiple smaller POs to avoid an approval threshold is prohibited."]},
      {"major_step": "Emergency order exception", "actions": ["Operations Director may verbally authorise an urgent order.", "Formal PO and full approval must be completed and logged within 24 hours as a documented retroactive exception."], "notes": []},
      {"major_step": "Supplier performance review", "actions": ["On-time delivery and COA conformance are tracked per supplier each quarter.", "Suppliers falling below the agreed performance threshold are flagged for corrective discussion or removal from the ASL."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='mark.thompson@tasmanbiochem.co.nz'),
  (select id from users where email='mark.thompson@tasmanbiochem.co.nz'),
  (select id from users where email='david.chen@tasmanbiochem.co.nz'),
  now() - interval '19 days', now() - interval '13 days', now() - interval '13 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-OPS-0003: Segregated Storage of Food, Pharma & Industrial Chemicals ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Segregated Storage of Food, Pharma & Industrial Chemicals'),
    'Segregated Storage of Food, Pharma & Industrial Chemicals', 'SOP-OPS-0003', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Defines the physical storage zones and handling rules that prevent cross-contamination between food-grade, pharma-grade, and industrial chemical stock, and that keep hazardous substances safely segregated.",
    "scope": {"applies_to": "All warehoused stock at every site.", "excludes": ""},
    "references": [{"doc_number": "HSNO Act 1996", "title": "Hazardous Substances and New Organisms Act"}, {"doc_number": "WorkSafe NZ", "title": "Hazardous substances storage guidance"}],
    "definitions": [{"term": "Bunded area", "definition": "A storage area with a raised perimeter to contain spills from liquid chemical containers."}, {"term": "FEFO", "definition": "First-Expired-First-Out — dispatch priority based on expiry date rather than arrival date."}],
    "roles_responsibilities": [{"role": "Warehouse Supervisor", "responsibility": "Maintains zone segregation and monitors temperature/humidity logs."}],
    "procedure": [
      {"major_step": "Zone allocation", "actions": ["Quarantine Zone holds all goods pending QA release.", "Food-Grade Zone is maintained at the temperature stated on the material's COA, typically 15-25C or 2-8C.", "Pharma-Grade Zone has restricted card access and continuous temperature/humidity monitoring per GDP principles.", "Industrial Chemical Zone segregates by HSNO compatibility class (e.g. oxidisers kept apart from flammables) with bunded containment for liquids."], "notes": []},
      {"major_step": "Movement and traceability", "actions": ["Every movement between zones (quarantine to released, released to rejected) is logged with who moved it and when.", "Rejected or non-conforming stock goes to the locked Rejected Quarantine Cage, never mixed with saleable stock."], "notes": []},
      {"major_step": "Stock rotation", "actions": ["All food and pharma-grade material is picked on a FEFO basis.", "Any lot within 90 days of expiry is flagged in the system for priority dispatch or disposition review."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='aroha.wilson@tasmanbiochem.co.nz'),
  (select id from users where email='david.chen@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '18 days', now() - interval '12 days', now() - interval '12 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-OPS-0004: Inventory Management (FIFO/FEFO) ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Inventory Management (FIFO/FEFO)'),
    'Inventory Management (FIFO/FEFO)', 'SOP-OPS-0004', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Ensures stock accuracy and correct rotation across all storage zones through routine cycle counts and system reconciliation.",
    "scope": {"applies_to": "All warehoused inventory.", "excludes": ""},
    "references": [{"doc_number": "SOP-OPS-0003", "title": "Segregated Storage of Food, Pharma & Industrial Chemicals"}],
    "definitions": [{"term": "Cycle count", "definition": "A partial physical stock count performed on a rotating schedule rather than counting the entire warehouse at once."}],
    "roles_responsibilities": [{"role": "Warehouse Supervisor", "responsibility": "Runs the monthly cycle count and investigates discrepancies."}],
    "procedure": [
      {"major_step": "Monthly cycle count", "actions": ["A subset of SKUs is physically counted each month on a rotating schedule so every SKU is counted at least quarterly.", "Counts are reconciled against system quantities the same day."], "notes": []},
      {"major_step": "Discrepancy investigation", "actions": ["Any variance over 2% of system quantity triggers an investigation.", "Root cause (miscount, mis-pick, damage, theft) is recorded and corrected in the system."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='aroha.wilson@tasmanbiochem.co.nz'),
  (select id from users where email='david.chen@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '15 days', now() - interval '9 days', now() - interval '9 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-OPS-0005: Dangerous Goods Transport & Delivery ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Dangerous Goods Transport & Delivery'),
    'Dangerous Goods Transport & Delivery', 'SOP-OPS-0005', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Ensures hazardous chemical deliveries comply with New Zealand dangerous goods transport rules and arrive without incident.",
    "scope": {"applies_to": "Any delivery containing an HSNO-classified hazardous substance.", "excludes": "Non-hazardous food ingredient deliveries, which follow standard transport handling."},
    "references": [{"doc_number": "Land Transport Rule: Dangerous Goods 2005", "title": "NZ dangerous goods transport requirements"}],
    "definitions": [{"term": "DG placarding", "definition": "The hazard class signage required on a vehicle carrying dangerous goods above certain quantities."}],
    "roles_responsibilities": [{"role": "Transport & Logistics Coordinator", "responsibility": "Confirms the carrier holds a current Dangerous Goods licence and that placarding/documentation is correct before dispatch."}],
    "procedure": [
      {"major_step": "Pre-dispatch check", "actions": ["Verify carrier's Dangerous Goods licence is current.", "Confirm Safety Data Sheet accompanies the shipment and correct DG placarding is applied."], "notes": []},
      {"major_step": "In-transit and delivery", "actions": ["Driver follows the segregation rules for mixed loads (e.g. no co-loading of incompatible hazard classes).", "Proof of delivery is captured and matched to the dispatch record for traceability."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='liam.oconnor@tasmanbiochem.co.nz'),
  (select id from users where email='david.chen@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '12 days', now() - interval '6 days', now() - interval '6 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-OPS-0006: Demand Forecasting & Stock Replenishment (DRAFT — mid-lifecycle demo) ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Demand Forecasting & Stock Replenishment'),
    'Demand Forecasting & Stock Replenishment', 'SOP-OPS-0006', 'draft')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id)
  select new_sop.id, 1,
  $j${
    "purpose": "Defines how monthly demand is forecast and translated into replenishment purchase requests, accounting for long import lead times.",
    "scope": {"applies_to": "All actively stocked SKUs.", "excludes": ""},
    "references": [],
    "definitions": [],
    "roles_responsibilities": [{"role": "Supply & Demand Planner", "responsibility": "Owns the monthly forecast and raises replenishment requests to Purchasing."}],
    "procedure": [],
    "appendices": []
  }$j$::jsonb,
  'draft',
  (select id from users where email='tane.williams@tasmanbiochem.co.nz')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-OPS-0007: Customer Order Handling & Complaint Intake ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Customer Order Handling & Complaint Intake'),
    'Customer Order Handling & Complaint Intake', 'SOP-OPS-0007', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Defines how customer orders are captured and confirmed, and how complaints are logged and routed to Quality the same day they are received.",
    "scope": {"applies_to": "All customer orders and complaints received by phone, email, or the customer portal.", "excludes": ""},
    "references": [{"doc_number": "SOP-QA-0004", "title": "Non-Conforming Product, Complaint & Recall Management"}],
    "definitions": [],
    "roles_responsibilities": [{"role": "Customer Support Lead", "responsibility": "Confirms order details against current stock and pricing, and logs every complaint the same day."}],
    "procedure": [
      {"major_step": "Order intake", "actions": ["Confirm SKU, quantity, and delivery date against current stock availability.", "Order confirmation is sent to the customer before it is released to the warehouse for picking."], "notes": []},
      {"major_step": "Complaint intake", "actions": ["Every complaint is logged the same day it is received, regardless of severity.", "Complaint is forwarded to Quality within 24 hours per SOP-QA-0004."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='grace.liu@tasmanbiochem.co.nz'),
  (select id from users where email='david.chen@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '11 days', now() - interval '5 days', now() - interval '5 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-HR-0001: Employee Onboarding & Safety Induction ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Employee Onboarding & Safety Induction'),
    'Employee Onboarding & Safety Induction', 'SOP-HR-0001', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Ensures every new employee completes safety induction, including hazardous-substance handling awareness, before working unsupervised.",
    "scope": {"applies_to": "All new employees and contractors working on-site.", "excludes": ""},
    "references": [],
    "definitions": [],
    "roles_responsibilities": [{"role": "HR Manager", "responsibility": "Schedules onboarding and confirms all induction items are completed before the employee's first unsupervised shift."}],
    "procedure": [
      {"major_step": "Day-one onboarding", "actions": ["Complete IT access setup, PPE issue, and site safety walkthrough.", "Warehouse-based roles complete hazardous substance handling induction before entering storage zones."], "notes": []},
      {"major_step": "Sign-off", "actions": ["New employee and direct manager sign off the induction checklist.", "Signed checklist is filed in the employee's HR record."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='emma.robertson@tasmanbiochem.co.nz'),
  (select id from users where email='david.chen@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '10 days', now() - interval '4 days', now() - interval '4 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-HR-0002: Leave & Attendance Management ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Leave & Attendance Management'),
    'Leave & Attendance Management', 'SOP-HR-0002', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Defines how leave requests are submitted, approved, and recorded.",
    "scope": {"applies_to": "All employees.", "excludes": ""},
    "references": [],
    "definitions": [],
    "roles_responsibilities": [{"role": "Direct Manager", "responsibility": "Approves or declines leave requests based on team coverage."}, {"role": "HR Manager", "responsibility": "Maintains the leave balance records."}],
    "procedure": [
      {"major_step": "Leave request", "actions": ["Employee submits a leave request at least 2 weeks in advance where practical.", "Direct manager approves or declines within 3 business days."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='emma.robertson@tasmanbiochem.co.nz'),
  (select id from users where email='david.chen@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '9 days', now() - interval '3 days', now() - interval '3 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-HR-0003: IT User Access Provisioning & Deprovisioning ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='IT User Access Provisioning & Deprovisioning'),
    'IT User Access Provisioning & Deprovisioning', 'SOP-HR-0003', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Ensures system access (including this SOP management application) is granted according to role and revoked immediately on an employee's last day.",
    "scope": {"applies_to": "All internal systems, including the SOP Management app, email, and shared drives.", "excludes": ""},
    "references": [],
    "definitions": [{"term": "Least privilege", "definition": "Granting only the access level (staff/document_controller/admin) required for the person's role."}],
    "roles_responsibilities": [{"role": "IT Administrator", "responsibility": "Provisions and deprovisions all system accounts."}, {"role": "HR Manager", "responsibility": "Notifies IT of the employee's last working day."}],
    "procedure": [
      {"major_step": "Provisioning", "actions": ["New account is created with the minimum role required (staff by default).", "Role upgrades to document_controller or admin require General Manager approval."], "notes": []},
      {"major_step": "Deprovisioning", "actions": ["HR notifies IT as soon as an employee's departure date is known.", "All system access is revoked on the employee's last working day, same day."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='ben.anderson@tasmanbiochem.co.nz'),
  (select id from users where email='david.chen@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '8 days', now() - interval '2 days', now() - interval '2 days',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-HR-0004: Data Backup & IT Security Incident Response (IN_APPROVAL — mid-lifecycle demo) ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Data Backup & IT Security Incident Response'),
    'Data Backup & IT Security Incident Response', 'SOP-HR-0004', 'in_approval')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, reviewed_at)
  select new_sop.id, 1,
  $j${
    "purpose": "Defines the backup schedule for business-critical systems and the response process for a suspected IT security incident.",
    "scope": {"applies_to": "The SOP Management application database and all internal file storage.", "excludes": ""},
    "references": [],
    "definitions": [],
    "roles_responsibilities": [{"role": "IT Administrator", "responsibility": "Runs and verifies daily backups, and leads incident response."}],
    "procedure": [
      {"major_step": "Backup schedule", "actions": ["Database is backed up daily with 30-day retention.", "Restore is test-run quarterly to confirm backups are usable."], "notes": []},
      {"major_step": "Incident response", "actions": ["Suspected breach is reported to IT Administrator immediately.", "Affected accounts are suspended pending investigation."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'in_approval',
  (select id from users where email='ben.anderson@tasmanbiochem.co.nz'),
  (select id from users where email='david.chen@tasmanbiochem.co.nz'),
  now() - interval '2 days'
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- Give SOP-HR-0004 an approver_id too (needed for the approverDecision RLS
-- check, done as a follow-up update since sop_versions insert above only
-- set reviewer_id to keep the column list readable).
update sop_versions set approver_id = (select id from users where email='michael.davies@tasmanbiochem.co.nz')
  where sop_id = (select id from sops where document_number = 'SOP-HR-0004');

-- ---------- SOP-SM-0001: Sales Quotation & Contract Review ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Sales Quotation & Contract Review'),
    'Sales Quotation & Contract Review', 'SOP-SM-0001', 'published')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id, reviewed_at, approved_at, published_at, valid_until)
  select new_sop.id, 1,
  $j${
    "purpose": "Ensures customer quotations and contracts are reviewed for commercial and supply-capability accuracy before being sent.",
    "scope": {"applies_to": "All customer-facing quotations and supply contracts.", "excludes": ""},
    "references": [],
    "definitions": [],
    "roles_responsibilities": [{"role": "Sales & Marketing Manager", "responsibility": "Drafts the quotation and confirms pricing against current cost."}, {"role": "Operations Director", "responsibility": "Confirms supply capability before a contract is signed."}],
    "procedure": [
      {"major_step": "Quotation drafting", "actions": ["Pricing is checked against current landed cost, not historical cost.", "Lead time quoted reflects current import lead times."], "notes": []},
      {"major_step": "Contract review", "actions": ["Any contract with recurring volume commitments is reviewed by Operations for supply feasibility before signing.", "Signed contracts are filed and linked to the relevant customer record."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'published',
  (select id from users where email='rachel.kim@tasmanbiochem.co.nz'),
  (select id from users where email='david.chen@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz'),
  now() - interval '7 days', now() - interval '1 day', now() - interval '1 day',
  (current_date + interval '2 years')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- ---------- SOP-SM-0002: Marketing Collateral & Regulatory Claims Approval (IN_REVIEW — mid-lifecycle demo) ----------
with new_sop as (
  insert into sops (category_id, title, document_number, status)
  values ((select id from sop_categories where name='Marketing Collateral & Regulatory Claims Approval'),
    'Marketing Collateral & Regulatory Claims Approval', 'SOP-SM-0002', 'in_review')
  returning id
),
new_version as (
  insert into sop_versions (sop_id, version_number, content, status, author_id, reviewer_id, approver_id)
  select new_sop.id, 1,
  $j${
    "purpose": "Ensures marketing claims about food, pharmaceutical, or chemical products are accurate and do not mislead under the Fair Trading Act 1986.",
    "scope": {"applies_to": "All marketing collateral, website copy, and product labelling claims.", "excludes": ""},
    "references": [{"doc_number": "Fair Trading Act 1986", "title": "NZ consumer protection — misleading and deceptive conduct"}],
    "definitions": [],
    "roles_responsibilities": [{"role": "QA Manager", "responsibility": "Reviews any claim referencing product grade, certification, or regulatory compliance before publication."}],
    "procedure": [
      {"major_step": "Draft and QA review", "actions": ["Marketing drafts collateral referencing product specifications only from the current approved COA/spec sheet.", "QA Manager reviews any claim mentioning grade, purity, or certification before it is published."], "notes": []}
    ],
    "appendices": []
  }$j$::jsonb,
  'in_review',
  (select id from users where email='rachel.kim@tasmanbiochem.co.nz'),
  (select id from users where email='sarah.mitchell@tasmanbiochem.co.nz'),
  (select id from users where email='michael.davies@tasmanbiochem.co.nz')
  from new_sop
  returning id, sop_id
)
update sops set current_version_id = new_version.id from new_version where sops.id = new_version.sop_id;

-- =========================================================
-- 6. Sample quiz questions for 3 published SOPs (for demoing the
-- socialization + quiz flow end-to-end)
-- =========================================================
insert into quiz_questions (sop_version_id, question_text, options, correct_option)
select v.id, 'Which zone must all incoming shipments be placed in before QA release?',
  '["A. Food-Grade Zone", "B. Quarantine Zone", "C. Pharma-Grade Zone"]'::jsonb, 1
from sop_versions v join sops s on s.id = v.sop_id where s.document_number = 'SOP-OPS-0003';

insert into quiz_questions (sop_version_id, question_text, options, correct_option)
select v.id, 'What dispatch method is required for food and pharma-grade stock?',
  '["A. FIFO only", "B. FEFO (First-Expired-First-Out)", "C. LIFO"]'::jsonb, 1
from sop_versions v join sops s on s.id = v.sop_id where s.document_number = 'SOP-OPS-0003';

insert into quiz_questions (sop_version_id, question_text, options, correct_option)
select v.id, 'Who must approve a purchase order between NZD 25,000 and 100,000?',
  '["A. Purchasing Officer", "B. Purchasing Manager", "C. Operations Director"]'::jsonb, 2
from sop_versions v join sops s on s.id = v.sop_id where s.document_number = 'SOP-OPS-0002';

insert into quiz_questions (sop_version_id, question_text, options, correct_option)
select v.id, 'A PO to a supplier not yet on the Approved Supplier List should be:',
  '["A. Approved as a one-off exception", "B. Rejected until the supplier is qualified", "C. Approved verbally by the GM"]'::jsonb, 1
from sop_versions v join sops s on s.id = v.sop_id where s.document_number = 'SOP-OPS-0002';

insert into quiz_questions (sop_version_id, question_text, options, correct_option)
select v.id, 'What must happen to a shipment placed on MPI biosecurity hold?',
  '["A. It can move to the warehouse if urgent", "B. It must be resolved before moving to the warehouse", "C. It can be released by the carrier"]'::jsonb, 1
from sop_versions v join sops s on s.id = v.sop_id where s.document_number = 'SOP-OPS-0001';

-- =========================================================
-- 7. Socialization records for the 3 SOPs above — every Operations
-- department user is notified, mirroring what approverDecision()
-- generates automatically on a real publish.
-- =========================================================
insert into socialization_records (sop_version_id, user_id, notified_at)
select v.id, u.id, now() - interval '5 days'
from sop_versions v
join sops s on s.id = v.sop_id
cross join users u
where s.document_number in ('SOP-OPS-0001', 'SOP-OPS-0002', 'SOP-OPS-0003')
  and u.department_id = (select id from departments where code = 'OPS')
on conflict (sop_version_id, user_id) do nothing;

-- =========================================================
-- 8. Populate sop_content_chunks for the AI Assistant, for every SOP
-- that came in already published above (future publishes done through
-- the app UI will do this automatically once the actions.ts patch from
-- PATCH_NOTES_approverDecision.md is applied).
-- =========================================================
do $$
declare
  r record;
begin
  for r in
    select s.id as sop_id, v.id as sop_version_id, s.document_number, s.title, v.content
    from sops s
    join sop_versions v on v.id = s.current_version_id
    where s.status = 'published'
  loop
    perform regenerate_sop_content_chunks(r.sop_id, r.sop_version_id, r.document_number, r.title, r.content);
  end loop;
end $$;
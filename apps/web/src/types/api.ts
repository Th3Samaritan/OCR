/**
 * Typed interfaces mirroring the Hermes FastAPI backend (apps/api/main.py).
 * Kept intentionally faithful to the server's JSON so the UI never guesses.
 */

// --------------------------------------------------------------------------- //
// Health
// --------------------------------------------------------------------------- //
export interface HealthResponse {
  ok: boolean;
  mock_ocr: boolean;
  mock_extraction: boolean;
  extraction_provider: string;
  model: string;
}

// --------------------------------------------------------------------------- //
// Doc types
// --------------------------------------------------------------------------- //
export interface DocType {
  id: string;
  label: string;
}

export interface DocTypesResponse {
  doc_types: DocType[];
}

// --------------------------------------------------------------------------- //
// Audit flow  (POST /documents  ->  GET /documents/{job_id})
// --------------------------------------------------------------------------- //
export type JobStatus = "queued" | "processing" | "done" | "error";

export type Severity = "info" | "warning" | "error";

export interface Finding {
  rule: string;
  passed: boolean;
  severity: Severity;
  message: string;
  expected: number | null;
  actual: number | null;
  citations: string[];
}

export interface AuditSummary {
  checks: number;
  flagged: number;
  passed: number;
}

export interface AuditResult {
  doc_type: string;
  doc_label: string;
  title: string;
  filename: string;
  pages: number;
  ocr_latency_ms: number;
  markdown: string;
  currency: string;
  summary: AuditSummary;
  findings: Finding[];
  report_text: string;
}

export interface CreateDocumentResponse {
  job_id: string;
  status: JobStatus;
  doc_type: string;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  filename: string;
  result: AuditResult | null;
  error: string | null;
}

// --------------------------------------------------------------------------- //
// Verification flow
// --------------------------------------------------------------------------- //
export type VerifyStatus = "confirmed" | "altered" | "not_issued" | "unverified";

export interface Mismatch {
  field: string;
  presented: string;
  issued: string;
}

export type IntegrityRisk = "low" | "medium" | "high";
export type IntegritySeverity = "info" | "warning" | "error";

export interface IntegritySignal {
  check: string;
  severity: IntegritySeverity;
  detail: string;
}

export interface IntegrityReport {
  risk: IntegrityRisk;
  file_kind: string; // "pdf" | "image"
  software: string | null;
  signals: IntegritySignal[];
}

export interface VerifyResult {
  status: VerifyStatus;
  genuine: boolean;
  confidence: number;
  issuer_id: string;
  doc_type: string;
  key: string;
  message: string;
  reasons: string[];
  mismatches: Mismatch[];
  alerts: string[];
  /** Present only on the file-upload verify path (POST /verify). */
  integrity?: IntegrityReport;
}

/** Body for POST /verify/presented. */
export interface PresentedDocument {
  issuer_id: string;
  doc_type: string;
  key: string;
  fields: Record<string, string>;
}

// --------------------------------------------------------------------------- //
// Issuer onboarding
// --------------------------------------------------------------------------- //
export interface IssuerRecord {
  issuer_id: string;
  doc_type: string;
  key: string;
  fields: Record<string, string>;
  holder_name: string;
  issued_date: string;
  source_ref: string;
}

export interface AddRecordResponse {
  ok: boolean;
  issuer_id: string;
  doc_type: string;
  key: string;
}

export interface BulkRecordsRequest {
  doc_type: string;
  key_field: string;
  rows: Record<string, unknown>[];
}

export interface BulkRecordsResponse {
  ingested: number;
  skipped: number;
  keys: string[];
}

export interface BulkScansResponse {
  ingested: number;
  keys: string[];
}

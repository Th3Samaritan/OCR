/**
 * Typed endpoint functions for the Hermes API.
 * One function per backend route; components never build URLs themselves.
 */
import type {
  AddRecordResponse,
  BulkRecordsResponse,
  BulkScansResponse,
  CreateDocumentResponse,
  DocTypesResponse,
  HealthResponse,
  IntegrityReport,
  IssuerRecord,
  JobResponse,
  PresentedDocument,
  VerifyResult,
} from "@/types/api";
import { API_BASE_URL, request, requestJson } from "./client";

// --------------------------------------------------------------------------- //
// System
// --------------------------------------------------------------------------- //
export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>("/health", { signal });
}

export function getDocTypes(signal?: AbortSignal): Promise<DocTypesResponse> {
  return request<DocTypesResponse>("/doc-types", { signal });
}

// --------------------------------------------------------------------------- //
// Audit flow
// --------------------------------------------------------------------------- //
export function createDocument(
  file: File,
  docType: string,
  signal?: AbortSignal,
): Promise<CreateDocumentResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("doc_type", docType);
  return request<CreateDocumentResponse>("/documents", {
    method: "POST",
    body: form,
    signal,
  });
}

export function getJob(jobId: string, signal?: AbortSignal): Promise<JobResponse> {
  return request<JobResponse>(`/documents/${encodeURIComponent(jobId)}`, { signal });
}

/** Direct download URL for the audit's extracted tables as an .xlsx file. */
export function documentExportUrl(jobId: string): string {
  return `${API_BASE_URL}/documents/${encodeURIComponent(jobId)}/export.xlsx`;
}

// --------------------------------------------------------------------------- //
// Document integrity (standalone tamper check)
// --------------------------------------------------------------------------- //
export function checkIntegrity(file: File, signal?: AbortSignal): Promise<IntegrityReport> {
  const form = new FormData();
  form.append("file", file);
  return request<IntegrityReport>("/integrity", { method: "POST", body: form, signal });
}

// --------------------------------------------------------------------------- //
// Verification flow
// --------------------------------------------------------------------------- //
export function verifyFile(
  file: File,
  issuerId: string,
  docType: string,
  signal?: AbortSignal,
): Promise<VerifyResult> {
  const form = new FormData();
  form.append("file", file);
  if (issuerId) form.append("issuer_id", issuerId);
  if (docType) form.append("doc_type", docType);
  return request<VerifyResult>("/verify", { method: "POST", body: form, signal });
}

export function verifyPresented(
  doc: PresentedDocument,
  signal?: AbortSignal,
): Promise<VerifyResult> {
  return requestJson<VerifyResult>("/verify/presented", "POST", doc, signal);
}

// --------------------------------------------------------------------------- //
// Issuer onboarding
// --------------------------------------------------------------------------- //
export function addIssuerRecord(
  record: IssuerRecord,
  signal?: AbortSignal,
): Promise<AddRecordResponse> {
  return requestJson<AddRecordResponse>("/issuers/records", "POST", record, signal);
}

export function bulkRecords(
  issuerId: string,
  payload: { doc_type: string; key_field: string; rows: Record<string, unknown>[] },
  signal?: AbortSignal,
): Promise<BulkRecordsResponse> {
  return requestJson<BulkRecordsResponse>(
    `/issuers/${encodeURIComponent(issuerId)}/bulk-records`,
    "POST",
    payload,
    signal,
  );
}

export function bulkScans(
  issuerId: string,
  docType: string,
  files: File[],
  signal?: AbortSignal,
): Promise<BulkScansResponse> {
  const form = new FormData();
  form.append("doc_type", docType);
  for (const file of files) form.append("files", file);
  return request<BulkScansResponse>(
    `/issuers/${encodeURIComponent(issuerId)}/bulk-scans`,
    { method: "POST", body: form, signal },
  );
}

/**
 * Client-side activity log (localStorage-backed).
 *
 * The Hermes backend intentionally has no "list past jobs" endpoint, so the
 * Dashboard derives its stats and recent-activity feed from actions taken in
 * this browser. This is clearly framed as "this workspace" activity in the UI.
 */
import type { Severity, VerifyStatus } from "@/types/api";

const STORAGE_KEY = "hermes-activity-v1";
const MAX_EVENTS = 100;

export type ActivityKind = "audit" | "verify" | "onboard";

interface BaseEvent {
  id: string;
  ts: number;
  kind: ActivityKind;
  title: string;
}

export interface AuditEvent extends BaseEvent {
  kind: "audit";
  docType: string;
  checks: number;
  flagged: number;
  topSeverity: Severity | null;
}

export interface VerifyEvent extends BaseEvent {
  kind: "verify";
  status: VerifyStatus;
  issuerId: string;
  docType: string;
}

export interface OnboardEvent extends BaseEvent {
  kind: "onboard";
  issuerId: string;
  docType: string;
  count: number;
}

export type ActivityEvent = AuditEvent | VerifyEvent | OnboardEvent;

/** Omit that distributes over a union so each member keeps its own fields. */
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;
export type NewActivityEvent = DistributiveOmit<ActivityEvent, "id" | "ts">;

const listeners = new Set<() => void>();

function read(): ActivityEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ActivityEvent[]) : [];
  } catch {
    return [];
  }
}

function write(events: ActivityEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    /* ignore quota errors */
  }
  for (const listener of listeners) listener();
}

export function getActivity(): ActivityEvent[] {
  return read();
}

export function logActivity(event: NewActivityEvent): void {
  const full = {
    ...event,
    id: Math.random().toString(36).slice(2, 10),
    ts: Date.now(),
  } as ActivityEvent;
  write([full, ...read()]);
}

export function clearActivity(): void {
  write([]);
}

export function subscribeActivity(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export interface ActivityStats {
  audits: number;
  flaggedFindings: number;
  verifications: number;
  confirmed: number;
  altered: number;
  notIssued: number;
  unverified: number;
  recordsOnboarded: number;
}

export function computeStats(events: ActivityEvent[]): ActivityStats {
  const stats: ActivityStats = {
    audits: 0,
    flaggedFindings: 0,
    verifications: 0,
    confirmed: 0,
    altered: 0,
    notIssued: 0,
    unverified: 0,
    recordsOnboarded: 0,
  };
  for (const e of events) {
    if (e.kind === "audit") {
      stats.audits += 1;
      stats.flaggedFindings += e.flagged;
    } else if (e.kind === "verify") {
      stats.verifications += 1;
      if (e.status === "confirmed") stats.confirmed += 1;
      else if (e.status === "altered") stats.altered += 1;
      else if (e.status === "not_issued") stats.notIssued += 1;
      else stats.unverified += 1;
    } else if (e.kind === "onboard") {
      stats.recordsOnboarded += e.count;
    }
  }
  return stats;
}

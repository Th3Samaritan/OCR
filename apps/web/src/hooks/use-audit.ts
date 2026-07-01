import * as React from "react";
import { createDocument, getJob } from "@/services/api";
import { ApiError } from "@/services/client";
import { logActivity } from "@/lib/activity";
import type { AuditResult, Finding, Severity } from "@/types/api";

export type AuditPhase =
  | "idle"
  | "uploading"
  | "queued"
  | "processing"
  | "done"
  | "error";

interface AuditState {
  phase: AuditPhase;
  jobId: string | null;
  filename: string | null;
  result: AuditResult | null;
  error: string | null;
  progress: number; // synthetic 0..100 for the UI
}

const INITIAL: AuditState = {
  phase: "idle",
  jobId: null,
  filename: null,
  result: null,
  error: null,
  progress: 0,
};

const POLL_MS = 1500;
const POLL_TIMEOUT_MS = 120000;

function severityRank(severity: Severity): number {
  return severity === "error" ? 3 : severity === "warning" ? 2 : 1;
}

function topSeverity(findings: Finding[]): Severity | null {
  const flagged = findings.filter((f) => !f.passed);
  if (!flagged.length) return null;
  return flagged.reduce<Severity>(
    (worst, f) => (severityRank(f.severity) > severityRank(worst) ? f.severity : worst),
    "info",
  );
}

export function useAudit() {
  const [state, setState] = React.useState<AuditState>(INITIAL);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const controllerRef = React.useRef<AbortController | null>(null);
  const startedRef = React.useRef<number>(0);
  const loggedRef = React.useRef<string | null>(null); // job ids already logged to activity

  const stopPolling = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const reset = React.useCallback(() => {
    stopPolling();
    setState(INITIAL);
  }, [stopPolling]);

  React.useEffect(() => stopPolling, [stopPolling]);

  /** Poll an existing job id until it completes, errors, or times out. */
  const beginPolling = React.useCallback(
    (jobId: string, filename: string | null) => {
      stopPolling();
      const controller = new AbortController();
      controllerRef.current = controller;
      startedRef.current = Date.now();
      let inFlight = false; // guard against overlapping requests if the backend is slow

      const poll = async () => {
        if (inFlight) return;
        if (Date.now() - startedRef.current > POLL_TIMEOUT_MS) {
          stopPolling();
          setState((s) => ({
            ...s,
            phase: "error",
            error: "The audit is taking longer than expected. Please try again.",
          }));
          return;
        }
        inFlight = true;
        try {
          const job = await getJob(jobId, controller.signal);
          if (job.status === "done" && job.result) {
            stopPolling();
            const result = job.result;
            if (loggedRef.current !== jobId) {
              loggedRef.current = jobId;
              logActivity({
                kind: "audit",
                title: result.title || result.filename || filename || "Audit",
                docType: result.doc_type,
                checks: result.summary.checks,
                flagged: result.summary.flagged,
                topSeverity: topSeverity(result.findings),
              });
            }
            setState((s) => ({
              ...s,
              phase: "done",
              result,
              filename: s.filename ?? result.filename,
              progress: 100,
            }));
          } else if (job.status === "error") {
            stopPolling();
            setState((s) => ({
              ...s,
              phase: "error",
              error: job.error || "The audit failed while processing this document.",
            }));
          } else {
            setState((s) => ({
              ...s,
              phase: job.status === "processing" ? "processing" : "queued",
              filename: s.filename ?? job.filename,
              progress: Math.min(90, s.progress + 6),
            }));
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          if (error instanceof ApiError && error.status === 404) {
            stopPolling();
            setState((s) => ({
              ...s,
              phase: "error",
              error: "That audit could not be found — it may have expired.",
            }));
            return;
          }
          // transient network blip — keep polling; the timeout guard will stop us
        } finally {
          inFlight = false;
        }
      };

      poll(); // check immediately so resumed/finished jobs render without a delay
      timerRef.current = setInterval(poll, POLL_MS);
    },
    [stopPolling],
  );

  const submit = React.useCallback(
    async (file: File, docType: string) => {
      stopPolling();
      loggedRef.current = null;
      setState({ ...INITIAL, phase: "uploading", filename: file.name, progress: 12 });

      const controller = new AbortController();
      controllerRef.current = controller;

      let jobId: string;
      try {
        const created = await createDocument(file, docType, controller.signal);
        jobId = created.job_id;
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof ApiError
            ? error.message
            : "Upload failed. Please check the file and try again.";
        setState((s) => ({ ...s, phase: "error", error: message, progress: 0 }));
        return;
      }

      setState((s) => ({ ...s, phase: "queued", jobId, progress: 30 }));
      beginPolling(jobId, file.name);
    },
    [stopPolling, beginPolling],
  );

  /** Resume/load an existing job by id (e.g. from a shared /audit/:jobId link). */
  const resume = React.useCallback(
    (jobId: string) => {
      stopPolling();
      loggedRef.current = jobId; // don't re-log activity for shared/reloaded results
      setState({ ...INITIAL, phase: "processing", jobId, progress: 20 });
      beginPolling(jobId, null);
    },
    [stopPolling, beginPolling],
  );

  return { ...state, submit, resume, reset };
}

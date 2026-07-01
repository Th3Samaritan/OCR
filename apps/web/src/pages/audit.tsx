import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Layers,
  Loader2,
  RotateCcw,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { DocTypeSelect } from "@/components/shared/doc-type-select";
import { FindingCard } from "@/components/shared/finding-card";
import { ReportView } from "@/components/shared/report-view";
import { MarkdownView } from "@/components/shared/markdown-view";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAudit, type AuditPhase } from "@/hooks/use-audit";
import { toast } from "@/hooks/use-toast";
import { documentExportUrl } from "@/services/api";
import { cn, formatLatency, humanize } from "@/lib/utils";
import type { AuditResult, Finding } from "@/types/api";

const PHASE_LABEL: Record<AuditPhase, string> = {
  idle: "Ready",
  uploading: "Uploading document…",
  queued: "Queued for processing…",
  processing: "Running OCR, extraction & audit…",
  done: "Audit complete",
  error: "Audit failed",
};

type FindingFilter = "all" | "flagged" | "passed";

export default function AuditPage() {
  const audit = useAudit();
  const navigate = useNavigate();
  const { jobId: routeJobId } = useParams();
  const [file, setFile] = React.useState<File | null>(null);
  const [docType, setDocType] = React.useState("financial");
  const [filter, setFilter] = React.useState<FindingFilter>("all");
  const resumedRef = React.useRef<string | null>(null);

  const busy = audit.phase === "uploading" || audit.phase === "queued" || audit.phase === "processing";

  // Resume from a shared/refreshed /audit/:jobId link.
  React.useEffect(() => {
    if (routeJobId && routeJobId !== audit.jobId && resumedRef.current !== routeJobId) {
      resumedRef.current = routeJobId;
      audit.resume(routeJobId);
    }
  }, [routeJobId, audit.jobId, audit.resume]);

  // Reflect a newly-created job in the URL so results are shareable/reloadable.
  React.useEffect(() => {
    if (audit.jobId && audit.jobId !== routeJobId) {
      navigate(`/audit/${audit.jobId}`, { replace: true });
    }
  }, [audit.jobId, routeJobId, navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || busy) return;
    setFilter("all");
    audit.submit(file, docType);
  };

  const onReset = () => {
    setFile(null);
    resumedRef.current = null;
    audit.reset();
    navigate("/audit");
  };

  // Surface completion as a toast.
  const prevPhase = React.useRef<AuditPhase>("idle");
  React.useEffect(() => {
    if (prevPhase.current !== "done" && audit.phase === "done" && audit.result) {
      const { flagged, checks } = audit.result.summary;
      toast({
        variant: flagged > 0 ? "warning" : "success",
        title: flagged > 0 ? `${flagged} of ${checks} checks flagged` : "All checks passed",
        description: audit.result.title || audit.result.filename,
      });
    }
    if (prevPhase.current !== "error" && audit.phase === "error" && audit.error) {
      toast({ variant: "destructive", title: "Audit failed", description: audit.error });
    }
    prevPhase.current = audit.phase;
  }, [audit.phase, audit.result, audit.error]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Audit tier"
        title="Document Audit"
        icon={<ScanSearch className="size-6" />}
        description="Upload a document to run OCR, typed extraction, and a deterministic rule-pack audit. Every finding is arithmetic, with citations back to the source."
      />

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Upload panel */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" />
                Upload document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="audit-doc-type">Document type</Label>
                  <DocTypeSelect
                    id="audit-doc-type"
                    value={docType}
                    onChange={setDocType}
                    disabled={busy}
                  />
                  <p className="text-xs text-muted-foreground">
                    Selects which domain rule pack runs against the document.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audit-file">Document file</Label>
                  <FileDropzone
                    id="audit-file"
                    files={file ? [file] : []}
                    onFilesSelected={(files) => setFile(files[0] ?? null)}
                    onRemove={() => setFile(null)}
                    disabled={busy}
                    hint="PDF or image · up to ~20 MB"
                  />
                </div>

                {busy ? (
                  <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      {PHASE_LABEL[audit.phase]}
                    </div>
                    <Progress value={audit.progress} />
                    <p className="text-xs text-muted-foreground">
                      This runs OCR, extraction, and the audit engine. It usually takes a few
                      seconds.
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={!file}>
                      <ScanSearch className="size-4" />
                      Run audit
                    </Button>
                    {(audit.phase === "done" || audit.phase === "error") && (
                      <Button type="button" variant="outline" onClick={onReset} aria-label="Reset">
                        <RotateCcw className="size-4" />
                      </Button>
                    )}
                  </div>
                )}

                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  In mock mode the backend returns a representative sample, so you can explore the
                  full flow without a GPU or API key.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="min-w-0">
          {audit.phase === "idle" && (
            <EmptyState
              icon={<ScanSearch />}
              title="No audit yet"
              description="Choose a document type, add a file, and run an audit. Findings and the full report will appear here."
            />
          )}

          {busy && <ProcessingState phase={audit.phase} filename={audit.filename} />}

          {audit.phase === "error" && (
            <ErrorState
              title="Audit failed"
              message={audit.error ?? "Something went wrong while processing this document."}
              onRetry={file ? () => audit.submit(file, docType) : undefined}
            />
          )}

          {audit.phase === "done" && audit.result && (
            <AuditResults
              result={audit.result}
              jobId={audit.jobId}
              filter={filter}
              onFilterChange={setFilter}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProcessingState({ phase, filename }: { phase: AuditPhase; filename: string | null }) {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-background text-primary shadow-subtle">
            <Loader2 className="size-6 animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{PHASE_LABEL[phase]}</p>
            <p className="text-sm text-muted-foreground">{filename ?? "Your document"}</p>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={cn("grid size-10 place-items-center rounded-lg [&_svg]:size-5", accent)}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function AuditResults({
  result,
  jobId,
  filter,
  onFilterChange,
}: {
  result: AuditResult;
  jobId: string | null;
  filter: FindingFilter;
  onFilterChange: (f: FindingFilter) => void;
}) {
  const shareUrl = jobId ? `${window.location.origin}/audit/${jobId}` : "";
  const flagged = result.findings.filter((f) => !f.passed);
  const passed = result.findings.filter((f) => f.passed);

  const visible: Finding[] =
    filter === "flagged" ? flagged : filter === "passed" ? passed : [...flagged, ...passed];

  const filters: { key: FindingFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: result.findings.length },
    { key: "flagged", label: "Flagged", count: flagged.length },
    { key: "passed", label: "Passed", count: passed.length },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Result header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-bold tracking-tight text-foreground">
              {result.title || result.filename}
            </h2>
            <Badge variant="secondary">{result.doc_label || humanize(result.doc_type)}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3.5" />
              {result.filename}
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers className="size-3.5" />
              {result.pages} page{result.pages === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              OCR {formatLatency(result.ocr_latency_ms)}
            </span>
          </div>
        </div>

        {jobId && (
          <div className="flex shrink-0 items-center gap-2">
            <CopyButton
              value={shareUrl}
              label="Share"
              variant="outline"
              className="text-foreground"
            />
            <Button asChild variant="outline" size="sm">
              <a href={documentExportUrl(jobId)} download>
                <Download className="size-4" />
                Excel
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryStat
          label="Checks run"
          value={result.summary.checks}
          icon={<Layers />}
          accent="bg-primary/10 text-primary"
        />
        <SummaryStat
          label="Passed"
          value={result.summary.passed}
          icon={<CheckCircle2 />}
          accent="bg-success/12 text-success"
        />
        <SummaryStat
          label="Flagged"
          value={result.summary.flagged}
          icon={<AlertTriangle />}
          accent={
            result.summary.flagged > 0
              ? "bg-destructive/12 text-destructive"
              : "bg-muted text-muted-foreground"
          }
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="findings" className="w-full">
        <TabsList>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="extracted">Extracted</TabsTrigger>
        </TabsList>

        <TabsContent value="findings">
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => onFilterChange(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === f.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                aria-pressed={filter === f.key}
              >
                {f.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs",
                    filter === f.key ? "bg-primary/15" : "bg-muted",
                  )}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {visible.length > 0 ? (
            <div className="space-y-3">
              {visible.map((finding, i) => (
                <FindingCard key={`${finding.rule}-${i}`} finding={finding} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={filter === "flagged" ? <CheckCircle2 /> : <Layers />}
              title={filter === "flagged" ? "No flagged findings" : "Nothing to show"}
              description={
                filter === "flagged"
                  ? "Every check passed for this document."
                  : "No findings match this filter."
              }
            />
          )}
        </TabsContent>

        <TabsContent value="report">
          <ReportView text={result.report_text} />
        </TabsContent>

        <TabsContent value="extracted">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">OCR &amp; extraction</h3>
                <p className="text-sm text-muted-foreground">
                  The markdown parsed from the document{result.currency ? ` · currency ${result.currency}` : ""}.
                </p>
              </div>
            </div>
            {result.markdown ? (
              <MarkdownView markdown={result.markdown} />
            ) : (
              <p className="text-sm text-muted-foreground">No extracted text available.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

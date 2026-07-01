import { AlertOctagon, ArrowRight, Building2, FileType2, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IntegrityPanel } from "@/components/shared/integrity-panel";
import { VERIFY_STATUS_META } from "@/lib/status";
import { cn, humanize } from "@/lib/utils";
import type { VerifyResult } from "@/types/api";

interface VerifyVerdictProps {
  result: VerifyResult;
}

function ConfidenceMeter({ value, accent }: { value: number; accent: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="w-full max-w-[200px]">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">Confidence</span>
        <span className="font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-700", accent)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function VerifyVerdict({ result }: VerifyVerdictProps) {
  const meta = VERIFY_STATUS_META[result.status];
  const Icon = meta.icon;
  const confidenceBar =
    result.status === "confirmed"
      ? "bg-success"
      : result.status === "unverified"
        ? "bg-warning"
        : "bg-destructive";

  return (
    <div className="space-y-5">
      {/* Verdict hero */}
      <Card className={cn("overflow-hidden border p-6", meta.panel)}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "grid size-14 shrink-0 place-items-center rounded-xl bg-background shadow-subtle",
                meta.accent,
              )}
            >
              <Icon className="size-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">{meta.label}</h2>
                <Badge variant={meta.badge}>{meta.short}</Badge>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                {result.message || meta.description}
              </p>
            </div>
          </div>
          <ConfidenceMeter value={result.confidence} accent={confidenceBar} />
        </div>
      </Card>

      {/* Document identity */}
      <div className="grid gap-3 sm:grid-cols-3">
        <IdentityCell icon={<Building2 className="size-4" />} label="Issuer" value={result.issuer_id || "—"} />
        <IdentityCell
          icon={<FileType2 className="size-4" />}
          label="Document type"
          value={result.doc_type ? humanize(result.doc_type) : "—"}
        />
        <IdentityCell
          icon={<KeyRound className="size-4" />}
          label="Record key"
          value={result.key || "—"}
          mono
        />
      </div>

      {/* Fraud alerts */}
      {result.alerts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <AlertOctagon className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="space-y-1.5">
              <h3 className="font-semibold text-foreground">Fraud signals detected</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {result.alerts.map((alert, i) => (
                  <li key={i}>{alert}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Mismatches */}
      {result.mismatches.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-semibold text-foreground">
              Field mismatches
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {result.mismatches.length} field{result.mismatches.length === 1 ? "" : "s"} differ
              </span>
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Presented</TableHead>
                <TableHead />
                <TableHead>Issued (source of truth)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.mismatches.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{humanize(m.field)}</TableCell>
                  <TableCell>
                    <span className="rounded-md bg-destructive/10 px-2 py-1 font-mono text-[13px] text-destructive">
                      {m.presented || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="w-8 text-muted-foreground">
                    <ArrowRight className="size-4" />
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-success/10 px-2 py-1 font-mono text-[13px] text-success">
                      {m.issued || "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Reasons */}
      {result.reasons.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 font-semibold text-foreground">Why this verdict</h3>
          <ul className="space-y-2">
            {result.reasons.map((reason, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", meta.accent, "bg-current")} />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Integrity (file uploads only) */}
      {result.integrity && <IntegrityPanel report={result.integrity} />}
    </div>
  );
}

function IdentityCell({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="text-primary [&_svg]:size-3.5">{icon}</span>
        {label}
      </div>
      <p className={cn("truncate text-sm font-semibold text-foreground", mono && "font-mono")}>
        {value}
      </p>
    </Card>
  );
}

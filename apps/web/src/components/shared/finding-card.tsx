import { CheckCircle2, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PASS_META, SEVERITY_META } from "@/lib/status";
import { cn, humanize } from "@/lib/utils";
import type { Finding } from "@/types/api";

interface FindingCardProps {
  finding: Finding;
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function FindingCard({ finding }: FindingCardProps) {
  const passed = finding.passed;
  const meta = passed ? PASS_META : SEVERITY_META[finding.severity];
  const Icon = meta.icon;
  const hasNumbers = finding.expected !== null || finding.actual !== null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 transition-colors sm:p-5",
        passed ? "border-border" : "border-l-[3px]",
        !passed && finding.severity === "error" && "border-l-destructive",
        !passed && finding.severity === "warning" && "border-l-warning",
        !passed && finding.severity === "info" && "border-l-primary",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 shrink-0", meta.accent)}>
          {passed ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-foreground">{humanize(finding.rule)}</h4>
            <Badge variant={meta.badge}>{passed ? "Passed" : meta.label}</Badge>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">{finding.message}</p>

          {hasNumbers && (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {finding.expected !== null && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
                  <span className="text-muted-foreground">Expected</span>
                  <span className="font-mono text-foreground">{formatNumber(finding.expected)}</span>
                </span>
              )}
              {finding.actual !== null && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                    passed ? "bg-muted" : "bg-destructive/10",
                  )}
                >
                  <span className="text-muted-foreground">Actual</span>
                  <span
                    className={cn(
                      "font-mono",
                      passed ? "text-foreground" : "text-destructive",
                    )}
                  >
                    {formatNumber(finding.actual)}
                  </span>
                </span>
              )}
            </div>
          )}

          {finding.citations.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted-foreground">
              <Quote className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">Citations:</span>
              {finding.citations.map((cite, i) => (
                <span
                  key={i}
                  className="max-w-full break-all rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80"
                >
                  {cite}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

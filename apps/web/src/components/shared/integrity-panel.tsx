import { FileSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SEVERITY_META, RISK_META } from "@/lib/status";
import { cn, humanize } from "@/lib/utils";
import type { IntegrityReport } from "@/types/api";

export function IntegrityPanel({ report }: { report: IntegrityReport }) {
  const risk = RISK_META[report.risk];
  const RiskIcon = risk.icon;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-accent text-primary">
            <FileSearch className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">File integrity</h3>
            <p className="text-xs text-muted-foreground">
              Provenance metadata analysis · {humanize(report.file_kind)}
            </p>
          </div>
        </div>
        <Badge variant={risk.badge} className="gap-1.5 self-start px-3 py-1 sm:self-auto">
          <RiskIcon className="size-3.5" />
          {risk.label}
        </Badge>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">{risk.description}</p>

        {report.software && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Creating software:</span>
            <span className="rounded-md bg-muted px-2 py-1 font-mono text-[13px] text-foreground">
              {report.software}
            </span>
          </div>
        )}

        {report.signals.length > 0 ? (
          <ul className="space-y-2.5">
            {report.signals.map((signal, i) => {
              const meta = SEVERITY_META[signal.severity];
              const Icon = meta.icon;
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <Icon className={cn("mt-0.5 size-4 shrink-0", meta.accent)} />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {humanize(signal.check)}
                      </span>
                      <Badge variant={meta.badge} className="px-1.5 py-0 text-[10px]">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{signal.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No integrity signals reported.</p>
        )}

        <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          Integrity checks flag likely tampering but never replace matching the issuer's record. A
          flawless fake with scrubbed metadata is only caught by verification.
        </p>
      </div>
    </Card>
  );
}

import { CopyButton } from "@/components/shared/copy-button";
import { cn } from "@/lib/utils";

interface ReportViewProps {
  text: string;
  className?: string;
}

/** Renders the deterministic audit report_text as a terminal-style document. */
export function ReportView({ text, className }: ReportViewProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-slate-950", className)}>
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-500/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-emerald-500/80" />
          <span className="ml-3 text-xs font-medium text-slate-400">verification-report.txt</span>
        </div>
        <CopyButton
          value={text}
          className="h-7 text-slate-400 hover:bg-white/5 hover:text-slate-100"
        />
      </div>
      <pre className="max-h-[28rem] overflow-auto p-4 text-[12.5px] leading-relaxed text-slate-200">
        <code className="font-mono">{text}</code>
      </pre>
    </div>
  );
}

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHealth } from "@/hooks/use-health";
import { cn } from "@/lib/utils";

const LABEL = {
  loading: "Connecting…",
  online: "API online",
  offline: "API offline",
};

const DOT = {
  loading: "bg-warning",
  online: "bg-success",
  offline: "bg-destructive",
};

export function BackendStatus({ className }: { className?: string }) {
  const { status, health } = useHealth();

  const detail =
    status === "online" && health
      ? `Model: ${health.model} · Extraction: ${health.extraction_provider}${
          health.mock_ocr ? " · mock OCR" : ""
        }${health.mock_extraction ? " · mock extraction" : ""}`
      : status === "offline"
        ? "Can't reach the Hermes backend. Check that it's running."
        : "Checking backend health…";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground",
            className,
          )}
        >
          <span className="relative flex size-2">
            {status === "online" && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
            )}
            <span className={cn("relative inline-flex size-2 rounded-full", DOT[status])} />
          </span>
          <span>{LABEL[status]}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">{detail}</TooltipContent>
    </Tooltip>
  );
}

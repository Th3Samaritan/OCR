import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToast, type ToastVariant } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastVariant, typeof Info> = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
};

const ACCENT: Record<ToastVariant, string> = {
  default: "text-foreground",
  info: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="pointer-events-none fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 sm:bottom-2 sm:right-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const variant = t.variant ?? "default";
        const Icon = ICONS[variant];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex animate-fade-in items-start gap-3 rounded-lg border bg-card p-4 shadow-elevated"
          >
            <Icon className={cn("mt-0.5 size-5 shrink-0", ACCENT[variant])} />
            <div className="flex-1 space-y-0.5">
              {t.title && <p className="text-sm font-semibold leading-tight">{t.title}</p>}
              {t.description && (
                <p className="text-sm leading-snug text-muted-foreground">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded-sm text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

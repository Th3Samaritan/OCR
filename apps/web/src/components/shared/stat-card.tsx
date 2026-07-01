import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "destructive";
  className?: string;
}

const ACCENTS = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/12 text-destructive",
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  accent = "primary",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("card-hover p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg [&_svg]:size-5",
            ACCENTS[accent],
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

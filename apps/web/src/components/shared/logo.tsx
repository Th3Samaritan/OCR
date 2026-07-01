import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { box: "size-8", icon: "size-4", text: "text-base" },
  md: { box: "size-9", icon: "size-5", text: "text-lg" },
  lg: { box: "size-11", icon: "size-6", text: "text-xl" },
};

export function Logo({ className, showWordmark = true, size = "md" }: LogoProps) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "grid place-items-center rounded-xl bg-gradient-to-br from-primary to-indigo-700 text-primary-foreground shadow-glow",
          s.box,
        )}
        aria-hidden="true"
      >
        <ShieldCheck className={s.icon} />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-bold tracking-tight text-foreground", s.text)}>Hermes</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Doc Intelligence
          </span>
        </div>
      )}
    </div>
  );
}

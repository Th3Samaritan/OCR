/**
 * Presentation metadata for backend enums: verify statuses, finding severities,
 * and integrity risk. Centralized so colours/labels/copy stay consistent.
 */
import {
  AlertTriangle,
  BadgeCheck,
  FileWarning,
  Info,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { BadgeProps } from "@/components/ui/badge";
import type { IntegrityRisk, Severity, VerifyStatus } from "@/types/api";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export interface VerifyStatusMeta {
  label: string;
  short: string;
  description: string;
  badge: BadgeVariant;
  icon: LucideIcon;
  /** Tailwind text colour token for accents. */
  accent: string;
  /** Soft background for hero verdict panels. */
  panel: string;
  ring: string;
}

export const VERIFY_STATUS_META: Record<VerifyStatus, VerifyStatusMeta> = {
  confirmed: {
    label: "Confirmed authentic",
    short: "Confirmed",
    description: "The document matches the issuer's record of truth.",
    badge: "success",
    icon: ShieldCheck,
    accent: "text-success",
    panel: "bg-success/8 border-success/25",
    ring: "ring-success/30",
  },
  altered: {
    label: "Altered document",
    short: "Altered",
    description: "The key exists, but one or more fields differ from what was issued.",
    badge: "destructive",
    icon: ShieldAlert,
    accent: "text-destructive",
    panel: "bg-destructive/8 border-destructive/25",
    ring: "ring-destructive/30",
  },
  not_issued: {
    label: "Not issued",
    short: "Not issued",
    description: "No record with this key was ever issued by the issuer — likely fake.",
    badge: "destructive",
    icon: ShieldX,
    accent: "text-destructive",
    panel: "bg-destructive/8 border-destructive/25",
    ring: "ring-destructive/30",
  },
  unverified: {
    label: "Unverified",
    short: "Unverified",
    description: "The issuer isn't onboarded, so authenticity can't be confirmed.",
    badge: "warning",
    icon: FileWarning,
    accent: "text-warning",
    panel: "bg-warning/10 border-warning/30",
    ring: "ring-warning/30",
  },
};

export interface SeverityMeta {
  label: string;
  badge: BadgeVariant;
  icon: LucideIcon;
  accent: string;
}

export const SEVERITY_META: Record<Severity, SeverityMeta> = {
  error: { label: "Error", badge: "destructive", icon: XCircle, accent: "text-destructive" },
  warning: { label: "Warning", badge: "warning", icon: AlertTriangle, accent: "text-warning" },
  info: { label: "Info", badge: "info", icon: Info, accent: "text-primary" },
};

export const PASS_META = {
  label: "Passed",
  badge: "success" as BadgeVariant,
  icon: BadgeCheck,
  accent: "text-success",
};

export interface RiskMeta {
  label: string;
  badge: BadgeVariant;
  icon: LucideIcon;
  accent: string;
  description: string;
}

export const RISK_META: Record<IntegrityRisk, RiskMeta> = {
  low: {
    label: "Low risk",
    badge: "success",
    icon: ShieldCheck,
    accent: "text-success",
    description: "No tamper signals in the file's provenance metadata.",
  },
  medium: {
    label: "Medium risk",
    badge: "warning",
    icon: ShieldAlert,
    accent: "text-warning",
    description: "Some signals warrant a manual look.",
  },
  high: {
    label: "High risk",
    badge: "destructive",
    icon: ShieldX,
    accent: "text-destructive",
    description: "Strong tamper/design-tool signals detected in metadata.",
  },
};

export const INTEGRITY_SIGNAL_BADGE: Record<string, BadgeVariant> = {
  info: "secondary",
  warning: "warning",
  error: "destructive",
};

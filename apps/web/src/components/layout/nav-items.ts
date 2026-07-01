import {
  Building2,
  LayoutDashboard,
  ScanSearch,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Overview & activity",
  },
  {
    to: "/audit",
    label: "Document Audit",
    icon: ScanSearch,
    description: "OCR, extract & audit",
  },
  {
    to: "/verify",
    label: "Verification",
    icon: ShieldCheck,
    description: "Confirm authenticity",
  },
  {
    to: "/onboarding",
    label: "Issuer Onboarding",
    icon: Building2,
    description: "Build the source of truth",
  },
];

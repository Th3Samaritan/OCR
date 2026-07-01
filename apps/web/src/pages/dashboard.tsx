import * as React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  LayoutDashboard,
  ScanSearch,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useActivity } from "@/hooks/use-activity";
import { useHealth } from "@/hooks/use-health";
import { clearActivity, type ActivityEvent } from "@/lib/activity";
import { VERIFY_STATUS_META, SEVERITY_META } from "@/lib/status";
import { cn, humanize, timeAgo } from "@/lib/utils";
import type { VerifyStatus } from "@/types/api";

const QUICK_ACTIONS = [
  {
    to: "/audit",
    icon: ScanSearch,
    title: "Audit a document",
    body: "OCR, extract & run a deterministic audit.",
  },
  {
    to: "/verify",
    icon: ShieldCheck,
    title: "Verify authenticity",
    body: "Match a document to the issuer's record.",
  },
  {
    to: "/onboarding",
    icon: Building2,
    title: "Onboard records",
    body: "Build the issuer source of truth.",
  },
];

export default function DashboardPage() {
  const { events, stats } = useActivity();
  const { health, status } = useHealth();

  const verifyBreakdown: { key: VerifyStatus; count: number }[] = [
    { key: "confirmed", count: stats.confirmed },
    { key: "altered", count: stats.altered },
    { key: "not_issued", count: stats.notIssued },
    { key: "unverified", count: stats.unverified },
  ];
  const verifyTotal = stats.verifications;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        icon={<LayoutDashboard className="size-6" />}
        description="A snapshot of the audits, verifications, and records processed in this workspace."
        actions={
          events.length > 0 ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="size-4" />
                  Clear activity
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear workspace activity?</DialogTitle>
                  <DialogDescription>
                    This removes the locally stored activity log and resets the stats below. It does
                    not affect any records on the backend.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="destructive" onClick={() => clearActivity()}>
                      Clear activity
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Documents audited"
          value={stats.audits}
          icon={<ScanSearch />}
          accent="primary"
          hint={`${stats.flaggedFindings} findings flagged`}
        />
        <StatCard
          label="Verifications run"
          value={stats.verifications}
          icon={<ShieldCheck />}
          accent="success"
          hint={`${stats.confirmed} confirmed authentic`}
        />
        <StatCard
          label="Records onboarded"
          value={stats.recordsOnboarded}
          icon={<Database />}
          accent="primary"
          hint="Across this workspace"
        />
        <StatCard
          label="Flagged / altered"
          value={stats.flaggedFindings + stats.altered + stats.notIssued}
          icon={<TriangleAlert />}
          accent={stats.altered + stats.notIssued > 0 ? "destructive" : "warning"}
          hint={`${stats.altered + stats.notIssued} suspicious verdicts`}
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="card-hover h-full p-5">
              <div className="flex items-start justify-between">
                <div className="grid size-10 place-items-center rounded-lg bg-accent text-primary">
                  <action.icon className="size-5" />
                </div>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h3 className="mt-3 font-semibold text-foreground">{action.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{action.body}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Recent activity */}
        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-primary" />
              Recent activity
            </CardTitle>
            {events.length > 0 && (
              <Badge variant="secondary">{events.length} event{events.length === 1 ? "" : "s"}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {events.length > 0 ? (
              <ol className="relative space-y-1">
                {events.slice(0, 12).map((event) => (
                  <ActivityRow key={event.id} event={event} />
                ))}
              </ol>
            ) : (
              <EmptyState
                icon={<Activity />}
                title="No activity yet"
                description="Run an audit or verification and it'll show up here."
                action={
                  <Button asChild size="sm">
                    <Link to="/audit">
                      Run your first audit
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Side column */}
        <div className="space-y-6">
          {/* Verification breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verification outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              {verifyTotal > 0 ? (
                <div className="space-y-4">
                  {verifyBreakdown.map(({ key, count }) => {
                    const meta = VERIFY_STATUS_META[key];
                    const pct = verifyTotal ? Math.round((count / verifyTotal) * 100) : 0;
                    return (
                      <div key={key}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <meta.icon className={cn("size-4", meta.accent)} />
                            {meta.short}
                          </span>
                          <span className="text-muted-foreground">
                            {count} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              key === "confirmed" && "bg-success",
                              key === "unverified" && "bg-warning",
                              (key === "altered" || key === "not_issued") && "bg-destructive",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No verifications yet. Outcomes will chart here.
                </p>
              )}
            </CardContent>
          </Card>

          {/* System status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StatusRow
                label="Backend API"
                value={status === "online" ? "Online" : status === "offline" ? "Offline" : "Checking…"}
                ok={status === "online"}
                bad={status === "offline"}
              />
              {health && (
                <>
                  <StatusRow label="Model" value={health.model} muted />
                  <StatusRow label="Extraction" value={humanize(health.extraction_provider)} muted />
                  <StatusRow
                    label="OCR mode"
                    value={health.mock_ocr ? "Mock" : "Live"}
                    muted
                  />
                  <StatusRow
                    label="Extraction mode"
                    value={health.mock_extraction ? "Mock" : "Live"}
                    muted
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  ok,
  bad,
  muted,
}: {
  label: string;
  value: string;
  ok?: boolean;
  bad?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-medium",
          ok && "text-success",
          bad && "text-destructive",
          muted && "font-mono text-[13px] text-foreground",
          !ok && !bad && !muted && "text-foreground",
        )}
      >
        {ok && <span className="size-1.5 rounded-full bg-success" />}
        {bad && <span className="size-1.5 rounded-full bg-destructive" />}
        {value}
      </span>
    </div>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const config = activityConfig(event);
  return (
    <li className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50">
      <div className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-4", config.chip)}>
        {config.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(event.ts)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{config.label}</span>
          {config.badge}
        </div>
      </div>
    </li>
  );
}

function activityConfig(event: ActivityEvent): {
  icon: React.ReactNode;
  chip: string;
  label: string;
  badge: React.ReactNode;
} {
  if (event.kind === "audit") {
    const flagged = event.flagged > 0;
    const sev = event.topSeverity ? SEVERITY_META[event.topSeverity] : null;
    return {
      icon: <ScanSearch />,
      chip: "bg-primary/10 text-primary",
      label: `Audit · ${humanize(event.docType)} · ${event.checks} checks`,
      badge: flagged ? (
        <Badge variant={sev?.badge ?? "warning"}>
          {event.flagged} flagged
        </Badge>
      ) : (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="size-3" />
          Clean
        </Badge>
      ),
    };
  }
  if (event.kind === "verify") {
    const meta = VERIFY_STATUS_META[event.status];
    return {
      icon: <ShieldCheck />,
      chip: cn(
        event.status === "confirmed" && "bg-success/12 text-success",
        event.status === "unverified" && "bg-warning/15 text-warning",
        (event.status === "altered" || event.status === "not_issued") &&
          "bg-destructive/12 text-destructive",
      ),
      label: `Verify · ${event.issuerId || "unknown issuer"}`,
      badge: <Badge variant={meta.badge}>{meta.short}</Badge>,
    };
  }
  return {
    icon: <Database />,
    chip: "bg-primary/10 text-primary",
    label: `Onboard · ${event.issuerId} · ${humanize(event.docType)}`,
    badge: (
      <Badge variant="secondary">
        {event.count} record{event.count === 1 ? "" : "s"}
      </Badge>
    ),
  };
}

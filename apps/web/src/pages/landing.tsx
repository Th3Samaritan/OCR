import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Cpu,
  FileSearch,
  Fingerprint,
  Gauge,
  Landmark,
  Lock,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const PIPELINE = [
  {
    icon: ScanSearch,
    title: "OCR",
    body: "Unlimited-OCR parses messy, multi-page PDFs and scans into clean, grounded markdown.",
  },
  {
    icon: Cpu,
    title: "Extract",
    body: "A typed schema turns the document into structured fields — with page-level citations.",
  },
  {
    icon: ShieldCheck,
    title: "Audit & verify",
    body: "A deterministic engine checks the arithmetic and matches it against the issuer's record.",
  },
];

const FEATURES = [
  {
    icon: Gauge,
    title: "Deterministic verdicts",
    body: "Findings come from code, not the model. The audit is pure arithmetic, so it can't hallucinate a number.",
  },
  {
    icon: Fingerprint,
    title: "Issuer-backed authenticity",
    body: "Verify a presented document against the issuer's source of truth — confirmed, altered, or never issued.",
  },
  {
    icon: FileSearch,
    title: "Tamper & provenance signals",
    body: "Provenance metadata and error-level analysis flag design-tool fakes and edited scans.",
  },
  {
    icon: Workflow,
    title: "Five domain packs",
    body: "Financial, bank, insurance, clinical, and legal — each with its own schema and rule set.",
  },
  {
    icon: Lock,
    title: "Citations on every finding",
    body: "Each result links back to the exact page and value, so reviewers can trust and trace it.",
  },
  {
    icon: Sparkles,
    title: "Runs anywhere",
    body: "Mock OCR and extraction let the whole platform run end-to-end with no GPU and no API key.",
  },
];

const DOC_TYPES = [
  { icon: Landmark, label: "Financial statements" },
  { icon: Building2, label: "Bank statements" },
  { icon: ShieldCheck, label: "Insurance claims" },
  { icon: FileSearch, label: "Clinical / coding" },
  { icon: Workflow, label: "Legal contracts" },
];

function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/audit">Audit</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/verify">Verify</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/onboarding">Onboarding</Link>
          </Button>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/audit">
              Launch app
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-mesh absolute inset-0" aria-hidden="true" />
        <div className="grid-lines absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="outline"
              className="mb-6 gap-1.5 border-primary/25 bg-background/60 px-3 py-1 text-primary backdrop-blur"
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              Deterministic document intelligence
            </Badge>

            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              Trust every document,
              <span className="block text-gradient">before you act on it.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Hermes reads messy documents with OCR, extracts typed data, and audits it with a
              deterministic engine — then verifies authenticity against the issuer's record of
              truth. The verdict is arithmetic, not a guess.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="xl" className="w-full sm:w-auto">
                <Link to="/audit">
                  <ScanSearch className="size-5" />
                  Audit a document
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="w-full bg-background/60 backdrop-blur sm:w-auto">
                <Link to="/verify">
                  <ShieldCheck className="size-5" />
                  Verify authenticity
                </Link>
              </Button>
            </div>

            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["No hallucinated verdicts", "Citations on every finding", "Runs with no GPU or key"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-success" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Pipeline preview */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid gap-4 sm:grid-cols-3">
              {PIPELINE.map((step, i) => (
                <Card
                  key={step.title}
                  className="animate-fade-in border-border/70 bg-card/70 p-6 backdrop-blur"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <step.icon className="size-5" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Two tiers */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Two distinct tiers
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Consistency is not the same as authenticity
          </h2>
          <p className="mt-3 text-muted-foreground">
            Reading a document can prove it's internally consistent. Only the issuer's record can
            prove it's genuine. Hermes does both — and keeps them separate.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="card-hover relative overflow-hidden p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <ScanSearch className="size-5" />
              </div>
              <Badge variant="info">Audit tier</Badge>
            </div>
            <h3 className="text-xl font-semibold text-foreground">Deterministic audit</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Extracts the document into a typed schema, then runs a domain rule pack. Every finding
              is arithmetic — totals that don't add up, duplicated lines, impossible dates — with the
              source citation attached.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {[
                "Passed / flagged checks with severity",
                "Expected vs actual for every number",
                "A human-readable exception report",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="link" className="mt-6 px-0">
              <Link to="/audit">
                Run an audit
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Card>

          <Card className="card-hover relative overflow-hidden p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-success/12 text-success">
                <ShieldCheck className="size-5" />
              </div>
              <Badge variant="success">Verification tier</Badge>
            </div>
            <h3 className="text-xl font-semibold text-foreground">Issuer-backed verification</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Onboard an issuer's records as the source of truth, then match presented documents by
              key. Get a clear verdict — confirmed, altered, not issued, or unverified — with the
              exact fields that differ.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {[
                "Confirmed / altered / not-issued verdicts",
                "Field-level mismatch details",
                "Cross-submission fraud signals",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="link" className="mt-6 px-0">
              <Link to="/verify">
                Verify a document
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              Built for high-trust workflows
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything a reviewer needs to act with confidence
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="card-hover p-6">
                <div className="mb-4 grid size-11 place-items-center rounded-xl bg-accent text-primary">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </Card>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {DOC_TYPES.map((dt) => (
              <span
                key={dt.label}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-subtle"
              >
                <dt.icon className="size-4 text-primary" />
                {dt.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-10 text-center sm:p-14">
          <div className="hero-mesh absolute inset-0 opacity-70" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Put your documents to the test
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start with a sample audit in seconds, or onboard an issuer and verify a presented
              document end to end.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link to="/audit">
                  Start auditing
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="bg-background/60 backdrop-blur">
                <Link to="/onboarding">Onboard an issuer</Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            Hermes · Long-horizon document intelligence
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/dashboard" className="transition-colors hover:text-foreground">
              Dashboard
            </Link>
            <Link to="/audit" className="transition-colors hover:text-foreground">
              Audit
            </Link>
            <Link to="/verify" className="transition-colors hover:text-foreground">
              Verify
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

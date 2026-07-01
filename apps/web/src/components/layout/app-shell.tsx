import * as React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { BackendStatus } from "@/components/layout/backend-status";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={cn(
                  "size-5 shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="flex flex-col">
                <span>{item.label}</span>
                <span className="text-[11px] font-normal text-muted-foreground/80">
                  {item.description}
                </span>
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link
        to="/"
        onClick={onNavigate}
        className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Logo />
      </Link>
      <NavList onNavigate={onNavigate} />
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <BackendStatus />
          <ThemeToggle className="hidden lg:inline-flex" />
        </div>
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Back to home
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();

  // Close the mobile drawer on route change.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-card lg:block">
        <SidebarInner />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </header>

      {/* Mobile drawer */}
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
          <DialogPrimitive.Content
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border bg-card shadow-elevated duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden"
            aria-label="Navigation"
          >
            <DialogPrimitive.Title className="sr-only">Navigation menu</DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="absolute right-3 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
            <SidebarInner onNavigate={() => setMobileOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Content */}
      <div className="lg:pl-72">
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

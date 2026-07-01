import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary: a render exception anywhere below shows a recovery
 * screen instead of a blank white page. Uses a full reload to clear bad state.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production this is where you'd forward to Sentry / your error tracker.
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" />
          </div>
          <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="mt-2 text-muted-foreground">
            An unexpected error interrupted the page. Reloading usually fixes it.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={this.handleReload}>Reload page</Button>
            <Button variant="outline" onClick={this.handleHome}>
              Back to home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

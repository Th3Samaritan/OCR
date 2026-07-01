/**
 * Minimal, dependency-free toast store.
 * `toast()` can be called from anywhere; `useToast()` subscribes UI to the queue.
 */
import * as React from "react";
import { shortId } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "warning" | "destructive" | "info";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

type Listener = (toasts: Toast[]) => void;

const DEFAULT_DURATION = 5000;
let toasts: Toast[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  emit();
}

export function toast(input: Omit<Toast, "id">): string {
  const id = shortId();
  const next: Toast = { id, duration: DEFAULT_DURATION, ...input };
  toasts = [next, ...toasts].slice(0, 4);
  emit();

  if (next.duration && next.duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), next.duration),
    );
  }
  return id;
}

export function useToast() {
  const [state, setState] = React.useState<Toast[]>(toasts);

  React.useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return { toasts: state, toast, dismiss: dismissToast };
}

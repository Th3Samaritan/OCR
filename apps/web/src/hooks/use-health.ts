import * as React from "react";
import { getHealth } from "@/services/api";
import type { HealthResponse } from "@/types/api";

type Status = "loading" | "online" | "offline";

interface UseHealthResult {
  status: Status;
  health: HealthResponse | null;
  refetch: () => void;
}

/** Polls GET /health so the shell can show live backend status. */
export function useHealth(pollMs = 30000): UseHealthResult {
  const [status, setStatus] = React.useState<Status>("loading");
  const [health, setHealth] = React.useState<HealthResponse | null>(null);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        const data = await getHealth(controller.signal);
        if (!active) return;
        setHealth(data);
        setStatus("online");
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!active) return;
        setStatus("offline");
      }
    }

    load();
    const interval = window.setInterval(load, pollMs);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [pollMs, tick]);

  const refetch = React.useCallback(() => setTick((t) => t + 1), []);
  return { status, health, refetch };
}

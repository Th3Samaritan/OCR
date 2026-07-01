import * as React from "react";
import { ApiError } from "@/services/client";

interface MutationState<T> {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string | null;
}

/**
 * Tiny async-action helper: tracks loading/success/error for a single
 * request-shaped function. Keeps page code declarative without a data lib.
 */
export function useMutation<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>,
) {
  const [state, setState] = React.useState<MutationState<T>>({
    status: "idle",
    data: null,
    error: null,
  });
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutate = React.useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({ status: "loading", data: null, error: null });
      try {
        const data = await fn(...args);
        if (mountedRef.current) setState({ status: "success", data, error: null });
        return data;
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.";
        if (mountedRef.current) setState({ status: "error", data: null, error: message });
        return null;
      }
    },
    [fn],
  );

  const reset = React.useCallback(
    () => setState({ status: "idle", data: null, error: null }),
    [],
  );

  return {
    ...state,
    mutate,
    reset,
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
  };
}

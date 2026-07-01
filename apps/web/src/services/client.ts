/**
 * Base HTTP client for the Hermes API.
 *
 * - Reads the base URL from VITE_API_URL (defaults to "/api", which the vite
 *   dev server proxies to the FastAPI backend).
 * - Normalizes FastAPI error bodies ({ detail: ... }) into a typed ApiError.
 * - Small, dependency-free wrapper around fetch.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** True when the failure looks like the backend is unreachable (not an HTTP error). */
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

/** True when the backend rejected the request for exceeding the rate limit. */
export function isRateLimited(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

const RATE_LIMIT_MESSAGE =
  "You're sending requests too quickly. Please wait a moment and try again.";

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }
  return response.text().catch(() => null);
}

/** Pull a human-friendly message out of a FastAPI error body. */
function extractDetail(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim()) return body;
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      // Pydantic validation errors: [{ loc, msg, type }, ...]
      const msgs = detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as any).msg) : null))
        .filter(Boolean);
      if (msgs.length) return msgs.join("; ");
    }
  }
  return fallback;
}

export interface RequestOptions {
  method?: string;
  body?: BodyInit | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: options.method ?? "GET",
      body: options.body,
      headers: options.headers,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      "Could not reach the Hermes API. Check that the backend is running and VITE_API_URL is correct.",
      0,
      error,
    );
  }

  const body = await parseBody(response);

  if (!response.ok) {
    const message =
      response.status === 429
        ? RATE_LIMIT_MESSAGE
        : extractDetail(body, `Request failed with status ${response.status}`);
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

/** JSON request helper (sets Content-Type + serializes body). */
export function requestJson<T>(
  path: string,
  method: string,
  payload: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}

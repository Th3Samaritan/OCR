import { formatBytes } from "@/lib/utils";

/** Default upload ceiling — mirrors the "up to ~20 MB" hint shown in the UI. */
export const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

/** True if `file` matches an `accept` string (".pdf,.png" or "image/*,application/pdf"). */
export function isAcceptedType(file: File, accept: string): boolean {
  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (!tokens.length) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1)); // e.g. "image/*"
    return type === token;
  });
}

/** Returns a human-readable error, or null if the file is acceptable. */
export function validateFile(
  file: File,
  opts: { accept?: string; maxBytes?: number } = {},
): string | null {
  const { accept, maxBytes = DEFAULT_MAX_BYTES } = opts;
  if (file.size === 0) return `"${file.name}" is empty.`;
  if (accept && !isAcceptedType(file, accept)) {
    return `"${file.name}" isn't a supported file type.`;
  }
  if (maxBytes && file.size > maxBytes) {
    return `"${file.name}" is ${formatBytes(file.size)} — over the ${formatBytes(maxBytes, 0)} limit.`;
  }
  return null;
}

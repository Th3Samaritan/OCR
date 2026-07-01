import * as React from "react";
import { getDocTypes } from "@/services/api";
import type { DocType } from "@/types/api";

// Sensible fallback matching apps/api/packs.py, so the selector works even if
// /doc-types can't be reached (e.g. backend momentarily down).
const FALLBACK: DocType[] = [
  { id: "financial", label: "Financial audit" },
  { id: "bank", label: "Bank statement" },
  { id: "insurance", label: "Insurance claim" },
  { id: "clinical", label: "Clinical / coding" },
  { id: "legal", label: "Legal contract" },
];

/** Loads the available audit doc-types once (with a static fallback). */
export function useDocTypes(): { docTypes: DocType[]; loading: boolean } {
  const [docTypes, setDocTypes] = React.useState<DocType[]>(FALLBACK);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    getDocTypes(controller.signal)
      .then((data) => {
        if (data.doc_types?.length) setDocTypes(data.doc_types);
      })
      .catch(() => {
        /* keep fallback */
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return { docTypes, loading };
}

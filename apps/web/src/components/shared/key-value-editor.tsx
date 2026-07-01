import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface KeyValueRow {
  id: string;
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  disabled?: boolean;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
  label?: string;
  description?: string;
}

let counter = 0;
export function makeRow(key = "", value = ""): KeyValueRow {
  counter += 1;
  return { id: `kv-${counter}-${Math.random().toString(36).slice(2, 7)}`, key, value };
}

export function KeyValueEditor({
  rows,
  onChange,
  disabled,
  keyPlaceholder = "field",
  valuePlaceholder = "value",
  addLabel = "Add field",
  label,
  description,
}: KeyValueEditorProps) {
  const update = (id: string, patch: Partial<KeyValueRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));
  const add = () => onChange([...rows, makeRow()]);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-center gap-2">
            <Input
              value={row.key}
              onChange={(e) => update(row.id, { key: e.target.value })}
              placeholder={keyPlaceholder}
              disabled={disabled}
              aria-label={`Field name ${i + 1}`}
              className="font-mono text-[13px]"
            />
            <span className="text-muted-foreground" aria-hidden="true">
              :
            </span>
            <Input
              value={row.value}
              onChange={(e) => update(row.id, { value: e.target.value })}
              placeholder={valuePlaceholder}
              disabled={disabled}
              aria-label={`Field value ${i + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => remove(row.id)}
              disabled={disabled || rows.length === 1}
              aria-label={`Remove field ${i + 1}`}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled}>
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
}

/** Collapse editor rows into a plain record, dropping empty keys. */
export function rowsToRecord(rows: KeyValueRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (key) out[key] = row.value;
  }
  return out;
}

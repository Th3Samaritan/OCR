import * as React from "react";
import { AlertCircle, FileText, ImageIcon, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";
import { DEFAULT_MAX_BYTES, validateFile } from "@/lib/file-validation";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  files: File[];
  onRemove?: (index: number) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  hint?: string;
  className?: string;
  id?: string;
  /** Max size per file, in bytes. Defaults to 20 MB. */
  maxSizeBytes?: number;
}

function fileIcon(file: File) {
  if (file.type.startsWith("image/")) return ImageIcon;
  return FileText;
}

export function FileDropzone({
  onFilesSelected,
  files,
  onRemove,
  accept = ".pdf,.png,.jpg,.jpeg,.webp,.tiff",
  multiple = false,
  disabled = false,
  hint,
  className,
  id,
  maxSizeBytes = DEFAULT_MAX_BYTES,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const dragDepth = React.useRef(0);
  const inputId = id ?? "file-dropzone";

  const handleFiles = React.useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      const arr = Array.from(list);
      const candidates = multiple ? arr : arr.slice(0, 1);

      const valid: File[] = [];
      const nextErrors: string[] = [];
      for (const file of candidates) {
        const error = validateFile(file, { accept, maxBytes: maxSizeBytes });
        if (error) nextErrors.push(error);
        else valid.push(file);
      }

      setErrors(nextErrors);
      if (valid.length) onFilesSelected(valid);
    },
    [accept, maxSizeBytes, multiple, onFilesSelected],
  );

  const openPicker = React.useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Upload files: click to browse or drag and drop"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          if (disabled) return;
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          if (disabled) return;
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "group relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          dragging
            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
            : "border-border bg-muted/30 hover:border-primary/50 hover:bg-accent/60",
          disabled && "cursor-not-allowed opacity-60",
          !disabled && "cursor-pointer",
        )}
      >
        <div
          className={cn(
            "grid size-14 place-items-center rounded-full bg-background text-primary shadow-subtle transition-transform",
            dragging && "scale-110",
          )}
        >
          <UploadCloud className="size-7" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {dragging ? "Drop to upload" : "Drag & drop, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">
            {hint ?? `PDF or image · up to ${formatBytes(maxSizeBytes, 0)}`}
          </p>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </div>

      {errors.length > 0 && (
        <ul className="mt-2 space-y-1" role="alert">
          {errors.map((error, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Selected files">
          {files.map((file, index) => {
            const Icon = fileIcon(file);
            return (
              <li
                key={`${file.name}-${index}`}
                className="flex animate-fade-in items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-primary">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                {onRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                    aria-label={`Remove ${file.name}`}
                  >
                    {multiple ? <X className="size-4" /> : <Trash2 className="size-4" />}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

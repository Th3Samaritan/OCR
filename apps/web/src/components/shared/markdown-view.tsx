import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * A tiny, dependency-free markdown renderer scoped to what the OCR service
 * emits: headings, GitHub-style tables, bullet lists, and paragraphs (with
 * inline bold). Not a general markdown engine — intentionally small and safe
 * (it never sets innerHTML; text is rendered as plain React children).
 */

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isSeparatorRow(line: string): boolean {
  return /^\s*\|?[\s:-]+\|[\s:|-]*$/.test(line) && line.includes("-");
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Heading
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2] });
      i += 1;
      continue;
    }

    // Table (needs a header row + separator row)
    if (trimmed.startsWith("|") && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const header = splitRow(trimmed);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    // List
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // Paragraph (gather consecutive non-empty, non-special lines)
    const paras: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,6}\s/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("|") &&
      !/^[-*]\s+/.test(lines[i].trim())
    ) {
      paras.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paras.join(" ") });
  }

  return blocks;
}

/** Render inline **bold** segments; everything else is plain text. */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) {
      return (
        <strong key={idx} className="font-semibold text-foreground">
          {bold[1]}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function MarkdownView({ markdown, className }: { markdown: string; className?: string }) {
  const blocks = React.useMemo(() => parseBlocks(markdown), [markdown]);

  return (
    <div className={cn("space-y-4 text-sm leading-relaxed text-foreground", className)}>
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          const size =
            block.level <= 1
              ? "text-lg font-bold"
              : block.level === 2
                ? "text-base font-semibold"
                : "text-sm font-semibold";
          return (
            <p key={idx} className={cn("tracking-tight text-foreground", size)}>
              {renderInline(block.text)}
            </p>
          );
        }
        if (block.type === "table") {
          return (
            <div key={idx} className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    {block.header.map((cell, ci) => (
                      <TableHead key={ci} className="whitespace-nowrap text-foreground">
                        {renderInline(cell)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {block.rows.map((row, ri) => (
                    <TableRow key={ri}>
                      {row.map((cell, ci) => (
                        <TableCell
                          key={ci}
                          className={cn(
                            "font-mono text-[13px]",
                            ci === 0 && "font-sans font-medium text-foreground",
                          )}
                        >
                          {renderInline(cell)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={idx} className="ml-1 space-y-1.5">
              {block.items.map((item, li) => (
                <li key={li} className="flex gap-2 text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="text-muted-foreground">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

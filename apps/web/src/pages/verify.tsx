import * as React from "react";
import {
  FileSearch,
  FileUp,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { DocTypeSelect } from "@/components/shared/doc-type-select";
import { VerifyVerdict } from "@/components/shared/verify-verdict";
import { IntegrityPanel } from "@/components/shared/integrity-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  KeyValueEditor,
  makeRow,
  rowsToRecord,
  type KeyValueRow,
} from "@/components/shared/key-value-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation } from "@/hooks/use-mutation";
import { toast } from "@/hooks/use-toast";
import { checkIntegrity, verifyFile, verifyPresented } from "@/services/api";
import { logActivity } from "@/lib/activity";
import { VERIFY_STATUS_META } from "@/lib/status";
import type { VerifyResult } from "@/types/api";

export default function VerifyPage() {
  const [mode, setMode] = React.useState("upload");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Verification tier"
        title="Verify a document"
        icon={<ShieldCheck className="size-6" />}
        description="Check a presented document against the issuer's record of truth. Get a clear verdict — confirmed, altered, not issued, or unverified — with the exact fields that differ."
      />

      <Tabs value={mode} onValueChange={setMode} className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="upload">
            <FileUp className="mr-1.5" />
            Upload document
          </TabsTrigger>
          <TabsTrigger value="structured">
            <Wand2 className="mr-1.5" />
            Structured record
          </TabsTrigger>
          <TabsTrigger value="integrity">
            <FileSearch className="mr-1.5" />
            Tamper check
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <UploadVerify />
        </TabsContent>
        <TabsContent value="structured">
          <StructuredVerify />
        </TabsContent>
        <TabsContent value="integrity">
          <IntegrityCheck />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useVerifyToast() {
  return React.useCallback((result: VerifyResult) => {
    const meta = VERIFY_STATUS_META[result.status];
    const variant =
      result.status === "confirmed"
        ? "success"
        : result.status === "unverified"
          ? "warning"
          : "destructive";
    toast({ variant, title: meta.label, description: result.message });
    logActivity({
      kind: "verify",
      title: `${result.issuer_id || "Unknown issuer"} · ${result.key || "no key"}`,
      status: result.status,
      issuerId: result.issuer_id,
      docType: result.doc_type,
    });
  }, []);
}

function ResultPane({
  result,
  error,
  onRetry,
}: {
  result: VerifyResult | null;
  error: string | null;
  onRetry?: () => void;
}) {
  if (error) {
    return <ErrorState title="Verification failed" message={error} onRetry={onRetry} />;
  }
  if (result) {
    return <VerifyVerdict result={result} />;
  }
  return (
    <EmptyState
      icon={<ShieldCheck />}
      title="No verification yet"
      description="Submit a document to see its authenticity verdict, field mismatches, and integrity signals here."
    />
  );
}

function UploadVerify() {
  const [file, setFile] = React.useState<File | null>(null);
  const [issuerId, setIssuerId] = React.useState("");
  const [docType, setDocType] = React.useState("");
  const mutation = useMutation(verifyFile);
  const notify = useVerifyToast();

  const run = async () => {
    if (!file) return;
    const result = await mutation.mutate(file, issuerId.trim(), docType);
    if (result) notify(result);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-8 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileUp className="size-4 text-primary" />
              Present a document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run();
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="verify-issuer">
                  Issuer ID <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="verify-issuer"
                  value={issuerId}
                  onChange={(e) => setIssuerId(e.target.value)}
                  placeholder="e.g. UNILAG"
                  disabled={mutation.isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-doc-type">
                  Document type <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <DocTypeSelect
                  id="verify-doc-type"
                  value={docType}
                  onChange={setDocType}
                  disabled={mutation.isLoading}
                  placeholder="Auto-detect"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-file">Document file</Label>
                <FileDropzone
                  id="verify-file"
                  files={file ? [file] : []}
                  onFilesSelected={(files) => setFile(files[0] ?? null)}
                  onRemove={() => setFile(null)}
                  disabled={mutation.isLoading}
                  hint="PDF or image · the document to authenticate"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={!file || mutation.isLoading}>
                  {mutation.isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      Verify document
                    </>
                  )}
                </Button>
                {(mutation.isSuccess || mutation.isError) && !mutation.isLoading && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      mutation.reset();
                    }}
                    aria-label="Reset"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                )}
              </div>

              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Uploading also runs a file-integrity check (provenance metadata + ELA) alongside the
                record match.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0">
        <ResultPane result={mutation.data} error={mutation.error} onRetry={file ? run : undefined} />
      </div>
    </div>
  );
}

const SAMPLE_FIELDS: KeyValueRow[] = [
  makeRow("holder", "Ada Obi"),
  makeRow("classification", "First Class"),
  makeRow("year", "2019"),
];

function StructuredVerify() {
  const [issuerId, setIssuerId] = React.useState("UNILAG");
  const [docType, setDocType] = React.useState("degree");
  const [key, setKey] = React.useState("CSC/2019/0413");
  const [rows, setRows] = React.useState<KeyValueRow[]>(SAMPLE_FIELDS);
  const mutation = useMutation(verifyPresented);
  const notify = useVerifyToast();

  const run = async () => {
    const result = await mutation.mutate({
      issuer_id: issuerId.trim(),
      doc_type: docType.trim(),
      key: key.trim(),
      fields: rowsToRecord(rows),
    });
    if (result) notify(result);
  };

  const canSubmit = issuerId.trim() && docType.trim() && key.trim() && !mutation.isLoading;

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-8 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wand2 className="size-4 text-primary" />
              Structured record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) run();
              }}
              className="space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sv-issuer">Issuer ID</Label>
                  <Input
                    id="sv-issuer"
                    value={issuerId}
                    onChange={(e) => setIssuerId(e.target.value)}
                    placeholder="UNILAG"
                    disabled={mutation.isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sv-doc-type">Document type</Label>
                  <Input
                    id="sv-doc-type"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    placeholder="degree"
                    disabled={mutation.isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sv-key">Record key</Label>
                <Input
                  id="sv-key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Certificate / reference number"
                  disabled={mutation.isLoading}
                  className="font-mono text-[13px]"
                  required
                />
              </div>

              <KeyValueEditor
                label="Presented fields"
                description="The fields to compare against the issued record."
                rows={rows}
                onChange={setRows}
                disabled={mutation.isLoading}
                keyPlaceholder="holder"
                valuePlaceholder="Ada Obi"
              />

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {mutation.isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    Verify record
                  </>
                )}
              </Button>

              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                A sample issuer (<span className="font-mono">UNILAG</span>) is pre-seeded on the
                backend. Try changing a field value to see an "altered" verdict.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0">
        <ResultPane result={mutation.data} error={mutation.error} onRetry={canSubmit ? run : undefined} />
      </div>
    </div>
  );
}

function IntegrityCheck() {
  const [file, setFile] = React.useState<File | null>(null);
  const mutation = useMutation(checkIntegrity);

  const run = async () => {
    if (!file) return;
    const result = await mutation.mutate(file);
    if (result) {
      toast({
        variant:
          result.risk === "low" ? "success" : result.risk === "medium" ? "warning" : "destructive",
        title: `Integrity: ${result.risk} risk`,
        description: `${result.signals.length} signal(s) analyzed.`,
      });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-8 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="size-4 text-primary" />
              Check a file for tampering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run();
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="integrity-file">Document file</Label>
                <FileDropzone
                  id="integrity-file"
                  files={file ? [file] : []}
                  onFilesSelected={(files) => setFile(files[0] ?? null)}
                  onRemove={() => setFile(null)}
                  disabled={mutation.isLoading}
                  hint="PDF or image · provenance metadata + ELA"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={!file || mutation.isLoading}>
                  {mutation.isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <FileSearch className="size-4" />
                      Run integrity check
                    </>
                  )}
                </Button>
                {(mutation.isSuccess || mutation.isError) && !mutation.isLoading && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      mutation.reset();
                    }}
                    aria-label="Reset"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                )}
              </div>

              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                This analyzes the file itself (design-tool metadata, revisions, camera EXIF, ELA). It
                never replaces matching the issuer's record.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0">
        {mutation.isError ? (
          <ErrorState
            title="Integrity check failed"
            message={mutation.error ?? "Something went wrong."}
            onRetry={file ? run : undefined}
          />
        ) : mutation.data ? (
          <IntegrityPanel report={mutation.data} />
        ) : (
          <EmptyState
            icon={<FileSearch />}
            title="No integrity check yet"
            description="Upload a file to inspect its provenance metadata and get a tamper-risk rating."
          />
        )}
      </div>
    </div>
  );
}

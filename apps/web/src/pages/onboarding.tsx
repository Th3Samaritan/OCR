import * as React from "react";
import {
  Building2,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  FileStack,
  Images,
  Loader2,
  RotateCcw,
  Table2,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { EmptyState } from "@/components/shared/empty-state";
import {
  KeyValueEditor,
  makeRow,
  rowsToRecord,
  type KeyValueRow,
} from "@/components/shared/key-value-editor";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation } from "@/hooks/use-mutation";
import { toast } from "@/hooks/use-toast";
import { addIssuerRecord, bulkRecords, bulkScans } from "@/services/api";
import { logActivity } from "@/lib/activity";
import { parseCsv, type ParsedCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

const SAMPLE_CSV = `key,holder,classification,year,programme
CSC/2019/0413,Ada Obi,First Class,2019,Computer Science
CSC/2019/0511,Ben Musa,Second Class Upper,2019,Computer Science
EEE/2020/0122,Chidi Eze,First Class,2020,Electrical Engineering`;

export default function OnboardingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Source of truth"
        title="Issuer Onboarding"
        icon={<Building2 className="size-6" />}
        description="Turn an issuer's records into something verifiable. Add a single record, import an existing register, or ingest a scanned paper archive."
      />

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="single">
            <Database className="mr-1.5" />
            Single record
          </TabsTrigger>
          <TabsTrigger value="records">
            <FileSpreadsheet className="mr-1.5" />
            Bulk register
          </TabsTrigger>
          <TabsTrigger value="scans">
            <Images className="mr-1.5" />
            Scanned archive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <SingleRecord />
        </TabsContent>
        <TabsContent value="records">
          <BulkRegister />
        </TabsContent>
        <TabsContent value="scans">
          <BulkScans />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IssuerDocTypeFields({
  issuerId,
  setIssuerId,
  docType,
  setDocType,
  disabled,
  idPrefix,
}: {
  issuerId: string;
  setIssuerId: (v: string) => void;
  docType: string;
  setDocType: (v: string) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-issuer`}>Issuer ID</Label>
        <Input
          id={`${idPrefix}-issuer`}
          value={issuerId}
          onChange={(e) => setIssuerId(e.target.value)}
          placeholder="e.g. UNILAG"
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-doc-type`}>Document type</Label>
        <Input
          id={`${idPrefix}-doc-type`}
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          placeholder="e.g. degree, license"
          disabled={disabled}
          required
        />
      </div>
    </div>
  );
}

function ResultPlaceholder({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return <EmptyState icon={icon} title={title} description={description} />;
}

/* --------------------------------------------------------------------------- */
/* Single record                                                               */
/* --------------------------------------------------------------------------- */
function SingleRecord() {
  const [issuerId, setIssuerId] = React.useState("UNILAG");
  const [docType, setDocType] = React.useState("degree");
  const [key, setKey] = React.useState("");
  const [holder, setHolder] = React.useState("");
  const [issuedDate, setIssuedDate] = React.useState("");
  const [sourceRef, setSourceRef] = React.useState("");
  const [rows, setRows] = React.useState<KeyValueRow[]>([makeRow("classification", "")]);
  const mutation = useMutation(addIssuerRecord);

  const canSubmit = issuerId.trim() && docType.trim() && key.trim() && !mutation.isLoading;

  const submit = async () => {
    const fields = rowsToRecord(rows);
    if (holder.trim()) fields.holder = holder.trim();
    const result = await mutation.mutate({
      issuer_id: issuerId.trim(),
      doc_type: docType.trim(),
      key: key.trim(),
      holder_name: holder.trim(),
      issued_date: issuedDate,
      source_ref: sourceRef.trim(),
      fields,
    });
    if (result?.ok) {
      toast({ variant: "success", title: "Record onboarded", description: `${result.issuer_id} · ${result.key}` });
      logActivity({
        kind: "onboard",
        title: `${result.issuer_id} · ${result.key}`,
        issuerId: result.issuer_id,
        docType: result.doc_type,
        count: 1,
      });
    }
  };

  const reset = () => {
    setKey("");
    setHolder("");
    setIssuedDate("");
    setSourceRef("");
    setRows([makeRow("classification", "")]);
    mutation.reset();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4 text-primary" />
            Add one issuer record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) submit();
            }}
            className="space-y-5"
          >
            <IssuerDocTypeFields
              issuerId={issuerId}
              setIssuerId={setIssuerId}
              docType={docType}
              setDocType={setDocType}
              disabled={mutation.isLoading}
              idPrefix="single"
            />

            <div className="space-y-2">
              <Label htmlFor="single-key">Record key</Label>
              <Input
                id="single-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Certificate / reference number"
                className="font-mono text-[13px]"
                disabled={mutation.isLoading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique per issuer &amp; document type — this is what verification looks up.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="single-holder">
                  Holder name <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="single-holder"
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder="e.g. Ada Obi"
                  disabled={mutation.isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="single-date">
                  Issued date <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="single-date"
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  disabled={mutation.isLoading}
                />
              </div>
            </div>

            <KeyValueEditor
              label="Attested fields"
              description="The canonical values the issuer attests to (e.g. classification, year)."
              rows={rows}
              onChange={setRows}
              disabled={mutation.isLoading}
            />

            <div className="space-y-2">
              <Label htmlFor="single-source">
                Source reference <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="single-source"
                value={sourceRef}
                onChange={(e) => setSourceRef(e.target.value)}
                placeholder="e.g. archive/box12/p221.png"
                disabled={mutation.isLoading}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={!canSubmit}>
                {mutation.isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Onboarding…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Onboard record
                  </>
                )}
              </Button>
              {(mutation.isSuccess || mutation.isError) && (
                <Button type="button" variant="outline" onClick={reset}>
                  <RotateCcw className="size-4" />
                  New record
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="lg:sticky lg:top-8 lg:self-start">
        {mutation.isError && (
          <Alert variant="destructive">
            <AlertTitle>Couldn't onboard record</AlertTitle>
            <AlertDescription>{mutation.error}</AlertDescription>
          </Alert>
        )}
        {mutation.isSuccess && mutation.data ? (
          <Alert variant="success">
            <CheckCircle2 />
            <AlertTitle>Record onboarded</AlertTitle>
            <AlertDescription>
              <p>
                Added to the source of truth for{" "}
                <span className="font-medium text-foreground">{mutation.data.issuer_id}</span>.
              </p>
              <dl className="mt-3 space-y-1.5 text-sm">
                <ResultRow label="Issuer" value={mutation.data.issuer_id} />
                <ResultRow label="Doc type" value={mutation.data.doc_type} />
                <ResultRow label="Key" value={mutation.data.key} mono />
              </dl>
            </AlertDescription>
          </Alert>
        ) : (
          !mutation.isError && (
            <ResultPlaceholder
              icon={<Database />}
              title="Records land here"
              description="Once onboarded, this record becomes verifiable on the Verification page."
            />
          )
        )}
      </div>
    </div>
  );
}

function ResultRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium text-foreground", mono && "font-mono text-[13px]")}>{value}</dd>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Bulk register (CSV rows)                                                    */
/* --------------------------------------------------------------------------- */
function BulkRegister() {
  const [issuerId, setIssuerId] = React.useState("UNILAG");
  const [docType, setDocType] = React.useState("degree");
  const [csvText, setCsvText] = React.useState("");
  const [keyField, setKeyField] = React.useState("");
  const mutation = useMutation(bulkRecords);

  const parsed: ParsedCsv = React.useMemo(() => parseCsv(csvText), [csvText]);
  const hasData = parsed.rows.length > 0;

  // Keep keyField valid as headers change.
  React.useEffect(() => {
    if (parsed.headers.length && !parsed.headers.includes(keyField)) {
      const guess = parsed.headers.find((h) => /key|no|number|id|cert|ref/i.test(h));
      setKeyField(guess ?? parsed.headers[0]);
    }
  }, [parsed.headers, keyField]);

  const canSubmit = issuerId.trim() && docType.trim() && keyField && hasData && !mutation.isLoading;

  const onCsvFile = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
  };

  const submit = async () => {
    const result = await mutation.mutate(issuerId.trim(), {
      doc_type: docType.trim(),
      key_field: keyField,
      rows: parsed.rows,
    });
    if (result) {
      toast({
        variant: result.ingested > 0 ? "success" : "warning",
        title: `${result.ingested} record${result.ingested === 1 ? "" : "s"} onboarded`,
        description: result.skipped ? `${result.skipped} row(s) skipped (missing key).` : undefined,
      });
      if (result.ingested > 0) {
        logActivity({
          kind: "onboard",
          title: `${issuerId.trim()} · bulk register`,
          issuerId: issuerId.trim(),
          docType: docType.trim(),
          count: result.ingested,
        });
      }
    }
  };

  const preview = parsed.rows.slice(0, 5);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="size-4 text-primary" />
            Import a register
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <IssuerDocTypeFields
            issuerId={issuerId}
            setIssuerId={setIssuerId}
            docType={docType}
            setDocType={setDocType}
            disabled={mutation.isLoading}
            idPrefix="bulk"
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bulk-csv">CSV data</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setCsvText(SAMPLE_CSV)}
                >
                  Load sample
                </button>
                <label className="cursor-pointer text-xs font-medium text-primary hover:underline">
                  Upload .csv
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onCsvFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <Textarea
              id="bulk-csv"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={SAMPLE_CSV}
              className="min-h-[160px] font-mono text-[13px]"
              disabled={mutation.isLoading}
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              First row is the header. Each following row becomes one issuer record.
            </p>
          </div>

          {hasData && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bulk-key-field">Key field</Label>
                  <Select value={keyField} onValueChange={setKeyField} disabled={mutation.isLoading}>
                    <SelectTrigger id="bulk-key-field">
                      <SelectValue placeholder="Select the unique key column" />
                    </SelectTrigger>
                    <SelectContent>
                      {parsed.headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                    <span className="font-semibold text-foreground">{parsed.rows.length}</span>{" "}
                    <span className="text-muted-foreground">rows detected</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        {parsed.headers.map((h) => (
                          <TableHead
                            key={h}
                            className={cn("whitespace-nowrap", h === keyField && "text-primary")}
                          >
                            {h}
                            {h === keyField && " (key)"}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row, i) => (
                        <TableRow key={i}>
                          {parsed.headers.map((h) => (
                            <TableCell key={h} className="whitespace-nowrap text-[13px]">
                              {row[h] || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsed.rows.length > preview.length && (
                  <p className="text-xs text-muted-foreground">
                    Showing {preview.length} of {parsed.rows.length} rows.
                  </p>
                )}
              </div>
            </>
          )}

          <Button onClick={submit} disabled={!canSubmit}>
            {mutation.isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <UploadCloud className="size-4" />
                Import {hasData ? `${parsed.rows.length} records` : "register"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="lg:sticky lg:top-8 lg:self-start">
        {mutation.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Import failed</AlertTitle>
            <AlertDescription>{mutation.error}</AlertDescription>
          </Alert>
        ) : mutation.isSuccess && mutation.data ? (
          <Alert variant="success">
            <CheckCircle2 />
            <AlertTitle>
              {mutation.data.ingested} record{mutation.data.ingested === 1 ? "" : "s"} onboarded
            </AlertTitle>
            <AlertDescription>
              {mutation.data.skipped > 0 && (
                <p className="mb-2 text-warning">
                  {mutation.data.skipped} row(s) skipped for a missing key.
                </p>
              )}
              {mutation.data.keys.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {mutation.data.keys.slice(0, 12).map((k) => (
                    <span
                      key={k}
                      className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80"
                    >
                      {k}
                    </span>
                  ))}
                  {mutation.data.keys.length > 12 && (
                    <span className="text-xs text-muted-foreground">
                      +{mutation.data.keys.length - 12} more
                    </span>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <ResultPlaceholder
            icon={<Table2 />}
            title="Import summary"
            description="Paste or upload a CSV register, pick the key column, and import. The result summary appears here."
          />
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Bulk scans                                                                  */
/* --------------------------------------------------------------------------- */
function BulkScans() {
  const [issuerId, setIssuerId] = React.useState("UNILAG");
  const [docType, setDocType] = React.useState("degree");
  const [files, setFiles] = React.useState<File[]>([]);
  const mutation = useMutation(bulkScans);

  const canSubmit = issuerId.trim() && docType.trim() && files.length > 0 && !mutation.isLoading;

  const submit = async () => {
    const result = await mutation.mutate(issuerId.trim(), docType.trim(), files);
    if (result) {
      toast({
        variant: "success",
        title: `${result.ingested} scan${result.ingested === 1 ? "" : "s"} ingested`,
        description: `Added to ${issuerId.trim()}'s archive.`,
      });
      logActivity({
        kind: "onboard",
        title: `${issuerId.trim()} · scanned archive`,
        issuerId: issuerId.trim(),
        docType: docType.trim(),
        count: result.ingested,
      });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileStack className="size-4 text-primary" />
            Ingest a scanned archive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <IssuerDocTypeFields
            issuerId={issuerId}
            setIssuerId={setIssuerId}
            docType={docType}
            setDocType={setDocType}
            disabled={mutation.isLoading}
            idPrefix="scans"
          />

          <div className="space-y-2">
            <Label htmlFor="scan-files">Scanned documents</Label>
            <FileDropzone
              id="scan-files"
              multiple
              files={files}
              onFilesSelected={(f) =>
                setFiles((prev) => {
                  const fresh = f.filter(
                    (nf) => !prev.some((pf) => pf.name === nf.name && pf.size === nf.size),
                  );
                  return [...prev, ...fresh];
                })
              }
              onRemove={(index) => setFiles((prev) => prev.filter((_, i) => i !== index))}
              disabled={mutation.isLoading}
              hint="PDF or images · each file becomes one record via OCR"
            />
            <p className="text-xs text-muted-foreground">
              Each file is OCR'd, extracted, and stored as an issuer record.
            </p>
          </div>

          <Button onClick={submit} disabled={!canSubmit}>
            {mutation.isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Ingesting {files.length} file{files.length === 1 ? "" : "s"}…
              </>
            ) : (
              <>
                <UploadCloud className="size-4" />
                Ingest {files.length > 0 ? `${files.length} file${files.length === 1 ? "" : "s"}` : "archive"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="lg:sticky lg:top-8 lg:self-start">
        {mutation.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Ingest failed</AlertTitle>
            <AlertDescription>{mutation.error}</AlertDescription>
          </Alert>
        ) : mutation.isSuccess && mutation.data ? (
          <Alert variant="success">
            <CheckCircle2 />
            <AlertTitle>
              {mutation.data.ingested} scan{mutation.data.ingested === 1 ? "" : "s"} ingested
            </AlertTitle>
            <AlertDescription>
              {mutation.data.keys.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {mutation.data.keys.slice(0, 12).map((k) => (
                    <span
                      key={k}
                      className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <ResultPlaceholder
            icon={<Images />}
            title="Ingest summary"
            description="Drop scanned certificates or PDFs. Each is OCR'd into a verifiable record and summarized here."
          />
        )}
      </div>
    </div>
  );
}

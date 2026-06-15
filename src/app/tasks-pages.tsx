import { FormEvent, useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@/lib/graphql/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SubjectsDocument,
  SubjectDetailDocument,
  CreateSubjectDocument,
  SetSubjectStatusDocument,
  UpdateSubjectDocument,
  RunWorkflowDocument,
  SubjectStatus,
} from "@/lib/graphql/generated/graphql";
import type { SubjectsQuery, SubjectDetailQuery } from "@/lib/graphql/generated/graphql";
import { statusColor, priorityColor, PageLoading, PageError, SectionHeading, Markdown } from "./shared";

const PRIORITY_LABELS = ["none", "low", "medium", "high", "critical"];

function priorityLabel(p: number | null | undefined): string {
  return PRIORITY_LABELS[p ?? 0] ?? "none";
}

const STATUS_OPTIONS: SubjectStatus[] = [
  SubjectStatus.Ready,
  SubjectStatus.InProgress,
  SubjectStatus.Blocked,
  SubjectStatus.Done,
  SubjectStatus.Cancelled,
];

export function TasksPage({ kind = "task" }: { kind?: string } = {}) {
  const heading = kind === "requirement" ? "Requirements" : "Tasks";
  const noun = kind === "requirement" ? "requirements" : "tasks";

  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const searchQuery = searchParams.get("search") ?? "";

  const statusVar = STATUS_OPTIONS.find((s) => s === statusFilter);

  const [result] = useQuery<SubjectsQuery>({
    query: SubjectsDocument,
    variables: { kind, status: statusVar },
  });
  const { data, fetching, error } = result;

  const subjects = data?.subject ?? [];

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => s.title.toLowerCase().includes(q));
  }, [subjects, searchQuery]);

  if (fetching) return <PageLoading />;
  if (error) return <PageError message={error.message} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <Link to="/tasks/new"><Button size="sm">Create</Button></Link>
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} {noun}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              if (statusFilter === s) next.delete("status");
              else next.set("status", s);
              setSearchParams(next);
            }}
            className={`rounded-md border px-2 py-1 text-xs text-center transition-colors ${
              statusFilter === s ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            }`}
          >
            {s.toLowerCase().replace(/_/g, "-")}
          </button>
        ))}
      </div>

      <Input
        placeholder={`Search ${noun}...`}
        value={searchQuery}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams);
          if (e.target.value) next.set("search", e.target.value);
          else next.delete("search");
          setSearchParams(next);
        }}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No {noun} match filters.</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link to={`/tasks/${s.id}`} className="font-mono text-xs underline">{s.id}</Link>
                  </TableCell>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell><Badge variant={statusColor(s.status)}>{s.status.toLowerCase().replace(/_/g, "-")}</Badge></TableCell>
                  <TableCell><Badge variant={priorityColor(priorityLabel(s.priority))}>{priorityLabel(s.priority)}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.assignee ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

export function TaskCreatePage() {
  const navigate = useNavigate();
  const [, createSubject] = useMutation(CreateSubjectDocument);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(2);
  const [kind, setKind] = useState("task");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setErrorMsg("Title is required."); return; }
    setSubmitting(true);
    setErrorMsg(null);
    const result = await createSubject({
      input: {
        kind: kind.trim() || "task",
        title: title.trim(),
        body: description.trim() || undefined,
        priority,
      },
    });
    setSubmitting(false);
    if (result.error) {
      setErrorMsg(result.error.message);
    } else {
      navigate(`/tasks/${result.data?.createSubject?.id}`, { replace: true });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Create Subject</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {PRIORITY_LABELS.map((label, i) => <option key={i} value={i}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Kind</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {["task", "requirement"].map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
              <Link to="/tasks"><Button variant="outline" type="button">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
      {errorMsg && <Alert variant="destructive"><AlertDescription>{errorMsg}</AlertDescription></Alert>}
    </div>
  );
}

export function TaskDetailPage() {
  const { taskId } = useParams();
  const [result, reexecute] = useQuery<SubjectDetailQuery>({
    query: SubjectDetailDocument,
    variables: { id: taskId! },
  });
  const [, setStatus] = useMutation(SetSubjectStatusDocument);
  const [, updateSubject] = useMutation(UpdateSubjectDocument);
  const [, runWorkflow] = useMutation(RunWorkflowDocument);

  const [targetStatus, setTargetStatus] = useState<SubjectStatus | "">("");
  const [assigneeDraft, setAssigneeDraft] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const { data, fetching, error } = result;

  const reload = useCallback(() => reexecute({ requestPolicy: "network-only" }), [reexecute]);

  const showFeedback = (kind: "ok" | "error", message: string) => setFeedback({ kind, message });

  if (fetching) return <PageLoading />;
  if (error) return <PageError message={error.message} />;

  const subject = data?.subjectById;
  if (!subject) return <PageError message={`Subject ${taskId} not found.`} />;

  const applyStatus = async () => {
    if (!targetStatus) return;
    const { error: err } = await setStatus({ id: taskId!, status: targetStatus });
    if (err) showFeedback("error", err.message);
    else { showFeedback("ok", `Status updated to ${targetStatus}.`); reload(); }
  };

  const onRunWorkflow = async () => {
    const { error: err } = await runWorkflow({ taskId: subject.id });
    if (err) showFeedback("error", err.message);
    else showFeedback("ok", "Workflow dispatched.");
  };

  // `assigneeDraft === null` means "not editing"; track the current value
  // against the live subject so we only send a change when it actually differs.
  const currentAssignee = subject.assignee ?? "";
  const assigneeValue = assigneeDraft ?? currentAssignee;

  const saveAssignee = async () => {
    const next = (assigneeDraft ?? currentAssignee).trim();
    if (next === currentAssignee.trim()) { setAssigneeDraft(null); return; }
    setSavingEdit(true);
    // Empty string clears the assignee (per schema contract).
    const { error: err } = await updateSubject({ input: { id: taskId!, assignee: next } });
    setSavingEdit(false);
    if (err) showFeedback("error", err.message);
    else { showFeedback("ok", next ? `Assignee set to ${next}.` : "Assignee cleared."); setAssigneeDraft(null); reload(); }
  };

  const addLabel = async () => {
    const label = newLabel.trim();
    if (!label || subject.labels.includes(label)) { setNewLabel(""); return; }
    setSavingEdit(true);
    const { error: err } = await updateSubject({ input: { id: taskId!, labelsAdd: [label] } });
    setSavingEdit(false);
    if (err) showFeedback("error", err.message);
    else { showFeedback("ok", `Label "${label}" added.`); setNewLabel(""); reload(); }
  };

  const removeLabel = async (label: string) => {
    setSavingEdit(true);
    const { error: err } = await updateSubject({ input: { id: taskId!, labelsRemove: [label] } });
    setSavingEdit(false);
    if (err) showFeedback("error", err.message);
    else { showFeedback("ok", `Label "${label}" removed.`); reload(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground/50 font-mono tracking-wide">{subject.id}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{subject.title}</h1>
          <div className="flex gap-2 mt-2 flex-wrap items-center">
            <Badge variant={statusColor(subject.status)}>{subject.status.toLowerCase().replace(/_/g, "-")}</Badge>
            {subject.nativeStatus && <Badge variant="outline">{subject.nativeStatus}</Badge>}
            <Badge variant={priorityColor(priorityLabel(subject.priority))}>{priorityLabel(subject.priority)}</Badge>
            <Badge variant="outline">{subject.kind}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onRunWorkflow}>Run Workflow</Button>
          <Link to={`/tasks/${subject.id}/output`}><Button size="sm" variant="outline">Output</Button></Link>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.kind === "error" ? "destructive" : "default"}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {subject.description && (
        <Card className="border-border/40 bg-card/60">
          <CardContent className="pt-4 pb-3 px-4"><Markdown content={subject.description} /></CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-[1fr_auto] gap-4 items-start">
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Status Transition</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center gap-2">
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as SubjectStatus)}
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select status...</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.toLowerCase().replace(/_/g, "-")}</option>
                ))}
              </select>
              <Button size="sm" onClick={applyStatus} disabled={!targetStatus || targetStatus === subject.status}>
                Apply
              </Button>
            </div>

            <div className="mt-4 pt-3 border-t border-border/30 space-y-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-medium mb-1">Assignee</div>
                <div className="flex items-center gap-2">
                  <Input
                    value={assigneeValue}
                    placeholder="unassigned"
                    onChange={(e) => setAssigneeDraft(e.target.value)}
                    className="h-9 flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={saveAssignee}
                    disabled={savingEdit || (assigneeValue.trim() === currentAssignee.trim())}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-medium mb-1">Labels</div>
                <div className="flex gap-1 flex-wrap mb-2">
                  {subject.labels.length === 0 && <span className="text-xs text-muted-foreground/50">none</span>}
                  {subject.labels.map((l) => (
                    <button
                      key={l}
                      type="button"
                      disabled={savingEdit}
                      onClick={() => removeLabel(l)}
                      className="group inline-flex items-center gap-1 rounded-md border border-border/40 px-2 py-0.5 text-[10px] hover:bg-destructive/10 hover:border-destructive/40 transition-colors disabled:opacity-50"
                      title="Remove label"
                    >
                      {l}<span className="text-muted-foreground/50 group-hover:text-destructive">×</span>
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); void addLabel(); }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={newLabel}
                    placeholder="Add label..."
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="h-9 flex-1"
                  />
                  <Button type="submit" size="sm" variant="outline" disabled={savingEdit || !newLabel.trim()}>
                    Add
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 min-w-[200px]">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground/60">Assignee</span>
              <span>{subject.assignee ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground/60">Created</span>
              <span className="font-mono">{subject.createdAt}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground/60">Updated</span>
              <span className="font-mono">{subject.updatedAt}</span>
            </div>
            {subject.parent && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground/60">Parent</span>
                <Link to={`/tasks/${subject.parent}`} className="font-mono text-primary/80 hover:text-primary">{subject.parent}</Link>
              </div>
            )}
            {subject.url && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground/60">URL</span>
                <a href={subject.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]">{subject.url}</a>
              </div>
            )}
            {subject.labels.length > 0 && (
              <div className="flex gap-1 flex-wrap pt-1">
                {subject.labels.map((l) => <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {subject.children.length > 0 && (
        <>
          <SectionHeading>Children</SectionHeading>
          <Card className="border-border/40 bg-card/60">
            <CardContent className="px-4 py-3">
              <div className="flex gap-2 flex-wrap">
                {subject.children.map((c) => (
                  <Link key={c} to={`/tasks/${c}`}>
                    <Badge variant="outline" className="font-mono text-[10px] hover:bg-accent/50 transition-colors cursor-pointer">{c}</Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {subject.attachments.length > 0 && (
        <>
          <SectionHeading>Attachments</SectionHeading>
          <Card className="border-border/40 bg-card/60">
            <CardContent className="px-4 py-3 space-y-1.5">
              {subject.attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-[10px]">{a.kind}</Badge>
                  <a href={a.uri} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {a.title ?? a.uri}
                  </a>
                  {a.mimeType && <span className="text-muted-foreground/50">{a.mimeType}</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {(subject.statusMetadata || subject.custom) && (
        <>
          <SectionHeading>Metadata</SectionHeading>
          {subject.statusMetadata && (
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Status Metadata</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <pre className="overflow-x-auto rounded-md bg-muted/50 border border-border/30 p-3 text-[11px] font-mono text-foreground/80">{subject.statusMetadata}</pre>
              </CardContent>
            </Card>
          )}
          {subject.custom && (
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Custom</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <pre className="overflow-x-auto rounded-md bg-muted/50 border border-border/30 p-3 text-[11px] font-mono text-foreground/80">{subject.custom}</pre>
              </CardContent>
            </Card>
          )}
        </>
      )}

    </div>
  );
}

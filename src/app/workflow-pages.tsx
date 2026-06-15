import { FormEvent, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@/lib/graphql/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  WorkflowsDocument,
  WorkflowDetailDocument,
  RunWorkflowDocument,
  PauseWorkflowDocument,
  ResumeWorkflowDocument,
  CancelWorkflowDocument,
  WorkflowStatus,
} from "@/lib/graphql/generated/graphql";
import type { WorkflowsQuery, WorkflowDetailQuery } from "@/lib/graphql/generated/graphql";
import { statusColor, StatusDot, PageLoading, PageError, StatCard, SectionHeading } from "./shared";

type WfSummary = WorkflowsQuery["workflows"][number];

function statusLabel(status: WorkflowStatus): string {
  return status.toLowerCase();
}

function WorkflowRow({ wf }: { wf: WfSummary }) {
  return (
    <Link to={`/workflows/${wf.id}`} className="block">
      <Card className="border-border/40 bg-card/60 p-3 hover:border-border/60 transition-colors">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot status={statusLabel(wf.status)} />
            <span className="text-sm font-medium truncate">{wf.id}</span>
            <span className="font-mono text-xs text-muted-foreground shrink-0">{wf.definition}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
            {wf.subjectId && (
              <Link
                to={`/tasks/${wf.subjectId}`}
                className="font-mono underline"
                onClick={(e) => e.stopPropagation()}
              >
                {wf.subjectId}
              </Link>
            )}
            <Badge variant={statusColor(statusLabel(wf.status))} className="text-[10px]">
              {statusLabel(wf.status)}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}

const STATUS_FILTERS: { label: string; value: WorkflowStatus | null }[] = [
  { label: "All", value: null },
  { label: "Pending", value: WorkflowStatus.Pending },
  { label: "Running", value: WorkflowStatus.Running },
  { label: "Paused", value: WorkflowStatus.Paused },
  { label: "Completed", value: WorkflowStatus.Completed },
  { label: "Failed", value: WorkflowStatus.Failed },
  { label: "Cancelled", value: WorkflowStatus.Cancelled },
];

export function WorkflowsPage() {
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | null>(null);
  const [result, reexecute] = useQuery<WorkflowsQuery>({
    query: WorkflowsDocument,
    variables: statusFilter ? { status: statusFilter } : {},
  });
  const [, runWf] = useMutation(RunWorkflowDocument);
  const [runTaskId, setRunTaskId] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const { data, fetching, error } = result;
  const workflows = data?.workflows ?? [];

  const counts = useMemo(() => {
    const c = { running: 0, pending: 0, completed: 0, failed: 0 };
    for (const w of workflows) {
      if (w.status === WorkflowStatus.Running) c.running++;
      else if (w.status === WorkflowStatus.Pending) c.pending++;
      else if (w.status === WorkflowStatus.Completed) c.completed++;
      else if (w.status === WorkflowStatus.Failed) c.failed++;
    }
    return c;
  }, [workflows]);

  if (fetching) return <PageLoading />;
  if (error) return <PageError message={error.message} />;

  const onRun = async (e: FormEvent) => {
    e.preventDefault();
    if (!runTaskId.trim()) return;
    const { error: err } = await runWf({ taskId: runTaskId.trim() });
    if (err) setFeedback({ kind: "error", message: err.message });
    else {
      setFeedback({ kind: "ok", message: `Workflow started for ${runTaskId}.` });
      setRunTaskId("");
      setShowNewForm(false);
      reexecute();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="text-sm text-muted-foreground">{counts.running} running &middot; {counts.pending} pending</p>
        </div>
        <div className="relative">
          <Button onClick={() => setShowNewForm(!showNewForm)}>New Workflow</Button>
          {showNewForm && (
            <div className="absolute right-0 top-full mt-2 z-10">
              <Card className="border-border/40 bg-card/60 p-3 w-64">
                <form onSubmit={onRun} className="space-y-2">
                  <Input
                    placeholder="Task ID (e.g. TASK-014)"
                    value={runTaskId}
                    onChange={(e) => setRunTaskId(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit" size="sm" className="w-full">Run Workflow</Button>
                </form>
              </Card>
            </div>
          )}
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.kind === "error" ? "destructive" : "default"} role={feedback.kind === "error" ? "alert" : "status"}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Running" value={counts.running} accent />
        <StatCard label="Pending" value={counts.pending} />
        <StatCard label="Completed" value={counts.completed} />
        <StatCard label="Failed" value={counts.failed} />
      </div>

      <div className="flex flex-wrap gap-1">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.label}
            size="sm"
            variant={statusFilter === f.value ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {workflows.length > 0 ? (
        <div className="space-y-2">
          <SectionHeading>Workflows</SectionHeading>
          <div className="space-y-2">
            {workflows.map((wf) => <WorkflowRow key={wf.id} wf={wf} />)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-sm text-muted-foreground/60">No workflows yet</p>
          <Button variant="outline" onClick={() => setShowNewForm(true)}>New Workflow</Button>
        </div>
      )}
    </div>
  );
}

export function WorkflowDetailPage() {
  const { workflowId } = useParams();
  const [result, reexecute] = useQuery<WorkflowDetailQuery>({
    query: WorkflowDetailDocument,
    variables: { id: workflowId! },
  });
  const [, pauseWf] = useMutation(PauseWorkflowDocument);
  const [, resumeWf] = useMutation(ResumeWorkflowDocument);
  const [, cancelWf] = useMutation(CancelWorkflowDocument);
  const [wfMessage, setWfMessage] = useState<string | null>(null);
  const [wfOperating, setWfOperating] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data, fetching, error } = result;
  if (fetching) return <PageLoading />;
  if (error) return <PageError message={error.message} />;

  const wf = data?.workflow;
  if (!wf) return <PageError message={`Workflow ${workflowId} not found.`} />;

  let parsedDetail: unknown = null;
  let parseError: string | null = null;
  if (wf.detail) {
    try {
      parsedDetail = JSON.parse(wf.detail);
    } catch (e: unknown) {
      parseError = e instanceof Error ? e.message : String(e);
    }
  }

  const wfAction = async (label: string, fn: () => Promise<{ data?: unknown; error?: { message: string } }>) => {
    setWfOperating(true);
    setWfMessage(null);
    const res = await fn();
    setWfOperating(false);
    if (res.error) {
      setWfMessage(`Error: ${res.error.message}`);
    } else {
      setWfMessage(`${label} successful.`);
      reexecute();
    }
  };

  const isRunning = wf.status === WorkflowStatus.Running;
  const isPaused = wf.status === WorkflowStatus.Paused;
  const isTerminal = [WorkflowStatus.Completed, WorkflowStatus.Failed, WorkflowStatus.Cancelled].includes(wf.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground font-mono break-all">{wf.id}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {wf.subjectId ? (
              <>Workflow for <Link to={`/tasks/${wf.subjectId}`} className="underline">{wf.subjectId}</Link></>
            ) : (
              <>Workflow {wf.definition}</>
            )}
          </h1>
          <div className="flex gap-2 mt-2 items-center">
            <Badge variant={statusColor(statusLabel(wf.status))}>{statusLabel(wf.status)}</Badge>
            <Badge variant="outline">{wf.definition}</Badge>
          </div>
        </div>
        {!isTerminal && (
          <div className="flex items-center gap-2 flex-wrap">
            {isRunning && (
              <Button variant="secondary" disabled={wfOperating} onClick={() => wfAction("Pause", () => pauseWf({ id: workflowId! }))}>
                Pause
              </Button>
            )}
            {isPaused && (
              <Button variant="secondary" disabled={wfOperating} onClick={() => wfAction("Resume", () => resumeWf({ id: workflowId! }))}>
                Resume
              </Button>
            )}
            {confirmCancel ? (
              <>
                <Button variant="destructive" disabled={wfOperating} onClick={() => { setConfirmCancel(false); wfAction("Cancel", () => cancelWf({ id: workflowId! })); }}>
                  Confirm Cancel
                </Button>
                <Button variant="outline" onClick={() => setConfirmCancel(false)}>Back</Button>
              </>
            ) : (
              <Button variant="ghost" className="text-destructive/60 hover:text-destructive" disabled={wfOperating} onClick={() => setConfirmCancel(true)}>
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>

      {wfMessage && (
        <Alert variant={wfMessage.startsWith("Error") ? "destructive" : "default"} role={wfMessage.startsWith("Error") ? "alert" : "status"}>
          <AlertDescription>{wfMessage}</AlertDescription>
        </Alert>
      )}

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Overview</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-1 text-sm">
          <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">Definition</span><span className="font-mono">{wf.definition}</span></div>
          <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">Status</span><span>{statusLabel(wf.status)}</span></div>
          {wf.subjectId && <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">Subject</span><span className="font-mono">{wf.subjectId}</span></div>}
          <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">Started</span><span className="font-mono">{wf.startedAt}</span></div>
          {wf.finishedAt && <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">Finished</span><span className="font-mono">{wf.finishedAt}</span></div>}
        </CardContent>
      </Card>

      {/* TODO(E-followup): richer rendering for proper phase/decision UI */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Detail</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {parseError && <p className="text-xs text-destructive">Failed to parse detail: {parseError}</p>}
          {!wf.detail && !parseError && <p className="text-xs text-muted-foreground/60">No detail available</p>}
          {parsedDetail != null && (
            <pre className="text-xs font-mono overflow-auto max-h-96 p-3 rounded bg-muted/20 whitespace-pre-wrap">
              {JSON.stringify(parsedDetail, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

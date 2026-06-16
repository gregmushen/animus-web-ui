import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useSubscription } from "@/lib/graphql/client";
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
  WorkflowEventsDocument,
  WorkflowStatus,
} from "@/lib/graphql/generated/graphql";
import type {
  WorkflowsQuery,
  WorkflowDetailQuery,
  WorkflowEventsSubscription,
} from "@/lib/graphql/generated/graphql";
import { statusColor, StatusDot, PageLoading, PageError, StatCard, SectionHeading } from "./shared";

// The `detail` blob is an opaque, backend-defined JSON string. Its shape is
// not guaranteed, so we probe for the common WorkflowRun fields (phase history,
// decisions, checkpoints) defensively and fall back to a collapsible raw view
// for everything we don't recognize.
function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
  }
  return undefined;
}

function asArray(v: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  return null;
}

// First key in `keys` that is present (non-null) in obj, or "" if none.
function matchedKey(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    if (obj[k] != null) return k;
  }
  return "";
}

function fieldText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function PhaseList({ phases }: { phases: Record<string, unknown>[] }) {
  return (
    <div className="space-y-1.5">
      {phases.map((p, i) => {
        const id = fieldText(pick(p, "phase_id", "phaseId", "id", "name")) || `phase ${i + 1}`;
        const status = fieldText(pick(p, "status", "state", "outcome"));
        const provider = fieldText(pick(p, "provider", "tool", "model"));
        const started = fieldText(pick(p, "started_at", "startedAt"));
        const finished = fieldText(pick(p, "completed_at", "finished_at", "completedAt", "finishedAt"));
        return (
          <div key={`${id}-${i}`} className="flex items-center gap-2 rounded-md border border-border/30 bg-muted/10 px-3 py-1.5">
            {status && <StatusDot status={status} />}
            <span className="font-mono text-xs font-medium">{id}</span>
            {status && <Badge variant={statusColor(status)} className="text-[10px]">{status.toLowerCase()}</Badge>}
            {provider && <span className="text-[10px] text-muted-foreground/60 font-mono">{provider}</span>}
            <span className="ml-auto text-[10px] text-muted-foreground/40 font-mono">
              {finished || started}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DecisionList({ decisions }: { decisions: Record<string, unknown>[] }) {
  return (
    <div className="space-y-1.5">
      {decisions.map((d, i) => {
        const phase = fieldText(pick(d, "phase_id", "phaseId", "phase", "gate"));
        const decision = fieldText(pick(d, "decision", "outcome", "verdict", "action"));
        const reason = fieldText(pick(d, "reason", "rationale", "notes", "message"));
        return (
          <div key={i} className="rounded-md border border-border/30 bg-muted/10 px-3 py-1.5">
            <div className="flex items-center gap-2">
              {phase && <span className="font-mono text-xs">{phase}</span>}
              {decision && <Badge variant={statusColor(decision)} className="text-[10px]">{decision.toLowerCase()}</Badge>}
            </div>
            {reason && <p className="text-[11px] text-muted-foreground/70 mt-1">{reason}</p>}
          </div>
        );
      })}
    </div>
  );
}

function CollapsibleJson({ label, value }: { label: string; value: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-border/30 bg-muted/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-accent/20 transition-colors"
      >
        <span className="font-mono text-muted-foreground/70">{label}</span>
        <span className="text-muted-foreground/40">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <pre className="text-[11px] font-mono overflow-auto max-h-80 p-3 whitespace-pre-wrap border-t border-border/20">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function WorkflowDetailView({ detail }: { detail: unknown }) {
  if (detail == null || typeof detail !== "object" || Array.isArray(detail)) {
    return (
      <pre className="text-xs font-mono overflow-auto max-h-96 p-3 rounded bg-muted/20 whitespace-pre-wrap">
        {JSON.stringify(detail, null, 2)}
      </pre>
    );
  }
  const obj = detail as Record<string, unknown>;
  // Track exactly which keys we consume into a structured section so the
  // fallback can still surface any known key whose shape we couldn't render
  // (e.g. `phases` arriving as an object/map rather than an array).
  const consumed = new Set<string>();
  const pickConsume = (...keys: string[]): unknown => {
    for (const k of keys) {
      if (obj[k] != null) { consumed.add(k); return obj[k]; }
    }
    return undefined;
  };
  const status = fieldText(pickConsume("status", "state"));
  const phases = asArray(pickConsume("phases", "phase_history", "phaseHistory", "history"));
  const decisions = asArray(pickConsume("decisions", "decision_log", "decisionLog"));
  const checkpoints = asArray(pickConsume("checkpoints", "checkpoint_log", "checkpointLog"));
  // If a consumed key's value wasn't actually array-renderable, keep it in the
  // fallback view so nothing the raw JSON would have shown is silently dropped.
  if (phases == null) consumed.delete(matchedKey(obj, "phases", "phase_history", "phaseHistory", "history"));
  if (decisions == null) consumed.delete(matchedKey(obj, "decisions", "decision_log", "decisionLog"));
  if (checkpoints == null) consumed.delete(matchedKey(obj, "checkpoints", "checkpoint_log", "checkpointLog"));
  const rest = Object.fromEntries(Object.entries(obj).filter(([k]) => !consumed.has(k)));
  const hasStructured = status || phases || decisions || checkpoints;

  return (
    <div className="space-y-3">
      {status && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground w-24 shrink-0">Run status</span>
          <Badge variant={statusColor(status)}>{status.toLowerCase()}</Badge>
        </div>
      )}
      {phases && phases.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-medium mb-1.5">Phases ({phases.length})</p>
          <PhaseList phases={phases} />
        </div>
      )}
      {decisions && decisions.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-medium mb-1.5">Decisions ({decisions.length})</p>
          <DecisionList decisions={decisions} />
        </div>
      )}
      {checkpoints && checkpoints.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-medium mb-1.5">Checkpoints ({checkpoints.length})</p>
          <CollapsibleJson label={`${checkpoints.length} checkpoint(s)`} value={checkpoints} />
        </div>
      )}
      {Object.keys(rest).length > 0 && (
        <div>
          {!hasStructured && (
            <p className="text-[11px] text-muted-foreground/50 mb-1.5">
              Unrecognized detail shape — showing structured fields.
            </p>
          )}
          <div className="space-y-1.5">
            {Object.entries(rest).map(([k, v]) =>
              v != null && typeof v === "object" ? (
                <CollapsibleJson key={k} label={k} value={v} />
              ) : (
                <div key={k} className="flex gap-2 text-xs px-3 py-1">
                  <span className="text-muted-foreground/60 font-mono w-40 shrink-0 truncate">{k}</span>
                  <span className="font-mono break-all">{fieldText(v)}</span>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const wf = data?.workflow;

  // Per-workflow live updates: stream `workflowEvents(workflowId)` over
  // graphql-ws and refetch the detail query whenever a phase/workflow event
  // lands so the structured detail (phases, decisions, status) stays current
  // without polling. We stop subscribing once the run reaches a terminal
  // state. `pause` is keyed on the resolved status so the effect re-subscribes
  // only when liveness actually changes.
  const isTerminalStatus =
    wf != null &&
    [WorkflowStatus.Completed, WorkflowStatus.Failed, WorkflowStatus.Cancelled].includes(wf.status);
  const [lastEvent, setLastEvent] = useState<WorkflowEventsSubscription["workflowEvents"] | null>(null);
  const [{ error: streamError }] = useSubscription<WorkflowEventsSubscription>(
    {
      query: WorkflowEventsDocument,
      variables: { workflowId: workflowId! },
      pause: !workflowId || isTerminalStatus,
    },
    (_prev, next) => {
      const evt = next?.workflowEvents;
      if (evt) setLastEvent(evt);
      return next;
    },
  );

  // Refetch detail when a NEW live event arrives. `reexecute` is recreated on
  // each render, so we hold it in a ref and key the effect on the event's
  // stable timestamp+kind — this fires exactly once per websocket message
  // rather than on every subsequent render.
  const reexecuteRef = useRef(reexecute);
  useEffect(() => {
    reexecuteRef.current = reexecute;
  }, [reexecute]);
  const lastEventKey = lastEvent ? `${lastEvent.at}:${lastEvent.kind}` : null;
  useEffect(() => {
    if (lastEventKey) reexecuteRef.current();
  }, [lastEventKey]);

  if (fetching && !data) return <PageLoading />;
  if (error) return <PageError message={error.message} />;
  if (!wf) return <PageError message={`Workflow ${workflowId} not found.`} />;

  const isLive = !isTerminalStatus && !streamError;

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
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <StatusDot status="running" />
                live
              </span>
            )}
            {lastEvent && (
              <span className="text-[10px] text-muted-foreground/40 font-mono" title={lastEvent.at}>
                last event: {lastEvent.kind}
              </span>
            )}
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

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Run Detail</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {parseError && <p className="text-xs text-destructive">Failed to parse detail: {parseError}</p>}
          {!wf.detail && !parseError && <p className="text-xs text-muted-foreground/60">No detail available</p>}
          {parsedDetail != null && <WorkflowDetailView detail={parsedDetail} />}
        </CardContent>
      </Card>
    </div>
  );
}

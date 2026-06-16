import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@/lib/graphql/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ReadySubjectsDocument,
  DaemonDocument,
  RunWorkflowDocument,
  DispatchRequirementsDocument,
  ExecuteWorkflowDocument,
} from "@/lib/graphql/generated/graphql";
import type {
  ReadySubjectsQuery,
  DaemonQuery,
  DispatchRequirementsQuery,
} from "@/lib/graphql/generated/graphql";
import { statusColor, priorityColor, PageLoading, PageError } from "./shared";

const PRIORITY_LABELS = ["none", "low", "medium", "high", "critical"];

function priorityLabel(p: number | null | undefined): string {
  return PRIORITY_LABELS[p ?? 0] ?? "none";
}

// TODO(E-followup): the kernel GraphQL schema (QueryRoot) exposes no
// workflow-definitions/catalog query as of animus-protocol v0.5.12 — only
// `workflows`/`workflow` (runs) exist. Until transport-graphql adds a
// definitions query we keep the free-text definition-name input. Wire a
// <select> here once that query lands.
function WorkflowDefinitionInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="default workflow (leave empty)"
        aria-label="Workflow definition name"
      />
      <p className="text-xs text-muted-foreground/70">
        Workflow definition name. Leave empty to use the default workflow.
      </p>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/workflows" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
      &larr; Back to Workflows
    </Link>
  );
}

function PreflightCheck({ check, index }: { check: { label: string; passed: boolean; fix?: string }; index: number }) {
  return (
    <div className="flex items-start gap-2.5 ao-fade-in" style={{ animationDelay: `${index * 60}ms` }}>
      <span
        className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
          check.passed
            ? "bg-[var(--ao-success)] shadow-[0_0_6px_var(--ao-success)]"
            : "bg-destructive shadow-[0_0_6px_oklch(0.65_0.22_25/50%)]"
        }`}
        aria-hidden="true"
      />
      <div>
        <p className="text-sm">{check.label}</p>
        {!check.passed && check.fix && (
          <p className="text-xs text-muted-foreground/60 mt-0.5">{check.fix}</p>
        )}
      </div>
    </div>
  );
}

export function TaskDispatchPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [definition, setDefinition] = useState("");
  const [launching, setLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [readyResult] = useQuery<ReadySubjectsQuery>({ query: ReadySubjectsDocument, variables: { kind: "task" } });
  const [daemonResult] = useQuery<DaemonQuery>({ query: DaemonDocument });
  const [, runWorkflow] = useMutation(RunWorkflowDocument);

  const allTasks = readyResult.data?.subject ?? [];
  const daemon = daemonResult.data?.daemon;
  const daemonHealth = daemonResult.data?.daemonHealth;

  const tasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTasks;
    return allTasks.filter(
      (t) => t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q)
    );
  }, [allTasks, search]);

  const selectedTask = useMemo(
    () => allTasks.find((t) => t.id === selectedTaskId) ?? null,
    [allTasks, selectedTaskId]
  );

  const preflightChecks = useMemo(() => {
    const checks: { label: string; passed: boolean; fix?: string }[] = [];

    const daemonRunning = daemon?.running === true;
    checks.push({
      label: "Daemon is running",
      passed: daemonRunning,
      fix: daemonRunning ? undefined : "Start the daemon from the Daemon page or run `animus daemon start`",
    });

    const healthy = daemonHealth?.healthy === true;
    checks.push({
      label: "Daemon is healthy",
      passed: healthy,
      fix: healthy ? undefined : "Check daemon health via `animus daemon health`",
    });

    if (selectedTask) {
      const validStatus = selectedTask.status === "READY";
      checks.push({
        label: `Task status is dispatchable (${selectedTask.status})`,
        passed: validStatus,
        fix: validStatus ? undefined : "Set task status to 'ready' before dispatching",
      });
    }

    return checks;
  }, [daemon, daemonHealth, selectedTask]);

  const allPassed = selectedTask !== null && preflightChecks.every((c) => c.passed);

  const onLaunch = async () => {
    if (!selectedTaskId) return;
    setLaunching(true);
    setErrorMsg(null);

    const { data, error } = await runWorkflow({
      taskId: selectedTaskId,
      definition: definition.trim() || null,
    });
    setLaunching(false);
    if (error) {
      setErrorMsg(error.message);
    } else if (data?.runWorkflow?.workflowId) {
      navigate(`/workflows/${data.runWorkflow.workflowId}`);
    }
  };

  if (readyResult.fetching || daemonResult.fetching) return <PageLoading />;
  if (readyResult.error) return <PageError message={readyResult.error.message} />;

  return (
    <div className="space-y-6 ao-fade-in">
      <BackLink />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Run Workflow</h1>
        <p className="text-sm text-muted-foreground mt-1">Dispatch a workflow for a task</p>
      </div>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Task</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Input
            placeholder="Search ready tasks by ID or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tasks"
            className="mb-3"
          />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No ready tasks match.</p>
            ) : (
              tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTaskId(t.id)}
                  aria-pressed={selectedTaskId === t.id}
                  className={`w-full text-left rounded-md border px-3 py-2 transition-all duration-150 ${
                    selectedTaskId === t.id
                      ? "border-primary/30 bg-primary/5"
                      : "border-transparent hover:bg-accent/30"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{t.id}</span>
                    <span className="text-sm flex-1 truncate min-w-0">{t.title}</span>
                    <Badge variant={priorityColor(priorityLabel(t.priority))} className="text-[10px]">{priorityLabel(t.priority)}</Badge>
                    <Badge variant={statusColor(t.status.toLowerCase())} className="text-[10px]">{t.status}</Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Workflow Type</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <WorkflowDefinitionInput value={definition} onChange={setDefinition} />
        </CardContent>
      </Card>

      {selectedTask && (
        <Card className="border-border/40 bg-card/60 ao-fade-in">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Pre-flight</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2.5">
              {preflightChecks.map((check, i) => (
                <PreflightCheck key={check.label} check={check} index={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {errorMsg && (
        <Alert variant="destructive" className="ao-fade-in border-destructive/30 bg-destructive/8">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={onLaunch}
        disabled={!allPassed || launching}
      >
        {launching ? "Launching..." : "Launch Workflow"}
      </Button>
    </div>
  );
}

export function RequirementDispatchPage() {
  const [{ data, fetching, error }] = useQuery<DispatchRequirementsQuery>({ query: DispatchRequirementsDocument });
  const [, runWorkflow] = useMutation(RunWorkflowDocument);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [autoStart, setAutoStart] = useState(true);
  const [definition, setDefinition] = useState("");
  const [executing, setExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<{ dispatched: number; errors: string[] } | null>(null);

  const requirements = data?.subject ?? [];

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(requirements.map((r) => r.id)));
  };

  const onExecute = async () => {
    const selected = requirements.filter((r) => selectedIds.has(r.id));
    const taskIds = new Set<string>();
    for (const req of selected) {
      for (const childId of req.children) {
        taskIds.add(childId);
      }
    }

    if (!autoStart || taskIds.size === 0) {
      setResults({ dispatched: 0, errors: taskIds.size === 0 ? ["No linked tasks found for selected requirements"] : [] });
      return;
    }

    setExecuting(true);
    setErrorMsg(null);
    setResults(null);

    const resolvedDefinition = definition.trim() || null;
    const errors: string[] = [];
    let dispatched = 0;

    for (const taskId of taskIds) {
      const { error: err } = await runWorkflow({ taskId, definition: resolvedDefinition });
      if (err) {
        errors.push(`${taskId}: ${err.message}`);
      } else {
        dispatched++;
      }
    }

    setExecuting(false);
    setResults({ dispatched, errors });
  };

  if (fetching) return <PageLoading />;
  if (error) return <PageError message={error.message} />;

  return (
    <div className="space-y-6 ao-fade-in">
      <BackLink />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Execute Requirements</h1>
        <p className="text-sm text-muted-foreground mt-1">Dispatch workflows for tasks linked to requirements</p>
      </div>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Requirements</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={selectAll}>Select All</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {requirements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No requirements found.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-1">
              {requirements.map((req) => (
                <label
                  key={req.id}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 transition-all duration-150 cursor-pointer ${
                    selectedIds.has(req.id)
                      ? "border-primary/30 bg-primary/5"
                      : "border-transparent hover:bg-accent/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(req.id)}
                    onChange={() => toggleSelection(req.id)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="font-mono text-xs text-muted-foreground shrink-0">{req.id}</span>
                  <span className="text-sm flex-1 truncate min-w-0">{req.title}</span>
                  <Badge variant={priorityColor(priorityLabel(req.priority))} className="text-[10px]">
                    {priorityLabel(req.priority)}
                  </Badge>
                  <Badge variant={statusColor(req.status.toLowerCase())} className="text-[10px]">{req.status}</Badge>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Options</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">Auto-start workflows for linked tasks</span>
          </label>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2">Workflow Type</p>
            <WorkflowDefinitionInput value={definition} onChange={setDefinition} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Preview</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-1 text-sm">
            <p><span className="font-mono font-semibold">{selectedIds.size}</span> requirements selected</p>
            {autoStart && selectedIds.size > 0 && (
              <p className="text-muted-foreground">Will dispatch workflows for all linked tasks</p>
            )}
          </div>
        </CardContent>
      </Card>

      {errorMsg && (
        <Alert variant="destructive" className="ao-fade-in border-destructive/30 bg-destructive/8">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {results && (
        <Card className="border-border/40 bg-card/60 ao-fade-in">
          <CardContent className="px-4 py-4 space-y-2">
            <p className="text-sm">
              Workflows dispatched: <span className="font-mono font-semibold">{results.dispatched}</span>
            </p>
            {results.errors.length > 0 && (
              <div className="space-y-1">
                {results.errors.map((err, i) => (
                  <p key={i} className="text-sm text-destructive">{err}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        onClick={onExecute}
        disabled={selectedIds.size === 0 || executing}
      >
        {executing ? "Executing..." : "Execute Requirements"}
      </Button>
    </div>
  );
}

export function CustomDispatchPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [definition, setDefinition] = useState("");
  const [launching, setLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, executeWorkflow] = useMutation(ExecuteWorkflowDocument);

  const onLaunch = async () => {
    if (!definition.trim()) return;
    setLaunching(true);
    setErrorMsg(null);

    const { data, error } = await executeWorkflow({
      definition: definition.trim(),
      subjectId: null,
    });
    setLaunching(false);
    if (error) {
      setErrorMsg(error.message);
    } else if (data?.executeWorkflow?.workflowId) {
      navigate(`/workflows/${data.executeWorkflow.workflowId}`);
    }
  };

  return (
    <div className="space-y-6 ao-fade-in">
      <BackLink />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Custom Workflow</h1>
        <p className="text-sm text-muted-foreground mt-1">Run an ad-hoc workflow</p>
      </div>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Details</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Workflow title (informational)..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Description</label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this workflow should accomplish (informational)..."
              className="mt-1"
            />
          </div>
          <div>
            {/* TODO(E-followup): UX — `executeWorkflow(definition: String!)` accepts a
                definition name today; a future pass could let this field also take inline
                YAML. Not schema-blocked, purely an input-affordance enhancement. */}
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Definition</label>
            <Textarea
              rows={6}
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="Workflow definition name or inline YAML..."
              className="mt-1 font-mono text-xs"
              aria-label="Workflow definition"
            />
            <p className="text-[10px] text-muted-foreground/50 mt-1">Required. Workflow definition name or inline YAML.</p>
          </div>
        </CardContent>
      </Card>

      {errorMsg && (
        <Alert variant="destructive" className="ao-fade-in border-destructive/30 bg-destructive/8">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Button onClick={onLaunch} disabled={!definition.trim() || launching}>
        {launching ? "Launching..." : "Launch Custom Workflow"}
      </Button>
    </div>
  );
}

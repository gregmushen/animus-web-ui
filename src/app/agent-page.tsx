import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@/lib/graphql/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DaemonDocument } from "@/lib/graphql/generated/graphql";
import type { DaemonQuery } from "@/lib/graphql/generated/graphql";
import { StatusDot, PageLoading, PageError, SectionHeading } from "./shared";

// NOTE(E-followup): the kernel schema exposes no per-agent phase-output stream
// (only `daemonAgents` session metadata + the `workflowEvents`/`daemonEvents`
// subscriptions), so agent cards show session metadata only. A richer per-agent
// output view requires a transport-graphql schema extension.
type AgentInfo = NonNullable<DaemonQuery["daemonAgents"]>[number];

function useElapsedTime(startedAt: string | null | undefined): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return "";
  const ms = Date.now() - new Date(startedAt).getTime();
  return formatDuration(ms);
}

function formatDuration(ms: number): string {
  if (ms < 0 || Number.isNaN(ms)) return "0s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function AgentCard({ agent }: { agent: AgentInfo }) {
  const elapsed = useElapsedTime(agent.startedAt);

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusDot status="running" />
            <span className="font-mono text-sm text-foreground/80">{agent.sessionId}</span>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5 px-2">{agent.provider}</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Model:</span>
            <span className="font-mono text-foreground/70">{agent.model}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Workflow:</span>
            {agent.workflowId ? (
              <Link to={`/workflows/${agent.workflowId}`} className="text-primary/80 hover:text-primary transition-colors font-mono">
                {agent.workflowId}
              </Link>
            ) : (
              <span className="text-muted-foreground/40">-</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Phase:</span>
            <span className="font-mono text-foreground/70">{agent.phaseId ?? "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-mono text-foreground/70">{elapsed || "-"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentManagementPage() {
  const [result] = useQuery<DaemonQuery>({ query: DaemonDocument });
  const { data, fetching, error } = result;

  if (fetching) return <PageLoading />;
  if (error) return <PageError message={error.message} />;

  const health = data?.daemonHealth;
  const agents = data?.daemonAgents ?? [];

  const overallHealth = agents.length > 0 ? "running" : health?.healthy ? "healthy" : "error";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <span className="text-sm text-muted-foreground/70">
          {agents.length} active
        </span>
        <StatusDot status={overallHealth} />
      </div>

      {agents.length === 0 ? (
        <Card className="border-border/40 bg-card/60">
          <CardContent className="py-12 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-border/40 flex items-center justify-center">
              <span className="text-muted-foreground/40 text-lg">&#x2699;</span>
            </div>
            <p className="text-sm text-muted-foreground">No agents running</p>
            <p className="text-xs text-muted-foreground/50">
              Dispatch a workflow to start an agent.{" "}
              <Link to="/workflows/dispatch/task" className="text-primary/80 hover:text-primary transition-colors underline">
                Go to dispatch
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <SectionHeading>Active Agents</SectionHeading>
          <div className="grid md:grid-cols-2 gap-4">
            {agents.map((a) => (
              <AgentCard key={a.sessionId} agent={a} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <SectionHeading>Daemon</SectionHeading>
        <Card className="border-border/40 bg-card/60">
          <CardContent className="space-y-1 px-4 py-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-mono text-foreground/70">{health?.status ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Healthy</span>
              <span className="font-mono text-foreground/70">
                {health?.healthy ? (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/20 text-primary/70">yes</Badge>
                ) : (
                  "no"
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Running</span>
              <span className="font-mono text-foreground/70">{data?.daemon?.running ? "yes" : "no"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PID</span>
              <span className="font-mono text-foreground/70">{data?.daemon?.pid ?? "-"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

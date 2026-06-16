import { useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useSubscription } from "@/lib/graphql/client";
import { DaemonActivityDocument, DaemonEventsDocument } from "@/lib/graphql/generated/graphql";
import type { DaemonActivityQuery, DaemonEventsSubscription } from "@/lib/graphql/generated/graphql";
import { StatusDot, StatCard } from "./shared";

// Snapshot of active agents + daemon health is still a cheap point-in-time
// query; the live event feed below streams over the `daemonEvents` GraphQL
// subscription (graphql-ws) instead of polling.
const SNAPSHOT_POLL_MS = 5000;
const MAX_EVENTS = 200;

type DaemonEventRow = DaemonEventsSubscription["daemonEvents"];

// Returns a status string that StatusDot recognizes (see shared.tsx).
function eventTone(kind: string): "running" | "error" | "completed" | "idle" {
  const k = kind.toLowerCase();
  if (k.includes("fail") || k.includes("error") || k.includes("crash")) return "error";
  if (k.includes("complete") || k.includes("done") || k.includes("succe")) return "completed";
  if (k.includes("start") || k.includes("phase") || k.includes("run")) return "running";
  return "idle";
}

function summarizePayload(payload: string): string {
  if (!payload) return "";
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed as Record<string, unknown>)
        .filter(([, v]) => v != null && typeof v !== "object")
        .map(([k, v]) => `${k}=${String(v)}`)
        .slice(0, 6)
        .join(" · ");
    }
    return String(parsed);
  } catch {
    return payload.length > 160 ? `${payload.slice(0, 160)}…` : payload;
  }
}

export function EventsPage() {
  const [snapshot, reexecute] = useQuery<DaemonActivityQuery>({ query: DaemonActivityDocument });
  const { data, error: snapshotError } = snapshot;

  // Live event stream over graphql-ws. The handler accumulates incoming
  // events into a capped, newest-first list.
  const [{ data: events, fetching: streaming, error: streamError }] = useSubscription<
    DaemonEventsSubscription,
    DaemonEventRow[]
  >({ query: DaemonEventsDocument }, (prev, next) => {
    const evt = next?.daemonEvents;
    if (!evt) return prev ?? [];
    return [evt, ...(prev ?? [])].slice(0, MAX_EVENTS);
  });

  useEffect(() => {
    const t = setInterval(() => reexecute(), SNAPSHOT_POLL_MS);
    return () => clearInterval(t);
  }, [reexecute]);

  const agents = data?.daemonAgents ?? [];
  const health = data?.daemonHealth;
  const feed = events ?? [];

  const connectionState = streamError
    ? "error"
    : streaming && feed.length === 0
      ? "connecting"
      : "live";

  const eventCount = useMemo(() => feed.length, [feed]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <StatusDot status={connectionState === "live" ? "running" : connectionState === "error" ? "error" : "idle"} />
          <span className="text-[11px] text-muted-foreground/50">{connectionState}</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => reexecute()}>
          Refresh
        </Button>
      </div>

      {connectionState === "error" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 flex items-center gap-2">
          <Badge variant="destructive" className="shrink-0">Stream Error</Badge>
          <span className="text-sm text-muted-foreground">
            Lost the live event subscription. Ensure the daemon and GraphQL transport are running, then reload.
            {streamError ? ` (${streamError.message})` : ""}
          </span>
        </div>
      )}

      {snapshotError && connectionState !== "error" && (
        <div className="rounded-lg border border-border/40 bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
          Snapshot unavailable: {snapshotError.message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Agents" value={agents.length} accent={agents.length > 0} />
        <StatCard label="Daemon" value={health?.status ?? "unknown"} />
        <StatCard label="Health" value={health?.healthy ? "ok" : "degraded"} accent={!health?.healthy} />
        <StatCard label="Events" value={eventCount} accent={eventCount > 0} />
      </div>

      {agents.length > 0 && (
        <Card className="border-border/40 bg-card/60 overflow-hidden">
          <CardContent className="p-0">
            <div className="px-4 pt-3 pb-1 text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Active Agents</div>
            <div className="max-h-[220px] overflow-y-auto">
              {agents.map((a) => (
                <div key={a.sessionId} className="border-b border-border/20 last:border-0 px-4 py-2 hover:bg-accent/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0 font-mono">{a.provider} / {a.model}</Badge>
                    <span className="text-[10px] text-muted-foreground/40 font-mono ml-auto shrink-0">{a.startedAt}</span>
                  </div>
                  <div className="text-[11px] mt-1 text-foreground/60 font-mono">
                    session {a.sessionId}
                    {a.workflowId ? ` · wf ${a.workflowId}` : ""}
                    {a.phaseId ? ` · phase ${a.phaseId}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/40 bg-card/60 overflow-hidden">
        <CardContent className="p-0">
          <div className="px-4 pt-3 pb-1 text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Live Event Stream</div>
          {feed.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {connectionState === "connecting" ? "Connecting to event stream…" : "Waiting for daemon events…"}
            </p>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              {feed.map((e) => {
                const summary = summarizePayload(e.payload);
                return (
                  <div key={`${e.id}-${e.at}`} className="border-b border-border/20 last:border-0 px-4 py-2 hover:bg-accent/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <StatusDot status={eventTone(e.kind)} />
                      <Badge variant="outline" className="text-[10px] shrink-0 font-mono">{e.kind}</Badge>
                      <span className="text-[10px] text-muted-foreground/40 font-mono ml-auto shrink-0">{e.at}</span>
                    </div>
                    {summary && (
                      <div className="text-[11px] mt-1 text-foreground/60 font-mono break-all">{summary}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

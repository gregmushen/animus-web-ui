import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@/lib/graphql/client";
import { DaemonActivityDocument } from "@/lib/graphql/generated/graphql";
import type { DaemonActivityQuery } from "@/lib/graphql/generated/graphql";
import { StatusDot, StatCard } from "./shared";

// TODO(E-followup): richer rendering — the kernel schema currently exposes no
// subscription/event-stream root, so this is a polled view of live agent
// sessions + daemon health rather than a real event feed.
const POLL_MS = 3000;

export function EventsPage() {
  const [result, reexecute] = useQuery<DaemonActivityQuery>({ query: DaemonActivityDocument });
  const { data, fetching, error } = result;

  useEffect(() => {
    const t = setInterval(() => reexecute({ requestPolicy: "network-only" }), POLL_MS);
    return () => clearInterval(t);
  }, [reexecute]);

  const agents = data?.daemonAgents ?? [];
  const health = data?.daemonHealth;

  const connectionState = error
    ? "error"
    : fetching && !data
      ? "connecting"
      : "live";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <StatusDot status={connectionState === "live" ? "running" : connectionState === "error" ? "error" : "idle"} />
          <span className="text-[11px] text-muted-foreground/50">{connectionState}</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => reexecute({ requestPolicy: "network-only" })}>
          Refresh
        </Button>
      </div>

      {connectionState === "error" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 flex items-center gap-2">
          <Badge variant="destructive" className="shrink-0">Connection Error</Badge>
          <span className="text-sm text-muted-foreground">
            Could not reach the daemon. Ensure it is running and reload the page.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Active Agents" value={agents.length} accent={agents.length > 0} />
        <StatCard label="Daemon" value={health?.status ?? "unknown"} />
        <StatCard label="Health" value={health?.healthy ? "ok" : "degraded"} accent={!health?.healthy} />
      </div>

      {agents.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No active agent sessions.</p>
      ) : (
        <Card className="border-border/40 bg-card/60 overflow-hidden">
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
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
    </div>
  );
}

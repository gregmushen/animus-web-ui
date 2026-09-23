import { Link } from "react-router-dom";
import { useQuery } from "@/lib/graphql/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardDocument } from "@/lib/graphql/generated/graphql";
import type { DashboardQuery } from "@/lib/graphql/generated/graphql";
import { StatusDot, PageLoading, PageError, StatCard } from "./shared";

export function DashboardPage() {
  const [result] = useQuery<DashboardQuery>({ query: DashboardDocument });
  const { data, fetching, error } = result;

  if (fetching) return <PageLoading />;
  if (error) return <PageError message={error.message} />;

  const subjects = data?.subject ?? [];
  const health = data?.daemonHealth;
  const daemon = data?.daemon;
  const queue = data?.queueStats;
  const checks = health?.checks ?? [];

  const countStatus = (s: string) => subjects.filter((t) => t.status === s).length;
  const total = subjects.length;
  const inProgress = countStatus("IN_PROGRESS");
  const blocked = countStatus("BLOCKED");
  const ready = countStatus("READY");

  const needsAttention = blocked > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
              <StatusDot status={health?.healthy ? "healthy" : "error"} />
              <span className="text-xs text-muted-foreground">
                {health ? (health.healthy ? "healthy" : "unhealthy") : "unknown"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">
              {daemon?.running ? "Animus daemon" : "no daemon running"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/tasks/new" />}>
          New Task
        </Button>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/workflows/dispatch/task" />}>
          Run Workflow
        </Button>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/queue" />}>
          View Queue
        </Button>
      </div>

      {needsAttention && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-3 pb-3 px-4">
            <p className="text-xs uppercase tracking-wider text-amber-500/80 font-medium mb-2">Attention Required</p>
            <div className="space-y-1">
              <Link to="/tasks?status=BLOCKED" className="flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>{blocked} task{blocked !== 1 ? "s" : ""} blocked</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={total} />
        <StatCard label="In Progress" value={inProgress} accent={inProgress > 0} />
        <StatCard label="Ready" value={ready} />
        <StatCard label="Queue" value={queue?.total ?? 0} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Task Status</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><p className="text-lg font-semibold">{ready}</p><p className="text-[10px] text-muted-foreground">Ready</p></div>
                <div><p className="text-lg font-semibold">{inProgress}</p><p className="text-[10px] text-muted-foreground">In Progress</p></div>
                <div><p className="text-lg font-semibold">{blocked}</p><p className="text-[10px] text-muted-foreground">Blocked</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">System Health</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              <div className="flex items-center gap-2">
                <StatusDot status={health?.healthy ? "healthy" : "error"} />
                <span className="text-sm font-mono">{health ? (health.healthy ? "healthy" : "unhealthy") : "unknown"}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Health checks</span>
                  <span className="font-mono text-foreground/70">{checks.filter((check) => check.healthy).length}/{checks.length} passing</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daemon</span>
                  <span className="font-mono text-foreground/70">
                    {daemon?.running ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-[var(--ao-success-border)] text-[var(--ao-success)]">running</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-border/40 text-muted-foreground/60">stopped</Badge>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Queue ready</span>
                  <span className="font-mono text-foreground/70">{queue?.ready ?? 0}</span>
                </div>
                {daemon?.version && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-mono text-foreground/70">{daemon.version}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

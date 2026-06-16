import { Link } from "react-router-dom";
import { useQuery } from "@/lib/graphql/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const agents = data?.daemonAgents ?? [];
  const daemon = data?.daemon;
  const queue = data?.queueStats;
  const plugins = health?.plugins ?? [];

  const countStatus = (s: string) => subjects.filter((t) => t.status === s).length;
  const total = subjects.length;
  const inProgress = countStatus("IN_PROGRESS");
  const blocked = countStatus("BLOCKED");
  const ready = countStatus("READY");

  // Priority is a 0..4 Int. 3=high, 4=critical.
  const priorityCritical = subjects.filter((t) => t.priority === 4).length;
  const priorityHigh = subjects.filter((t) => t.priority === 3).length;
  const priorityMedium = subjects.filter((t) => t.priority === 2).length;
  const priorityLow = subjects.filter((t) => (t.priority ?? 0) <= 1).length;
  const priorityTotal = priorityCritical + priorityHigh + priorityMedium + priorityLow;

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
                {health?.status ?? "unknown"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">
              {daemon?.projectRoot ?? "no project loaded"}
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
          {agents.length > 0 ? (
            <Card className="border-border/40 bg-card/60 overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Active Agents</CardTitle>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono border-primary/20 text-primary/70">
                    {agents.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase tracking-wider h-7">Session</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider h-7">Provider</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider h-7">Phase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((a) => (
                      <TableRow key={a.sessionId} className="border-border/20 hover:bg-accent/30">
                        <TableCell className="font-mono text-[11px] text-muted-foreground py-2">{a.sessionId}</TableCell>
                        <TableCell className="text-[11px] py-2">{a.provider} / {a.model}</TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground py-2">
                          {a.workflowId ? (
                            <Link to={`/workflows/${a.workflowId}`} className="text-primary/80 hover:text-primary transition-colors">
                              {a.phaseId ?? a.workflowId}
                            </Link>
                          ) : (a.phaseId ?? "-")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Activity</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <p className="text-sm text-muted-foreground/60">No agents running</p>
                  <p className="text-xs text-muted-foreground/40">Start a workflow to see agent activity here</p>
                </div>
              </CardContent>
            </Card>
          )}

          {priorityTotal > 0 && (
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="flex h-2 rounded-full overflow-hidden bg-muted/20">
                  {priorityCritical > 0 && (
                    <div className="bg-destructive transition-all" style={{ width: `${(priorityCritical / priorityTotal) * 100}%` }} title={`Critical: ${priorityCritical}`} />
                  )}
                  {priorityHigh > 0 && (
                    <div className="bg-[var(--ao-amber)] transition-all" style={{ width: `${(priorityHigh / priorityTotal) * 100}%` }} title={`High: ${priorityHigh}`} />
                  )}
                  {priorityMedium > 0 && (
                    <div className="bg-muted-foreground/40 transition-all" style={{ width: `${(priorityMedium / priorityTotal) * 100}%` }} title={`Medium: ${priorityMedium}`} />
                  )}
                  {priorityLow > 0 && (
                    <div className="bg-border transition-all" style={{ width: `${(priorityLow / priorityTotal) * 100}%` }} title={`Low: ${priorityLow}`} />
                  )}
                </div>
                <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                  {priorityCritical > 0 && (
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-destructive" />{priorityCritical} critical</span>
                  )}
                  {priorityHigh > 0 && (
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[var(--ao-amber)]" />{priorityHigh} high</span>
                  )}
                  {priorityMedium > 0 && (
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />{priorityMedium} medium</span>
                  )}
                  {priorityLow > 0 && (
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-border" />{priorityLow} low</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">System Health</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              <div className="flex items-center gap-2">
                <StatusDot status={health?.healthy ? "healthy" : "error"} />
                <span className="text-sm font-mono">{health?.status ?? "unknown"}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agents</span>
                  <span className="font-mono text-foreground/70">{agents.length} active</span>
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
                  <span className="text-muted-foreground">Plugins</span>
                  <span className="font-mono text-foreground/70">{plugins.length}</span>
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

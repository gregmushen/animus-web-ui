import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation } from "@/lib/graphql/client";
import { DaemonDocument, StartDaemonDocument } from "@/lib/graphql/generated/graphql";
import type { DaemonQuery } from "@/lib/graphql/generated/graphql";
import { StatusDot, PageLoading, PageError, SectionHeading } from "./shared";

// NOTE(E-followup): the kernel GraphQL schema (animus-protocol v0.5.12)
// exposes ONLY `startDaemon` on MutationRoot — `daemon/stop` and
// `daemon/restart` are intentionally forbidden over the control socket, and
// there are no `pauseDaemon`/`resumeDaemon` mutations or a `daemonLogs` query.
// (Pause/resume live on workflows: see `pauseWorkflow`/`resumeWorkflow`, wired
// on the workflow detail page.) So this page surfaces status + a Start action
// only; a logs panel / pause-resume controls require a transport-graphql
// schema extension before they can be wired.
export function DaemonPage() {
  const [result, reexecute] = useQuery<DaemonQuery>({ query: DaemonDocument });
  const [, startMut] = useMutation(StartDaemonDocument);
  const { data, fetching, error } = result;
  if (fetching) return <PageLoading />;
  if (error) return <PageError message={error.message} />;

  const status = data?.daemon;
  const health = data?.daemonHealth;
  const agents = data?.daemonAgents ?? [];
  const plugins = health?.plugins ?? [];

  const runStart = async () => {
    const { error: err } = await startMut({});
    if (err) toast.error(err.message);
    else {
      toast.success("Daemon start requested.");
      reexecute({ requestPolicy: "network-only" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Daemon</h1>
          <StatusDot status={health?.healthy ? "healthy" : "error"} />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={runStart}>Start</Button>
        </div>
      </div>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Status</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={status?.running ? "default" : "destructive"}>
              {status?.running ? "running" : "stopped"}
            </Badge>
            {health?.status && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/20 text-primary/70">
                {health.status}
              </Badge>
            )}
            {status?.version && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">v{status.version}</Badge>
            )}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Agents: <span className="font-mono text-foreground/70">{agents.length}</span></span>
            {status?.uptimeSeconds != null && (
              <span>Uptime: <span className="font-mono text-foreground/70">{status.uptimeSeconds}s</span></span>
            )}
            {status?.projectRoot && <span className="truncate">Root: <span className="font-mono text-foreground/70">{status.projectRoot}</span></span>}
          </div>
          {health?.lastError && (
            <p className="text-xs text-destructive font-mono">{health.lastError}</p>
          )}
        </CardContent>
      </Card>

      {plugins.length > 0 && (
        <div className="space-y-2">
          <SectionHeading>Plugins</SectionHeading>
          <Card className="border-border/40 bg-card/60 overflow-hidden">
            <CardContent className="px-0 pb-0 pt-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-wider h-7">Name</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider h-7">Kind</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider h-7">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plugins.map((p) => (
                    <TableRow key={p.name} className="border-border/20 hover:bg-accent/30">
                      <TableCell className="font-mono text-[11px] py-2">{p.name}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground py-2">{p.kind}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          <StatusDot status={p.status} />
                          <span className="text-[11px]">{p.status}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {agents.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionHeading>Active Agents</SectionHeading>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono border-primary/20 text-primary/70">{agents.length}</Badge>
          </div>
          <Card className="border-border/40 bg-card/60 overflow-hidden">
            <CardContent className="px-0 pb-0 pt-0">
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
                      <TableCell className="font-mono text-[11px] text-muted-foreground py-2">{a.phaseId ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

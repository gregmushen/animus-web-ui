import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@/lib/graphql/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkflowsDocument, WorkflowStatus } from "@/lib/graphql/generated/graphql";
import type { WorkflowsQuery } from "@/lib/graphql/generated/graphql";
import { statusColor, PageLoading, PageError } from "./shared";

type TimeRange = "24h" | "7d" | "30d" | "all";
type StatusFilter = "all" | "completed" | "failed" | "running";

type HistoryEntry = {
  id: string;
  timestamp: string;
  status: WorkflowStatus;
  description: string;
  workflowId: string;
  subjectId?: string | null;
};

const PAGE_SIZE = 10;

function timeMs(range: TimeRange): number {
  if (range === "24h") return 24 * 60 * 60_000;
  if (range === "7d") return 7 * 24 * 60 * 60_000;
  if (range === "30d") return 30 * 24 * 60 * 60_000;
  return Infinity;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function workflowStatusToFilter(status: WorkflowStatus): StatusFilter {
  if (status === WorkflowStatus.Completed) return "completed";
  if (status === WorkflowStatus.Failed || status === WorkflowStatus.Cancelled) return "failed";
  if (status === WorkflowStatus.Running) return "running";
  return "all";
}

export function HistoryPage() {
  const [workflowResult] = useQuery<WorkflowsQuery>({ query: WorkflowsDocument, variables: {} });
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);

  const fetching = workflowResult.fetching;
  const error = workflowResult.error;

  const entries = useMemo<HistoryEntry[]>(() => {
    const items: HistoryEntry[] = [];
    const cutoff = timeRange === "all" ? 0 : Date.now() - timeMs(timeRange);

    const workflows = workflowResult.data?.workflows ?? [];
    for (const wf of workflows) {
      const ts = wf.finishedAt ?? wf.startedAt ?? "";
      if (ts && new Date(ts).getTime() < cutoff) continue;

      items.push({
        id: `wf-${wf.id}`,
        timestamp: ts,
        status: wf.status,
        description: `${wf.definition} — ${wf.id}`,
        workflowId: wf.id,
        subjectId: wf.subjectId,
      });
    }

    items.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime() || 0;
      const tb = new Date(b.timestamp).getTime() || 0;
      return tb - ta;
    });

    return items;
  }, [workflowResult.data, timeRange]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return entries;
    return entries.filter((e) => workflowStatusToFilter(e.status) === statusFilter);
  }, [entries, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageEntries = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (fetching) return <PageLoading />;
  if (error) return <PageError message={error.message} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Workflow execution history
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground/50 uppercase tracking-wider mr-1">Range</span>
          {(["24h", "7d", "30d", "all"] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              variant="ghost"
              className={`text-xs h-7 px-2.5 ${
                timeRange === r
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  : "bg-accent/50 text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => { setTimeRange(r); setPage(0); }}
            >
              {r === "all" ? "All" : `Last ${r}`}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground/50 uppercase tracking-wider mr-1">Status</span>
          {(["all", "completed", "failed", "running"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant="ghost"
              className={`text-xs h-7 px-2.5 capitalize ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  : "bg-accent/50 text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => { setStatusFilter(s); setPage(0); }}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/40">
        {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
      </p>

      {pageEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No history entries found.</p>
      ) : (
        <div className="relative pl-5">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/40" />

          <div className="space-y-1">
            {pageEntries.map((entry) => (
              <div key={entry.id} className="relative">
                <div className="absolute left-[-17px] top-3.5 h-2.5 w-2.5 rounded-full border-2 border-border/60 bg-background" />

                <Card className="border-border/40 bg-card/60 ml-1">
                  <CardContent className="pt-3 pb-3 px-4 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusColor(entry.status.toLowerCase())} className="text-[10px] shrink-0">
                        {entry.status}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto shrink-0">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm text-foreground/80">{entry.description}</p>

                    <div className="flex items-center gap-3 text-[11px]">
                      <Link
                        to={`/workflows/${entry.workflowId}`}
                        className="text-primary/80 hover:text-primary transition-colors"
                      >
                        {entry.workflowId}
                      </Link>
                      {entry.subjectId && (
                        <Link
                          to={`/tasks/${entry.subjectId}`}
                          className="text-primary/80 hover:text-primary transition-colors"
                        >
                          {entry.subjectId}
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-[11px] text-muted-foreground/50 font-mono">
            {page + 1} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

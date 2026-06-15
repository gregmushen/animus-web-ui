import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@/lib/graphql/client";
import { toast } from "sonner";
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
import {
  QueueDocument,
  HoldQueueDocument,
  ReleaseQueueDocument,
  ReorderQueueDocument,
} from "@/lib/graphql/generated/graphql";
import type { QueueQuery } from "@/lib/graphql/generated/graphql";
import { priorityColor, StatusDot, PageLoading, PageError, StatCard } from "./shared";
import { ArrowUp, ArrowDown, Pause, Play, ArrowUpDown, RefreshCw, Layers, GripVertical } from "lucide-react";

const PRIORITY_LABELS = ["none", "low", "medium", "high", "critical"];
function priorityLabel(p: number | null | undefined): string {
  return PRIORITY_LABELS[p ?? 2] ?? "medium";
}

export function QueuePage() {
  const [result, reexecute] = useQuery<QueueQuery>({ query: QueueDocument });
  const [, holdMut] = useMutation(HoldQueueDocument);
  const [, releaseMut] = useMutation(ReleaseQueueDocument);
  const [, reorderMut] = useMutation(ReorderQueueDocument);
  const { data, fetching, error } = result;
  const dragSrcIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (fetching) return <PageLoading />;
  if (error) return <PageError message={error.message} />;

  const entries = data?.queue ?? [];
  const stats = data?.queueStats;

  const heldCount = stats?.held ?? 0;
  const readyCount = stats?.ready ?? 0;

  const onHold = async (id: string, taskId: string) => {
    const { error: err } = await holdMut({ id });
    if (err) toast.error(err.message);
    else {
      toast.success(`Held ${taskId}.`);
      reexecute({ requestPolicy: "network-only" });
    }
  };

  const onRelease = async (id: string, taskId: string) => {
    const { error: err } = await releaseMut({ id });
    if (err) toast.error(err.message);
    else {
      toast.success(`Released ${taskId}.`);
      reexecute({ requestPolicy: "network-only" });
    }
  };

  // reorderQueue moves the given ids as a contiguous group to the front.
  const moveToFront = async (id: string) => {
    const { error: err } = await reorderMut({ ids: [id], front: true });
    if (err) toast.error(err.message);
    else reexecute({ requestPolicy: "network-only" });
  };

  const moveToBack = async (id: string) => {
    const { error: err } = await reorderMut({ ids: [id], front: false });
    if (err) toast.error(err.message);
    else reexecute({ requestPolicy: "network-only" });
  };

  const onDragStart = (index: number) => {
    dragSrcIndex.current = index;
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const onDrop = async (targetIndex: number) => {
    const srcIndex = dragSrcIndex.current;
    dragSrcIndex.current = null;
    setDragOverIndex(null);
    if (srcIndex === null || srcIndex === targetIndex) return;
    // Move the dragged entry toward front if it moved up, back otherwise.
    const moved = entries[srcIndex];
    const { error: err } = await reorderMut({ ids: [moved.id], front: targetIndex < srcIndex });
    if (err) toast.error(err.message);
    else reexecute({ requestPolicy: "network-only" });
  };

  const onDragEnd = () => {
    dragSrcIndex.current = null;
    setDragOverIndex(null);
  };

  const sortByPriority = async () => {
    const sorted = [...entries].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    const { error: err } = await reorderMut({ ids: sorted.map((e) => e.id), front: true });
    if (err) toast.error(err.message);
    else {
      toast.success("Queue reordered by priority.");
      reexecute({ requestPolicy: "network-only" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Dispatch Queue</h1>
            <StatusDot status={entries.length > 0 ? "running" : "idle"} />
            <span className="text-xs text-muted-foreground">
              {entries.length > 0 ? `${entries.length} enqueued` : "idle"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Task execution order and hold management
          </p>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 1 && (
            <Button size="sm" variant="outline" onClick={sortByPriority} className="h-7 text-xs gap-1.5">
              <ArrowUpDown className="h-3 w-3" />
              Sort by Priority
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => reexecute({ requestPolicy: "network-only" })}
            className="h-7 w-7 p-0"
            aria-label="Refresh queue"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats?.total ?? 0} accent={(stats?.total ?? 0) > 0} />
        <StatCard label="Ready" value={readyCount} />
        <StatCard label="Held" value={heldCount} accent={heldCount > 0} />
        <StatCard label="In Flight" value={stats?.inFlight ?? 0} />
        <StatCard label="Done" value={stats?.doneRecent ?? 0} />
      </div>

      {heldCount > 0 && (
        <Card className="border-[var(--ao-amber-border)] bg-[var(--ao-amber-bg)]">
          <CardContent className="pt-3 pb-3 px-4">
            <p className="text-xs uppercase tracking-wider text-[var(--ao-amber)] font-medium mb-1">Held Tasks</p>
            <p className="text-sm text-foreground/70">
              {heldCount} task{heldCount !== 1 ? "s" : ""} paused in queue. Release to resume processing.
            </p>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Card className="border-border/40 bg-card/60">
          <CardContent className="px-4 pb-4 pt-4">
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-center">
                <Layers className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground/60">Queue is empty</p>
                <p className="text-xs text-muted-foreground/40 mt-1">Tasks will appear here when workflows are dispatched</p>
              </div>
              <Button variant="outline" size="sm" asChild className="mt-2">
                <Link to="/workflows/dispatch/task">Dispatch Workflow</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/40 bg-card/60 overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Queue Entries</CardTitle>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono border-primary/20 text-primary/70">
                {entries.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider h-7 w-8" />
                  <TableHead className="text-[10px] uppercase tracking-wider h-7 w-12 text-center">#</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-7">Task</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-7">Priority</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-7">State</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-7">Enqueued</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-7 text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, i) => {
                  const held = entry.held;
                  return (
                    <TableRow
                      key={entry.id}
                      draggable
                      onDragStart={() => onDragStart(i)}
                      onDragOver={(e) => onDragOver(e, i)}
                      onDrop={() => onDrop(i)}
                      onDragEnd={onDragEnd}
                      className={`border-border/20 transition-colors cursor-grab active:cursor-grabbing ${
                        dragOverIndex === i ? "border-t-2 border-t-primary" : ""
                      } ${
                        held
                          ? "bg-[var(--ao-amber-bg)] hover:bg-[var(--ao-amber-bg)]"
                          : i === 0
                            ? "bg-primary/[0.03] hover:bg-primary/[0.06]"
                            : "hover:bg-accent/30"
                      }`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <TableCell className="text-center py-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-mono font-medium ${
                          i === 0
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : held
                              ? "bg-[var(--ao-amber-bg)] text-[var(--ao-amber)] border border-[var(--ao-amber-border)]"
                              : "text-muted-foreground/50"
                        }`}>
                          {i + 1}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <Link to={`/tasks/${entry.taskId}`} className="text-primary/80 hover:text-primary text-xs font-mono transition-colors">
                          {entry.taskId}
                        </Link>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant={priorityColor(priorityLabel(entry.priority))} className="text-[10px] h-4 px-1.5">{priorityLabel(entry.priority)}</Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          <StatusDot status={entry.state} />
                          <span className="text-[11px]">{entry.state}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-[11px] font-mono text-muted-foreground">{entry.enqueuedAt}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-foreground"
                            onClick={() => moveToFront(entry.id)}
                            disabled={i === 0}
                            aria-label={`Move ${entry.taskId} to front`}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-foreground"
                            onClick={() => moveToBack(entry.id)}
                            disabled={i === entries.length - 1}
                            aria-label={`Move ${entry.taskId} to back`}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          {held ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] gap-1 border-[var(--ao-success-border)] text-[var(--ao-success)] hover:bg-[var(--ao-success-bg)]"
                              onClick={() => onRelease(entry.id, entry.taskId)}
                            >
                              <Play className="h-2.5 w-2.5" />
                              Release
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] gap-1 border-[var(--ao-amber-border)] text-[var(--ao-amber)] hover:bg-[var(--ao-amber-bg)]"
                              onClick={() => onHold(entry.id, entry.taskId)}
                            >
                              <Pause className="h-2.5 w-2.5" />
                              Hold
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

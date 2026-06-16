import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@/lib/graphql/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { statusColor, PageLoading, PageError } from "./shared";
import { WorkflowDetailView } from "./workflow-pages";

// The kernel no longer exposes a per-phase output stream, so we surface the
// workflow `detail` JSON blob. It is now parsed into a structured phase /
// decision / checkpoint view (shared `WorkflowDetailView`) with a raw-text
// fallback that still supports search + copy.
const SUBJECT_QUERY = `query SubjectTitle($id: ID!) { subjectById(id: $id) { id title status } }`;
const WORKFLOWS_QUERY = `query OutputWorkflows { workflows { id definition status subjectId } }`;
const WORKFLOW_DETAIL_QUERY = `query OutputWorkflowDetail($id: ID!) { workflow(id: $id) { id definition status subjectId startedAt finishedAt detail } }`;

type SubjectData = { subjectById: { id: string; title: string; status: string } | null };
type WorkflowRow = { id: string; definition: string; status: string; subjectId: string | null };
type WorkflowsData = { workflows: WorkflowRow[] };
type WorkflowDetailData = { workflow: { id: string; definition: string; status: string; subjectId: string | null; startedAt: string; finishedAt: string | null; detail: string | null } };

export function TaskOutputPage() {
  const { taskId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"structured" | "raw">("structured");

  const [subjectResult] = useQuery<SubjectData>({ query: SUBJECT_QUERY, variables: { id: taskId! } });
  const [workflowsResult] = useQuery<WorkflowsData>({ query: WORKFLOWS_QUERY });

  const subject = subjectResult.data?.subjectById;
  const workflows = workflowsResult.data?.workflows ?? [];
  const workflow = workflows.find((w) => w.subjectId === taskId);

  const [detailResult] = useQuery<WorkflowDetailData>({
    query: WORKFLOW_DETAIL_QUERY,
    variables: { id: workflow?.id ?? "" },
    pause: !workflow,
  });

  const rawDetail = detailResult.data?.workflow?.detail ?? null;

  const parsedDetail = useMemo<unknown>(() => {
    if (!rawDetail) return null;
    try {
      return JSON.parse(rawDetail);
    } catch {
      return null;
    }
  }, [rawDetail]);

  const detailText = useMemo(() => {
    if (!rawDetail) return "";
    return parsedDetail != null ? JSON.stringify(parsedDetail, null, 2) : rawDetail;
  }, [rawDetail, parsedDetail]);

  const filteredText = useMemo(() => {
    if (!searchTerm) return detailText;
    const lower = searchTerm.toLowerCase();
    return detailText
      .split("\n")
      .filter((l) => l.toLowerCase().includes(lower))
      .join("\n");
  }, [detailText, searchTerm]);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(detailText);
    } catch {
      /* clipboard not available */
    }
  };

  if (subjectResult.fetching || workflowsResult.fetching) return <PageLoading />;
  if (subjectResult.error) return <PageError message={subjectResult.error.message} />;
  if (workflowsResult.error) return <PageError message={workflowsResult.error.message} />;
  if (!subject) return <PageError message={`Subject ${taskId} not found.`} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/tasks/${taskId}`} className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors">
            &larr; Back to task
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Output for {subject.id}</h1>
          <p className="text-sm text-muted-foreground/70 mt-0.5">{subject.title}</p>
        </div>
        <div className="flex items-center gap-2">
          {workflow && <Badge variant={statusColor(workflow.status.toLowerCase())}>{workflow.status}</Badge>}
        </div>
      </div>

      {!workflow ? (
        <Card className="border-border/40 bg-card/60">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground/60">No workflow found for this subject.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={view === "structured" ? "secondary" : "ghost"}
                className="h-7 text-xs"
                onClick={() => setView("structured")}
              >
                Phases
              </Button>
              <Button
                size="sm"
                variant={view === "raw" ? "secondary" : "ghost"}
                className="h-7 text-xs"
                onClick={() => setView("raw")}
              >
                Raw
              </Button>
            </div>
            {view === "raw" && (
              <Input
                placeholder="Search output..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            )}
            <Button size="sm" variant="outline" onClick={copyAll} className="ml-auto">
              Copy All
            </Button>
          </div>

          <Card className="border-border/40 bg-card/60">
            <CardContent className="px-4 pb-3 pt-3">
              {detailResult.fetching && <p className="text-xs text-muted-foreground/50">Loading output...</p>}
              {detailResult.error && <p className="text-xs text-destructive">{detailResult.error.message}</p>}
              {!detailResult.fetching && !detailResult.error && !rawDetail && (
                <p className="text-xs text-muted-foreground/50">No run detail available yet.</p>
              )}
              {!detailResult.fetching && !detailResult.error && rawDetail && view === "structured" && (
                <WorkflowDetailView detail={parsedDetail ?? rawDetail} />
              )}
              {!detailResult.fetching && !detailResult.error && rawDetail && view === "raw" && (
                filteredText.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50">
                    {searchTerm ? "No matching lines." : "No run detail available yet."}
                  </p>
                ) : (
                  <pre data-output-pre className="font-mono text-[11px] text-foreground/70 bg-background/50 rounded-md p-3 overflow-x-auto max-h-[600px] overflow-y-auto whitespace-pre-wrap break-words">
                    {filteredText}
                  </pre>
                )
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

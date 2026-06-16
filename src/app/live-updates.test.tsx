// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock("@/lib/graphql/client", async () => {
  const actual = await vi.importActual("@/lib/graphql/client");
  return {
    ...actual,
    useQuery: mocks.useQuery,
    useMutation: mocks.useMutation,
    useSubscription: mocks.useSubscription,
  };
});

vi.mock("@/lib/graphql/provider", () => ({
  GraphQLProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { WorkflowDetailPage } from "./workflow-pages";
import { TasksPage } from "./tasks-pages";
import { TaskOutputPage } from "./output-page";

function renderAt(path: string, route: string, element: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.useQuery.mockReset();
  mocks.useMutation.mockReset();
  mocks.useSubscription.mockReset();
  mocks.useMutation.mockReturnValue([{ fetching: false }, vi.fn().mockResolvedValue({ data: {} })]);
  // Default: subscription yields no data unless a test overrides it.
  mocks.useSubscription.mockReturnValue([{ data: undefined, fetching: false, error: undefined }]);
});

describe("WorkflowDetailPage live updates", () => {
  const baseWorkflow = {
    id: "WF-1",
    definition: "default",
    status: "RUNNING",
    subjectId: "TASK-1",
    startedAt: "2026-06-15T00:00:00Z",
    finishedAt: null,
    detail: JSON.stringify({ status: "RUNNING", phases: [{ phase_id: "impl", status: "running" }] }),
  };

  it("subscribes to workflowEvents for the active workflow id and shows a live indicator", () => {
    mocks.useQuery.mockReturnValue([
      { data: { workflow: baseWorkflow }, fetching: false, error: null },
      vi.fn(),
    ]);

    renderAt("/workflows/WF-1", "/workflows/:workflowId", <WorkflowDetailPage />);

    expect(mocks.useSubscription).toHaveBeenCalled();
    const [opts] = mocks.useSubscription.mock.calls[0];
    expect(opts.variables).toEqual({ workflowId: "WF-1" });
    expect(opts.pause).toBe(false); // running -> subscribed
    expect(screen.getByText("live")).toBeTruthy();
    // Structured phase renders.
    expect(screen.getByText("impl")).toBeTruthy();
  });

  it("pauses the subscription once the run is terminal", () => {
    mocks.useQuery.mockReturnValue([
      { data: { workflow: { ...baseWorkflow, status: "COMPLETED", finishedAt: "2026-06-15T01:00:00Z" } }, fetching: false, error: null },
      vi.fn(),
    ]);

    renderAt("/workflows/WF-1", "/workflows/:workflowId", <WorkflowDetailPage />);

    const [opts] = mocks.useSubscription.mock.calls[0];
    expect(opts.pause).toBe(true);
    expect(screen.queryByText("live")).toBeNull();
  });

  it("refetches workflow detail when a live event arrives", async () => {
    const reexecute = vi.fn();
    mocks.useQuery.mockReturnValue([
      { data: { workflow: baseWorkflow }, fetching: false, error: null },
      reexecute,
    ]);
    // Simulate the subscription having already delivered one event. We compute
    // the handler's output ONCE (mirroring a single ws message) and return a
    // stable reference on every render so the component's refetch effect runs
    // once, not on a render loop.
    const next = { workflowEvents: { workflowId: "WF-1", kind: "phase_completed", payload: "{}", at: "t" } };
    let delivered: unknown;
    mocks.useSubscription.mockImplementation((_opts: unknown, handler?: (p: unknown, n: unknown) => unknown) => {
      if (delivered === undefined) delivered = handler ? handler(undefined, next) : next;
      return [{ data: delivered, fetching: false, error: undefined }];
    });

    renderAt("/workflows/WF-1", "/workflows/:workflowId", <WorkflowDetailPage />);

    await waitFor(() => expect(reexecute).toHaveBeenCalled());
    expect(screen.getByText(/last event: phase_completed/)).toBeTruthy();
  });
});

describe("TaskOutputPage structured rendering", () => {
  it("renders workflow detail phases in a structured view by default", () => {
    mocks.useQuery.mockImplementation((opts: { query: unknown }) => {
      const q = String(opts.query);
      if (q.includes("subjectById")) {
        return [{ data: { subjectById: { id: "TASK-1", title: "A task", status: "READY" } }, fetching: false, error: null }, vi.fn()];
      }
      if (q.includes("workflows")) {
        return [{ data: { workflows: [{ id: "WF-1", definition: "default", status: "RUNNING", subjectId: "TASK-1" }] }, fetching: false, error: null }, vi.fn()];
      }
      // workflow detail
      return [
        {
          data: { workflow: { id: "WF-1", definition: "default", status: "RUNNING", subjectId: "TASK-1", startedAt: "t", finishedAt: null, detail: JSON.stringify({ phases: [{ phase_id: "impl", status: "running" }] }) } },
          fetching: false,
          error: null,
        },
        vi.fn(),
      ];
    });

    renderAt("/tasks/TASK-1/output", "/tasks/:taskId/output", <TaskOutputPage />);

    expect(screen.getByText("Phases")).toBeTruthy(); // view toggle
    expect(screen.getByText("impl")).toBeTruthy(); // structured phase row
  });
});

describe("TasksPage live updates", () => {
  it("subscribes to subjectChanged for the kind and refetches on change", async () => {
    const reexecute = vi.fn();
    mocks.useQuery.mockReturnValue([
      { data: { subject: [] }, fetching: false, error: null },
      reexecute,
    ]);
    const next = { subjectChanged: { subjectId: "TASK-1", change: "updated", at: "t" } };
    let delivered: unknown;
    mocks.useSubscription.mockImplementation((_opts: unknown, handler?: (p: unknown, n: unknown) => unknown) => {
      if (delivered === undefined) delivered = handler ? handler(undefined, next) : next;
      return [{ data: delivered, fetching: false, error: undefined }];
    });

    renderAt("/tasks", "/tasks", <TasksPage kind="task" />);

    const [opts] = mocks.useSubscription.mock.calls[0];
    expect(opts.variables).toEqual({ kind: "task" });
    await waitFor(() => expect(reexecute).toHaveBeenCalled());
  });
});

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("@/lib/graphql/client", async () => {
  const actual = await vi.importActual("@/lib/graphql/client");
  return {
    ...actual,
    useQuery: mocks.useQuery,
    useMutation: mocks.useMutation,
  };
});

vi.mock("@/lib/graphql/provider", () => ({
  GraphQLProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { TasksPage } from "./tasks-pages";
import { WorkflowsPage } from "./workflow-pages";

function renderInRouter(element: ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

describe("task and workflow control center", () => {
  let executeMutation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    executeMutation = vi.fn().mockResolvedValue({ data: {} });
    mocks.useMutation.mockReturnValue([{ fetching: false }, executeMutation]);
  });

  it("renders subjects list from GraphQL query results", () => {
    mocks.useQuery.mockReturnValue([
      {
        data: {
          subject: [
            {
              id: "TASK-001",
              kind: "task",
              title: "Build web UI",
              description: null,
              status: "IN_PROGRESS",
              nativeStatus: null,
              priority: 3,
              assignee: null,
              labels: [],
              parent: null,
              children: [],
              url: null,
              createdAt: "2026-06-15T00:00:00Z",
              updatedAt: "2026-06-15T00:00:00Z",
            },
          ],
        },
        fetching: false,
        error: null,
      },
      vi.fn(),
    ]);

    renderInRouter(<TasksPage />);

    expect(screen.getByText("Tasks")).toBeTruthy();
    expect(screen.getByText("TASK-001")).toBeTruthy();
    expect(screen.getByText("Build web UI")).toBeTruthy();
  });

  it("shows empty state when no subjects match filters", () => {
    mocks.useQuery.mockReturnValue([
      { data: { subject: [] }, fetching: false, error: null },
      vi.fn(),
    ]);

    renderInRouter(<TasksPage />);

    expect(screen.getByText("No tasks match filters.")).toBeTruthy();
  });

  it("renders workflows command center with active workflows", () => {
    mocks.useQuery.mockReturnValue([
      {
        data: {
          workflows: [
            {
              id: "wf-1",
              definition: "standard",
              status: "RUNNING",
              subjectId: "TASK-014",
              startedAt: "2026-06-15T05:00:00Z",
              finishedAt: null,
            },
          ],
        },
        fetching: false,
        error: null,
      },
      vi.fn(),
    ]);

    renderInRouter(<WorkflowsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Workflows" })).toBeTruthy();
    expect(screen.getAllByText("TASK-014").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "New Workflow" }).length).toBeGreaterThan(0);
  });

  it("shows empty state when no workflows exist", () => {
    mocks.useQuery.mockReturnValue([
      { data: { workflows: [] }, fetching: false, error: null },
      vi.fn(),
    ]);

    renderInRouter(<WorkflowsPage />);

    expect(screen.getByText("No workflows yet")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "New Workflow" }).length).toBeGreaterThan(0);
  });

  it("shows stat cards with workflow counts", () => {
    mocks.useQuery.mockReturnValue([
      {
        data: {
          workflows: [
            { id: "wf-1", definition: "standard", status: "RUNNING", subjectId: "TASK-1", startedAt: "2026-06-15T00:00:00Z", finishedAt: null },
            { id: "wf-2", definition: "standard", status: "COMPLETED", subjectId: "TASK-2", startedAt: "2026-06-15T00:00:00Z", finishedAt: "2026-06-15T01:00:00Z" },
          ],
        },
        fetching: false,
        error: null,
      },
      vi.fn(),
    ]);

    renderInRouter(<WorkflowsPage />);

    expect(screen.getAllByText("Running").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
  });
});

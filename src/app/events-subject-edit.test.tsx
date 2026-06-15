// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
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

import { EventsPage } from "./events-page";
import { TaskDetailPage } from "./tasks-pages";

function renderAt(path: string, element: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/tasks/:taskId" element={element} />
        <Route path="/events" element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("events page live subscription", () => {
  beforeEach(() => {
    mocks.useQuery.mockReturnValue([
      { data: { daemonAgents: [], daemonHealth: { healthy: true, status: "HEALTHY", lastError: null } }, fetching: false, error: null },
      vi.fn(),
    ]);
  });

  it("renders streamed daemon events from the subscription", () => {
    mocks.useSubscription.mockReturnValue([
      {
        data: [
          { id: "evt-1", kind: "phase_started", payload: '{"phase":"impl"}', at: "2026-06-15T05:00:00Z" },
          { id: "evt-2", kind: "workflow_failed", payload: '{"reason":"boom"}', at: "2026-06-15T05:01:00Z" },
        ],
        fetching: false,
        error: undefined,
      },
    ]);

    renderAt("/events", <EventsPage />);

    expect(screen.getByText("Live Event Stream")).toBeTruthy();
    expect(screen.getByText("phase_started")).toBeTruthy();
    expect(screen.getByText("workflow_failed")).toBeTruthy();
    expect(screen.getByText(/phase=impl/)).toBeTruthy();
  });

  it("shows a connecting state before the first event arrives", () => {
    mocks.useSubscription.mockReturnValue([{ data: [], fetching: true, error: undefined }]);
    renderAt("/events", <EventsPage />);
    expect(screen.getByText(/Connecting to event stream/)).toBeTruthy();
  });

  it("surfaces a stream error", () => {
    mocks.useSubscription.mockReturnValue([{ data: [], fetching: false, error: { message: "ws down" } }]);
    renderAt("/events", <EventsPage />);
    expect(screen.getByText("Stream Error")).toBeTruthy();
    expect(screen.getByText(/ws down/)).toBeTruthy();
  });
});

describe("subject detail edit form", () => {
  const subject = {
    id: "TASK-100",
    kind: "task",
    title: "Editable subject",
    description: null,
    status: "READY",
    nativeStatus: null,
    statusMetadata: null,
    priority: 2,
    assignee: "alice",
    labels: ["bug"],
    parent: null,
    children: [],
    url: null,
    createdAt: "2026-06-15T00:00:00Z",
    updatedAt: "2026-06-15T00:00:00Z",
    custom: null,
    attachments: [],
  };

  let executeMutation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mocks.useSubscription.mockReturnValue([{ data: [], fetching: false, error: undefined }]);
    mocks.useQuery.mockReturnValue([
      { data: { subjectById: subject }, fetching: false, error: null },
      vi.fn(),
    ]);
    executeMutation = vi.fn().mockResolvedValue({ data: {} });
    mocks.useMutation.mockReturnValue([{ fetching: false }, executeMutation]);
  });

  it("renders the assignee value and existing labels", () => {
    renderAt("/tasks/TASK-100", <TaskDetailPage />);
    expect((screen.getByDisplayValue("alice") as HTMLInputElement).value).toBe("alice");
    expect(screen.getByTitle("Remove label").textContent).toContain("bug");
  });

  it("calls updateSubject with the new assignee", async () => {
    renderAt("/tasks/TASK-100", <TaskDetailPage />);
    const input = screen.getByDisplayValue("alice");
    fireEvent.change(input, { target: { value: "bob" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(executeMutation).toHaveBeenCalledWith({ input: { id: "TASK-100", assignee: "bob" } });
  });

  it("calls updateSubject with labelsAdd when adding a label", () => {
    renderAt("/tasks/TASK-100", <TaskDetailPage />);
    const input = screen.getByPlaceholderText("Add label...");
    fireEvent.change(input, { target: { value: "urgent" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(executeMutation).toHaveBeenCalledWith({ input: { id: "TASK-100", labelsAdd: ["urgent"] } });
  });

  it("calls updateSubject with labelsRemove when removing a label", () => {
    renderAt("/tasks/TASK-100", <TaskDetailPage />);
    fireEvent.click(screen.getByTitle("Remove label"));
    expect(executeMutation).toHaveBeenCalledWith({ input: { id: "TASK-100", labelsRemove: ["bug"] } });
  });
});

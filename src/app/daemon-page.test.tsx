// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
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

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

import { DaemonPage } from "./daemon-page";

describe("DaemonPage", () => {
  let executeMutation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    executeMutation = vi.fn().mockResolvedValue({ data: {} });
    mocks.useMutation.mockReturnValue([{ fetching: false }, executeMutation]);
    mocks.useQuery.mockReturnValue([
      {
        data: {
          daemon: {
            running: true,
            pid: 5678,
            uptimeSeconds: 120,
            version: "0.5.0",
            projectRoot: "/repo",
            logPath: null,
          },
          daemonHealth: {
            healthy: true,
            status: "HEALTHY",
            lastError: null,
            plugins: [
              { name: "animus-queue-default", kind: "queue", status: "HEALTHY", uptimeMs: 1000, lastError: null },
            ],
          },
          daemonAgents: [],
        },
        fetching: false,
        error: null,
      },
      vi.fn(),
    ]);
  });

  it("renders daemon status and start control", () => {
    render(<DaemonPage />);

    expect(screen.getByText("Daemon")).toBeTruthy();
    expect(screen.getByText("running")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
  });

  it("renders plugin rows", () => {
    render(<DaemonPage />);

    expect(screen.getByText("animus-queue-default")).toBeTruthy();
  });

  it("executes start mutation on button click", async () => {
    render(<DaemonPage />);

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    await waitFor(() => {
      expect(executeMutation).toHaveBeenCalledWith({});
    });
  });

  it("shows error feedback when mutation fails", async () => {
    executeMutation.mockResolvedValue({ error: { message: "daemon already running" } });

    render(<DaemonPage />);

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("daemon already running");
    });
  });

  it("shows success feedback when mutation succeeds", async () => {
    render(<DaemonPage />);

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Daemon start requested.");
    });
  });

  it("shows loading state while fetching", () => {
    mocks.useQuery.mockReturnValue([{ data: null, fetching: true, error: null }, vi.fn()]);

    render(<DaemonPage />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state when query fails", () => {
    mocks.useQuery.mockReturnValue([
      { data: null, fetching: false, error: { message: "Connection refused" } },
      vi.fn(),
    ]);

    render(<DaemonPage />);

    expect(screen.getByText("Connection refused")).toBeTruthy();
  });
});

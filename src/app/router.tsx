import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider, useRouteError } from "react-router-dom";

import { AppShellLayout } from "./shell";

const DashboardPage = lazy(() => import("./dashboard-page").then((m) => ({ default: m.DashboardPage })));
const DaemonPage = lazy(() => import("./daemon-page").then((m) => ({ default: m.DaemonPage })));
const TasksPage = lazy(() => import("./tasks-pages").then((m) => ({ default: m.TasksPage })));
const TaskCreatePage = lazy(() => import("./tasks-pages").then((m) => ({ default: m.TaskCreatePage })));
const TaskDetailPage = lazy(() => import("./tasks-pages").then((m) => ({ default: m.TaskDetailPage })));
const WorkflowsPage = lazy(() => import("./workflow-pages").then((m) => ({ default: m.WorkflowsPage })));
const WorkflowDetailPage = lazy(() => import("./workflow-pages").then((m) => ({ default: m.WorkflowDetailPage })));
const QueuePage = lazy(() => import("./queue-page").then((m) => ({ default: m.QueuePage })));
const EventsPage = lazy(() => import("./events-page").then((m) => ({ default: m.EventsPage })));
const AgentManagementPage = lazy(() => import("./agent-page").then((m) => ({ default: m.AgentManagementPage })));
const TaskOutputPage = lazy(() => import("./output-page").then((m) => ({ default: m.TaskOutputPage })));
const ArchitecturePage = lazy(() => import("./architecture-page").then((m) => ({ default: m.ArchitecturePage })));
const HistoryPage = lazy(() => import("./history-page").then((m) => ({ default: m.HistoryPage })));
const OpsMapPage = lazy(() => import("./ops-map-page").then((m) => ({ default: m.OpsMapPage })));
const NotFoundPage = lazy(() => import("./not-found-page").then((m) => ({ default: m.NotFoundPage })));
const TaskDispatchPage = lazy(() => import("./dispatch-pages").then((m) => ({ default: m.TaskDispatchPage })));
const RequirementDispatchPage = lazy(() => import("./dispatch-pages").then((m) => ({ default: m.RequirementDispatchPage })));
const CustomDispatchPage = lazy(() => import("./dispatch-pages").then((m) => ({ default: m.CustomDispatchPage })));

export const APP_ROUTE_PATHS = [
  "/",
  "/dashboard",
  "/daemon",
  "/agents",
  "/tasks",
  "/tasks/new",
  "/tasks/:taskId",
  "/tasks/:taskId/output",
  "/requirements",
  "/workflows",
  "/workflows/dispatch/task",
  "/workflows/dispatch/requirements",
  "/workflows/dispatch/custom",
  "/workflows/:workflowId",
  "/queue",
  "/events",
  "/architecture",
  "/history",
  "/ops-map",
  "*",
] as const;

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShellLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: withRouteSuspense(<DashboardPage />),
      },
      {
        path: "daemon",
        element: withRouteSuspense(<DaemonPage />),
      },
      {
        path: "agents",
        element: withRouteSuspense(<AgentManagementPage />),
      },
      {
        path: "tasks",
        element: withRouteSuspense(<TasksPage />),
      },
      {
        path: "tasks/new",
        element: withRouteSuspense(<TaskCreatePage />),
      },
      {
        path: "tasks/:taskId",
        element: withRouteSuspense(<TaskDetailPage />),
      },
      {
        path: "tasks/:taskId/output",
        element: withRouteSuspense(<TaskOutputPage />),
      },
      {
        path: "requirements",
        element: withRouteSuspense(<TasksPage kind="requirement" />),
      },
      {
        path: "workflows",
        element: withRouteSuspense(<WorkflowsPage />),
      },
      {
        path: "workflows/dispatch/task",
        element: withRouteSuspense(<TaskDispatchPage />),
      },
      {
        path: "workflows/dispatch/requirements",
        element: withRouteSuspense(<RequirementDispatchPage />),
      },
      {
        path: "workflows/dispatch/custom",
        element: withRouteSuspense(<CustomDispatchPage />),
      },
      {
        path: "workflows/:workflowId",
        element: withRouteSuspense(<WorkflowDetailPage />),
      },
      {
        path: "queue",
        element: withRouteSuspense(<QueuePage />),
      },
      {
        path: "events",
        element: withRouteSuspense(<EventsPage />),
      },
      {
        path: "architecture",
        element: withRouteSuspense(<ArchitecturePage />),
      },
      {
        path: "history",
        element: withRouteSuspense(<HistoryPage />),
      },
      {
        path: "ops-map",
        element: withRouteSuspense(<OpsMapPage />),
      },
      {
        path: "*",
        element: withRouteSuspense(<NotFoundPage />),
      },
    ],
  },
]);

export function AppRouterProvider() {
  return <RouterProvider router={router} />;
}

function RouteErrorBoundary() {
  const error = useRouteError();

  return (
    <section className="panel" role="alert">
      <h1>Route Error</h1>
      <p>
        The route failed to render. Check endpoint responses and retry navigation.
      </p>
      <pre>{JSON.stringify(error, null, 2)}</pre>
    </section>
  );
}

function withRouteSuspense(element: ReactNode) {
  return (
    <Suspense
      fallback={(
        <section className="loading-box" role="status" aria-live="polite" aria-atomic="true">
          Loading route...
        </section>
      )}
    >
      {element}
    </Suspense>
  );
}

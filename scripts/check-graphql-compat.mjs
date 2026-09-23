import fs from "node:fs/promises";

const endpoint = process.env.ANIMUS_GRAPHQL_URL ?? "http://127.0.0.1:8081/graphql";
const subjectId = process.env.ANIMUS_TEST_SUBJECT_ID ?? "task:TASK-003";
const workflowId = process.env.ANIMUS_TEST_WORKFLOW_ID ?? "a519084c-05ee-41c6-bc35-a73ee602b3aa";

const cases = [
  ["Dashboard", "dashboard.graphql", {}],
  ["Daemon", "daemon.graphql", {}],
  ["ReadySubjects", "dispatch.graphql", { kind: "task" }],
  ["DispatchRequirements", "dispatch.graphql", {}],
  ["DaemonActivity", "events.graphql", {}],
  ["Queue", "queue.graphql", {}],
  ["Subjects", "tasks.graphql", { kind: "task" }],
  ["SubjectDetail", "tasks.graphql", { id: subjectId }],
  ["SubjectNext", "tasks.graphql", { kind: "task" }],
  ["Workflows", "workflows.graphql", {}],
  ["WorkflowDetail", "workflows.graphql", { id: workflowId }],
];

let failed = false;
for (const [operationName, file, variables] of cases) {
  const query = await fs.readFile(new URL(`../src/lib/graphql/operations/${file}`, import.meta.url), "utf8");
  let response;
  let body;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, operationName, variables }),
    });
    body = await response.json();
  } catch (error) {
    failed = true;
    console.error(`${operationName}: transport failure: ${error.message}`);
    continue;
  }
  const errors = body.errors ?? [];
  const ok = response.status === 200 && errors.length === 0 && body.data !== null;
  console.log(`${ok ? "PASS" : "FAIL"} ${operationName} HTTP ${response.status}`);
  if (!ok) {
    failed = true;
    console.error(JSON.stringify(body));
  }
}

if (failed) process.exit(1);

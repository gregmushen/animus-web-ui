/* eslint-disable */
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type CreateSubjectInput = {
  assignee?: InputMaybe<Scalars['String']['input']>;
  body?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  labels?: Array<Scalars['String']['input']>;
  /** Priority on a 0..=4 scale. */
  priority?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<SubjectStatus>;
  title: Scalars['String']['input'];
};

/**
 * An active agent session. Mirrors
 * [`animus_control_protocol::types::AgentInfo`].
 */
export type DaemonAgent = {
  __typename?: 'DaemonAgent';
  model: Scalars['String']['output'];
  phaseId?: Maybe<Scalars['String']['output']>;
  provider: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
  startedAt: Scalars['String']['output'];
  workflowId?: Maybe<Scalars['String']['output']>;
};

export type DaemonEvent = {
  __typename?: 'DaemonEvent';
  at: Scalars['String']['output'];
  id: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  payload: Scalars['String']['output'];
};

/**
 * Daemon health report. Mirrors
 * [`animus_control_protocol::types::DaemonHealthResponse`].
 */
export type DaemonHealth = {
  __typename?: 'DaemonHealth';
  /** Convenience flag: `true` only when `status == HEALTHY`. */
  healthy: Scalars['Boolean']['output'];
  lastError?: Maybe<Scalars['String']['output']>;
  plugins: Array<PluginHealth>;
  status: HealthStatus;
};

/**
 * Daemon process status. Mirrors
 * [`animus_control_protocol::types::DaemonStatusResponse`].
 */
export type DaemonStatus = {
  __typename?: 'DaemonStatus';
  logPath?: Maybe<Scalars['String']['output']>;
  pid?: Maybe<Scalars['Int']['output']>;
  projectRoot?: Maybe<Scalars['String']['output']>;
  running: Scalars['Boolean']['output'];
  uptimeSeconds?: Maybe<Scalars['Int']['output']>;
  version?: Maybe<Scalars['String']['output']>;
};

export type EnqueueInput = {
  /** Priority on a 0..=4 scale. Defaults to 2 (medium) when omitted. */
  priority?: InputMaybe<Scalars['Int']['input']>;
  taskId: Scalars['ID']['input'];
};

/**
 * Coarse daemon health verdict. Mirrors
 * [`animus_control_protocol::types::DaemonHealthStatus`].
 */
export enum HealthStatus {
  Degraded = 'DEGRADED',
  Down = 'DOWN',
  Healthy = 'HEALTHY',
  Unhealthy = 'UNHEALTHY'
}

export type InstallPluginInput = {
  allowUnsigned?: Scalars['Boolean']['input'];
  source: Scalars['String']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
  yes?: Scalars['Boolean']['input'];
};

export type MutationRoot = {
  __typename?: 'MutationRoot';
  cancelWorkflow: Scalars['Boolean']['output'];
  createSubject: Subject;
  dropQueue: Scalars['Boolean']['output'];
  enqueue: QueueEntry;
  /** Execute a workflow definition directly, optionally bound to a subject. */
  executeWorkflow: WorkflowRunStart;
  holdQueue: Scalars['Boolean']['output'];
  installPlugin: Plugin;
  pauseWorkflow: Scalars['Boolean']['output'];
  /** Lifecycle-ping a plugin. */
  pingPlugin: PluginPing;
  releaseQueue: Scalars['Boolean']['output'];
  /**
   * Reorder queue entries: move the given ids as a contiguous group to the
   * front (default) or back of the queue.
   */
  reorderQueue: Scalars['Boolean']['output'];
  resumeWorkflow: Scalars['Boolean']['output'];
  /** Run a workflow for a subject/task. */
  runWorkflow: WorkflowRunStart;
  /** Set a subject's normalized status. */
  setSubjectStatus: Subject;
  /**
   * Start the daemon. `daemon/stop` and `daemon/restart` are intentionally
   * not exposed — the kernel forbids them over the control socket.
   */
  startDaemon: Scalars['Boolean']['output'];
  uninstallPlugin: Scalars['Boolean']['output'];
  /**
   * Update installed plugins. With `dryRun = true`, lists available
   * upgrades without applying them.
   */
  updatePlugins: Array<PluginUpdate>;
  updateSubject: Subject;
};


export type MutationRootCancelWorkflowArgs = {
  id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRootCreateSubjectArgs = {
  input: CreateSubjectInput;
};


export type MutationRootDropQueueArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRootEnqueueArgs = {
  input: EnqueueInput;
};


export type MutationRootExecuteWorkflowArgs = {
  definition: Scalars['String']['input'];
  subjectId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationRootHoldQueueArgs = {
  id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRootInstallPluginArgs = {
  input: InstallPluginInput;
};


export type MutationRootPauseWorkflowArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRootPingPluginArgs = {
  name: Scalars['String']['input'];
};


export type MutationRootReleaseQueueArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRootReorderQueueArgs = {
  front?: Scalars['Boolean']['input'];
  ids: Array<Scalars['ID']['input']>;
};


export type MutationRootResumeWorkflowArgs = {
  feedback?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationRootRunWorkflowArgs = {
  definition?: InputMaybe<Scalars['String']['input']>;
  taskId: Scalars['ID']['input'];
};


export type MutationRootSetSubjectStatusArgs = {
  id: Scalars['ID']['input'];
  status: SubjectStatus;
};


export type MutationRootUninstallPluginArgs = {
  name: Scalars['String']['input'];
};


export type MutationRootUpdatePluginsArgs = {
  dryRun?: Scalars['Boolean']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRootUpdateSubjectArgs = {
  input: UpdateSubjectInput;
};

/**
 * One installed plugin. Mirrors
 * [`animus_control_protocol::types::PluginInfo`].
 */
export type Plugin = {
  __typename?: 'Plugin';
  binaryPath?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  /** Plugin name (manifest `name`); also serves as the GraphQL id. */
  id: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
  signatureVerified: Scalars['Boolean']['output'];
  source?: Maybe<Scalars['String']['output']>;
  version: Scalars['String']['output'];
};

/**
 * Per-plugin health snapshot. Mirrors
 * [`animus_control_protocol::types::PluginHealth`].
 */
export type PluginHealth = {
  __typename?: 'PluginHealth';
  kind: Scalars['String']['output'];
  lastError?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  status: HealthStatus;
  uptimeMs?: Maybe<Scalars['Int']['output']>;
};

/**
 * Result of pinging a plugin. Mirrors
 * [`animus_control_protocol::types::PluginPingResponse`].
 */
export type PluginPing = {
  __typename?: 'PluginPing';
  error?: Maybe<Scalars['String']['output']>;
  latencyMs?: Maybe<Scalars['Int']['output']>;
  ok: Scalars['Boolean']['output'];
};

/**
 * A plugin registry entry, returned by search/browse. Mirrors
 * [`animus_control_protocol::types::PluginRegistryEntry`].
 */
export type PluginRegistryEntry = {
  __typename?: 'PluginRegistryEntry';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  installed: Scalars['Boolean']['output'];
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  version: Scalars['String']['output'];
};

/**
 * One row of a plugin update. Mirrors
 * [`animus_control_protocol::types::PluginUpdateEntry`].
 */
export type PluginUpdate = {
  __typename?: 'PluginUpdate';
  applied: Scalars['Boolean']['output'];
  fromVersion: Scalars['String']['output'];
  name: Scalars['String']['output'];
  toVersion: Scalars['String']['output'];
};

export type QueryRoot = {
  __typename?: 'QueryRoot';
  daemon: DaemonStatus;
  /** Currently active agent sessions. */
  daemonAgents: Array<DaemonAgent>;
  daemonHealth: DaemonHealth;
  /** List installed plugins, optionally filtered by kind. */
  plugin: Array<Plugin>;
  /** Browse the plugin registry. */
  pluginBrowse: Array<PluginRegistryEntry>;
  /** Look up a single installed plugin by name. */
  pluginInfo: Plugin;
  /** Search the plugin registry by free-text query. */
  pluginSearch: Array<PluginRegistryEntry>;
  /** List queue entries, optionally restricted to a state. */
  queue: Array<QueueEntry>;
  queueStats: QueueStats;
  /** List subjects, optionally filtered by kind and/or status. */
  subject: Array<Subject>;
  /** Look up a single subject by id. */
  subjectById: Subject;
  /** Highest-priority Ready subject, optionally restricted to a kind. */
  subjectNext?: Maybe<Subject>;
  /** Look up a single workflow run by id, including full run detail. */
  workflow: Workflow;
  /** List workflow runs, optionally filtered by status. */
  workflows: Array<Workflow>;
};


export type QueryRootPluginArgs = {
  kind?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRootPluginBrowseArgs = {
  available?: Scalars['Boolean']['input'];
  installed?: Scalars['Boolean']['input'];
  kind?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRootPluginInfoArgs = {
  name: Scalars['String']['input'];
};


export type QueryRootPluginSearchArgs = {
  kind?: InputMaybe<Scalars['String']['input']>;
  query: Scalars['String']['input'];
  tag?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRootQueueArgs = {
  state?: InputMaybe<QueueState>;
};


export type QueryRootSubjectArgs = {
  kind?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<SubjectStatus>;
};


export type QueryRootSubjectByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRootSubjectNextArgs = {
  kind?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRootWorkflowArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRootWorkflowsArgs = {
  status?: InputMaybe<WorkflowStatus>;
};

/**
 * One dispatch-queue entry. Mirrors
 * [`animus_control_protocol::types::QueueEntry`].
 */
export type QueueEntry = {
  __typename?: 'QueueEntry';
  enqueuedAt: Scalars['String']['output'];
  held: Scalars['Boolean']['output'];
  holdReason?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Priority on a 0..=4 scale (0 = none, 4 = critical). */
  priority: Scalars['Int']['output'];
  state: QueueState;
  taskId: Scalars['ID']['output'];
};

/**
 * Coarse status of a queue entry. Mirrors
 * [`animus_control_protocol::types::QueueEntryStatus`].
 */
export enum QueueState {
  Done = 'DONE',
  Dropped = 'DROPPED',
  Held = 'HELD',
  InFlight = 'IN_FLIGHT',
  Ready = 'READY'
}

/**
 * Aggregate queue counters. Mirrors
 * [`animus_control_protocol::types::QueueStats`].
 */
export type QueueStats = {
  __typename?: 'QueueStats';
  doneRecent: Scalars['Int']['output'];
  droppedRecent: Scalars['Int']['output'];
  held: Scalars['Int']['output'];
  inFlight: Scalars['Int']['output'];
  ready: Scalars['Int']['output'];
  /** Total live entries (ready + held + in-flight). */
  total: Scalars['Int']['output'];
};

/**
 * A normalized cross-backend subject. Mirrors
 * [`animus_subject_protocol::Subject`].
 */
export type Subject = {
  __typename?: 'Subject';
  assignee?: Maybe<Scalars['String']['output']>;
  attachments: Array<SubjectAttachment>;
  children: Array<Scalars['ID']['output']>;
  createdAt: Scalars['String']['output'];
  /** Backend-specific custom fields, serialized as a JSON string. */
  custom?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  labels: Array<Scalars['String']['output']>;
  /**
   * Backend-raw status string (e.g. `"In Review"`), when richer than the
   * normalized bucket.
   */
  nativeStatus?: Maybe<Scalars['String']['output']>;
  parent?: Maybe<Scalars['ID']['output']>;
  /** Priority on a 0..=4 scale. */
  priority?: Maybe<Scalars['Int']['output']>;
  status: SubjectStatus;
  /** Free-form backend status payload, serialized as a JSON string. */
  statusMetadata?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

/** An attachment carried by a [`Subject`]. */
export type SubjectAttachment = {
  __typename?: 'SubjectAttachment';
  id: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  /** Free-form backend metadata, serialized as a JSON string. */
  metadata?: Maybe<Scalars['String']['output']>;
  mimeType?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  uri: Scalars['String']['output'];
};

export type SubjectChangeEvent = {
  __typename?: 'SubjectChangeEvent';
  at: Scalars['String']['output'];
  change: Scalars['String']['output'];
  subjectId: Scalars['ID']['output'];
};

/**
 * Normalized cross-backend subject status. Mirrors
 * [`animus_subject_protocol::SubjectStatus`].
 */
export enum SubjectStatus {
  Blocked = 'BLOCKED',
  Cancelled = 'CANCELLED',
  Done = 'DONE',
  InProgress = 'IN_PROGRESS',
  Ready = 'READY'
}

export type SubscriptionRoot = {
  __typename?: 'SubscriptionRoot';
  daemonEvents: DaemonEvent;
  subjectChanged: SubjectChangeEvent;
  workflowEvents: WorkflowEvent;
};


export type SubscriptionRootSubjectChangedArgs = {
  kind?: InputMaybe<Scalars['String']['input']>;
};


export type SubscriptionRootWorkflowEventsArgs = {
  kinds?: InputMaybe<Array<Scalars['String']['input']>>;
  workflowId?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateSubjectInput = {
  /** `Some(...)` sets the assignee; pass an empty string to clear it. */
  assignee?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  labelsAdd?: Array<Scalars['String']['input']>;
  labelsRemove?: Array<Scalars['String']['input']>;
  status?: InputMaybe<SubjectStatus>;
};

/**
 * A workflow run. Mirrors
 * [`animus_control_protocol::types::WorkflowRunSummary`] plus the opaque
 * `detail` blob from `WorkflowRun` (serialized as JSON when present).
 */
export type Workflow = {
  __typename?: 'Workflow';
  /** Workflow definition name. */
  definition: Scalars['String']['output'];
  /**
   * Full run detail as a JSON string (phase history, decisions,
   * checkpoints). Only populated by `workflow`-by-id lookups.
   */
  detail?: Maybe<Scalars['String']['output']>;
  finishedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  startedAt: Scalars['String']['output'];
  status: WorkflowStatus;
  subjectId?: Maybe<Scalars['ID']['output']>;
};

export type WorkflowEvent = {
  __typename?: 'WorkflowEvent';
  at: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  payload: Scalars['String']['output'];
  workflowId: Scalars['ID']['output'];
};

/**
 * Result of starting a workflow. Mirrors
 * [`animus_control_protocol::types::WorkflowRunStart`].
 */
export type WorkflowRunStart = {
  __typename?: 'WorkflowRunStart';
  startedAt: Scalars['String']['output'];
  status?: Maybe<WorkflowStatus>;
  workflowId: Scalars['ID']['output'];
};

/**
 * Workflow lifecycle status. Mirrors
 * [`animus_control_protocol::types::WorkflowStatus`].
 */
export enum WorkflowStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Paused = 'PAUSED',
  Pending = 'PENDING',
  Running = 'RUNNING'
}

export type DaemonQueryVariables = Exact<{ [key: string]: never; }>;


export type DaemonQuery = { __typename?: 'QueryRoot', daemon: { __typename?: 'DaemonStatus', running: boolean, pid?: number | null, uptimeSeconds?: number | null, version?: string | null, projectRoot?: string | null, logPath?: string | null }, daemonHealth: { __typename?: 'DaemonHealth', healthy: boolean, status: HealthStatus, lastError?: string | null, plugins: Array<{ __typename?: 'PluginHealth', name: string, kind: string, status: HealthStatus, uptimeMs?: number | null, lastError?: string | null }> }, daemonAgents: Array<{ __typename?: 'DaemonAgent', sessionId: string, provider: string, model: string, workflowId?: string | null, phaseId?: string | null, startedAt: string }> };

export type StartDaemonMutationVariables = Exact<{ [key: string]: never; }>;


export type StartDaemonMutation = { __typename?: 'MutationRoot', startDaemon: boolean };

export type DashboardQueryVariables = Exact<{ [key: string]: never; }>;


export type DashboardQuery = { __typename?: 'QueryRoot', subject: Array<{ __typename?: 'Subject', id: string, status: SubjectStatus, priority?: number | null }>, daemon: { __typename?: 'DaemonStatus', running: boolean, version?: string | null, projectRoot?: string | null }, daemonHealth: { __typename?: 'DaemonHealth', healthy: boolean, status: HealthStatus, plugins: Array<{ __typename?: 'PluginHealth', name: string, kind: string, status: HealthStatus }> }, daemonAgents: Array<{ __typename?: 'DaemonAgent', sessionId: string, provider: string, model: string, workflowId?: string | null, phaseId?: string | null }>, queueStats: { __typename?: 'QueueStats', total: number, ready: number, held: number, inFlight: number } };

export type ReadySubjectsQueryVariables = Exact<{
  kind?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReadySubjectsQuery = { __typename?: 'QueryRoot', subject: Array<{ __typename?: 'Subject', id: string, title: string, status: SubjectStatus, priority?: number | null, labels: Array<string> }> };

export type DispatchRequirementsQueryVariables = Exact<{ [key: string]: never; }>;


export type DispatchRequirementsQuery = { __typename?: 'QueryRoot', subject: Array<{ __typename?: 'Subject', id: string, title: string, description?: string | null, status: SubjectStatus, priority?: number | null, labels: Array<string>, children: Array<string> }> };

export type DaemonActivityQueryVariables = Exact<{ [key: string]: never; }>;


export type DaemonActivityQuery = { __typename?: 'QueryRoot', daemonAgents: Array<{ __typename?: 'DaemonAgent', sessionId: string, provider: string, model: string, workflowId?: string | null, phaseId?: string | null, startedAt: string }>, daemonHealth: { __typename?: 'DaemonHealth', healthy: boolean, status: HealthStatus, lastError?: string | null } };

export type DaemonEventsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type DaemonEventsSubscription = { __typename?: 'SubscriptionRoot', daemonEvents: { __typename?: 'DaemonEvent', id: string, kind: string, payload: string, at: string } };

export type WorkflowEventsSubscriptionVariables = Exact<{
  workflowId?: InputMaybe<Scalars['ID']['input']>;
  kinds?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type WorkflowEventsSubscription = { __typename?: 'SubscriptionRoot', workflowEvents: { __typename?: 'WorkflowEvent', workflowId: string, kind: string, payload: string, at: string } };

export type SubjectChangedSubscriptionVariables = Exact<{
  kind?: InputMaybe<Scalars['String']['input']>;
}>;


export type SubjectChangedSubscription = { __typename?: 'SubscriptionRoot', subjectChanged: { __typename?: 'SubjectChangeEvent', subjectId: string, change: string, at: string } };

export type QueueQueryVariables = Exact<{
  state?: InputMaybe<QueueState>;
}>;


export type QueueQuery = { __typename?: 'QueryRoot', queue: Array<{ __typename?: 'QueueEntry', id: string, taskId: string, priority: number, state: QueueState, enqueuedAt: string, held: boolean, holdReason?: string | null }>, queueStats: { __typename?: 'QueueStats', total: number, ready: number, held: number, inFlight: number, doneRecent: number, droppedRecent: number } };

export type EnqueueMutationVariables = Exact<{
  input: EnqueueInput;
}>;


export type EnqueueMutation = { __typename?: 'MutationRoot', enqueue: { __typename?: 'QueueEntry', id: string, taskId: string, state: QueueState } };

export type HoldQueueMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
}>;


export type HoldQueueMutation = { __typename?: 'MutationRoot', holdQueue: boolean };

export type ReleaseQueueMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ReleaseQueueMutation = { __typename?: 'MutationRoot', releaseQueue: boolean };

export type DropQueueMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DropQueueMutation = { __typename?: 'MutationRoot', dropQueue: boolean };

export type ReorderQueueMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  front?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ReorderQueueMutation = { __typename?: 'MutationRoot', reorderQueue: boolean };

export type SubjectsQueryVariables = Exact<{
  kind?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<SubjectStatus>;
}>;


export type SubjectsQuery = { __typename?: 'QueryRoot', subject: Array<{ __typename?: 'Subject', id: string, kind: string, title: string, description?: string | null, status: SubjectStatus, nativeStatus?: string | null, priority?: number | null, assignee?: string | null, labels: Array<string>, parent?: string | null, children: Array<string>, url?: string | null, createdAt: string, updatedAt: string }> };

export type SubjectDetailQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SubjectDetailQuery = { __typename?: 'QueryRoot', subjectById: { __typename?: 'Subject', id: string, kind: string, title: string, description?: string | null, status: SubjectStatus, nativeStatus?: string | null, statusMetadata?: string | null, priority?: number | null, assignee?: string | null, labels: Array<string>, parent?: string | null, children: Array<string>, url?: string | null, createdAt: string, updatedAt: string, custom?: string | null, attachments: Array<{ __typename?: 'SubjectAttachment', id: string, kind: string, uri: string, title?: string | null, mimeType?: string | null, metadata?: string | null }> } };

export type SubjectNextQueryVariables = Exact<{
  kind?: InputMaybe<Scalars['String']['input']>;
}>;


export type SubjectNextQuery = { __typename?: 'QueryRoot', subjectNext?: { __typename?: 'Subject', id: string, kind: string, title: string, status: SubjectStatus, priority?: number | null } | null };

export type CreateSubjectMutationVariables = Exact<{
  input: CreateSubjectInput;
}>;


export type CreateSubjectMutation = { __typename?: 'MutationRoot', createSubject: { __typename?: 'Subject', id: string, kind: string, title: string, status: SubjectStatus } };

export type UpdateSubjectMutationVariables = Exact<{
  input: UpdateSubjectInput;
}>;


export type UpdateSubjectMutation = { __typename?: 'MutationRoot', updateSubject: { __typename?: 'Subject', id: string, status: SubjectStatus, assignee?: string | null, labels: Array<string> } };

export type SetSubjectStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: SubjectStatus;
}>;


export type SetSubjectStatusMutation = { __typename?: 'MutationRoot', setSubjectStatus: { __typename?: 'Subject', id: string, status: SubjectStatus, nativeStatus?: string | null } };

export type WorkflowsQueryVariables = Exact<{
  status?: InputMaybe<WorkflowStatus>;
}>;


export type WorkflowsQuery = { __typename?: 'QueryRoot', workflows: Array<{ __typename?: 'Workflow', id: string, definition: string, status: WorkflowStatus, subjectId?: string | null, startedAt: string, finishedAt?: string | null }> };

export type WorkflowDetailQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type WorkflowDetailQuery = { __typename?: 'QueryRoot', workflow: { __typename?: 'Workflow', id: string, definition: string, status: WorkflowStatus, subjectId?: string | null, startedAt: string, finishedAt?: string | null, detail?: string | null } };

export type RunWorkflowMutationVariables = Exact<{
  taskId: Scalars['ID']['input'];
  definition?: InputMaybe<Scalars['String']['input']>;
}>;


export type RunWorkflowMutation = { __typename?: 'MutationRoot', runWorkflow: { __typename?: 'WorkflowRunStart', workflowId: string, status?: WorkflowStatus | null, startedAt: string } };

export type ExecuteWorkflowMutationVariables = Exact<{
  definition: Scalars['String']['input'];
  subjectId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type ExecuteWorkflowMutation = { __typename?: 'MutationRoot', executeWorkflow: { __typename?: 'WorkflowRunStart', workflowId: string, status?: WorkflowStatus | null, startedAt: string } };

export type PauseWorkflowMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PauseWorkflowMutation = { __typename?: 'MutationRoot', pauseWorkflow: boolean };

export type ResumeWorkflowMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  feedback?: InputMaybe<Scalars['String']['input']>;
}>;


export type ResumeWorkflowMutation = { __typename?: 'MutationRoot', resumeWorkflow: boolean };

export type CancelWorkflowMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
}>;


export type CancelWorkflowMutation = { __typename?: 'MutationRoot', cancelWorkflow: boolean };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const DaemonDocument = new TypedDocumentString(`
    query Daemon {
  daemon {
    running
    pid
    uptimeSeconds
    version
    projectRoot
    logPath
  }
  daemonHealth {
    healthy
    status
    lastError
    plugins {
      name
      kind
      status
      uptimeMs
      lastError
    }
  }
  daemonAgents {
    sessionId
    provider
    model
    workflowId
    phaseId
    startedAt
  }
}
    `) as unknown as TypedDocumentString<DaemonQuery, DaemonQueryVariables>;
export const StartDaemonDocument = new TypedDocumentString(`
    mutation StartDaemon {
  startDaemon
}
    `) as unknown as TypedDocumentString<StartDaemonMutation, StartDaemonMutationVariables>;
export const DashboardDocument = new TypedDocumentString(`
    query Dashboard {
  subject(kind: "task") {
    id
    status
    priority
  }
  daemon {
    running
    version
    projectRoot
  }
  daemonHealth {
    healthy
    status
    plugins {
      name
      kind
      status
    }
  }
  daemonAgents {
    sessionId
    provider
    model
    workflowId
    phaseId
  }
  queueStats {
    total
    ready
    held
    inFlight
  }
}
    `) as unknown as TypedDocumentString<DashboardQuery, DashboardQueryVariables>;
export const ReadySubjectsDocument = new TypedDocumentString(`
    query ReadySubjects($kind: String) {
  subject(kind: $kind, status: READY) {
    id
    title
    status
    priority
    labels
  }
}
    `) as unknown as TypedDocumentString<ReadySubjectsQuery, ReadySubjectsQueryVariables>;
export const DispatchRequirementsDocument = new TypedDocumentString(`
    query DispatchRequirements {
  subject(kind: "requirement") {
    id
    title
    description
    status
    priority
    labels
    children
  }
}
    `) as unknown as TypedDocumentString<DispatchRequirementsQuery, DispatchRequirementsQueryVariables>;
export const DaemonActivityDocument = new TypedDocumentString(`
    query DaemonActivity {
  daemonAgents {
    sessionId
    provider
    model
    workflowId
    phaseId
    startedAt
  }
  daemonHealth {
    healthy
    status
    lastError
  }
}
    `) as unknown as TypedDocumentString<DaemonActivityQuery, DaemonActivityQueryVariables>;
export const DaemonEventsDocument = new TypedDocumentString(`
    subscription DaemonEvents {
  daemonEvents {
    id
    kind
    payload
    at
  }
}
    `) as unknown as TypedDocumentString<DaemonEventsSubscription, DaemonEventsSubscriptionVariables>;
export const WorkflowEventsDocument = new TypedDocumentString(`
    subscription WorkflowEvents($workflowId: ID, $kinds: [String!]) {
  workflowEvents(workflowId: $workflowId, kinds: $kinds) {
    workflowId
    kind
    payload
    at
  }
}
    `) as unknown as TypedDocumentString<WorkflowEventsSubscription, WorkflowEventsSubscriptionVariables>;
export const SubjectChangedDocument = new TypedDocumentString(`
    subscription SubjectChanged($kind: String) {
  subjectChanged(kind: $kind) {
    subjectId
    change
    at
  }
}
    `) as unknown as TypedDocumentString<SubjectChangedSubscription, SubjectChangedSubscriptionVariables>;
export const QueueDocument = new TypedDocumentString(`
    query Queue($state: QueueState) {
  queue(state: $state) {
    id
    taskId
    priority
    state
    enqueuedAt
    held
    holdReason
  }
  queueStats {
    total
    ready
    held
    inFlight
    doneRecent
    droppedRecent
  }
}
    `) as unknown as TypedDocumentString<QueueQuery, QueueQueryVariables>;
export const EnqueueDocument = new TypedDocumentString(`
    mutation Enqueue($input: EnqueueInput!) {
  enqueue(input: $input) {
    id
    taskId
    state
  }
}
    `) as unknown as TypedDocumentString<EnqueueMutation, EnqueueMutationVariables>;
export const HoldQueueDocument = new TypedDocumentString(`
    mutation HoldQueue($id: ID!, $reason: String) {
  holdQueue(id: $id, reason: $reason)
}
    `) as unknown as TypedDocumentString<HoldQueueMutation, HoldQueueMutationVariables>;
export const ReleaseQueueDocument = new TypedDocumentString(`
    mutation ReleaseQueue($id: ID!) {
  releaseQueue(id: $id)
}
    `) as unknown as TypedDocumentString<ReleaseQueueMutation, ReleaseQueueMutationVariables>;
export const DropQueueDocument = new TypedDocumentString(`
    mutation DropQueue($id: ID!) {
  dropQueue(id: $id)
}
    `) as unknown as TypedDocumentString<DropQueueMutation, DropQueueMutationVariables>;
export const ReorderQueueDocument = new TypedDocumentString(`
    mutation ReorderQueue($ids: [ID!]!, $front: Boolean) {
  reorderQueue(ids: $ids, front: $front)
}
    `) as unknown as TypedDocumentString<ReorderQueueMutation, ReorderQueueMutationVariables>;
export const SubjectsDocument = new TypedDocumentString(`
    query Subjects($kind: String, $status: SubjectStatus) {
  subject(kind: $kind, status: $status) {
    id
    kind
    title
    description
    status
    nativeStatus
    priority
    assignee
    labels
    parent
    children
    url
    createdAt
    updatedAt
  }
}
    `) as unknown as TypedDocumentString<SubjectsQuery, SubjectsQueryVariables>;
export const SubjectDetailDocument = new TypedDocumentString(`
    query SubjectDetail($id: ID!) {
  subjectById(id: $id) {
    id
    kind
    title
    description
    status
    nativeStatus
    statusMetadata
    priority
    assignee
    labels
    parent
    children
    url
    createdAt
    updatedAt
    custom
    attachments {
      id
      kind
      uri
      title
      mimeType
      metadata
    }
  }
}
    `) as unknown as TypedDocumentString<SubjectDetailQuery, SubjectDetailQueryVariables>;
export const SubjectNextDocument = new TypedDocumentString(`
    query SubjectNext($kind: String) {
  subjectNext(kind: $kind) {
    id
    kind
    title
    status
    priority
  }
}
    `) as unknown as TypedDocumentString<SubjectNextQuery, SubjectNextQueryVariables>;
export const CreateSubjectDocument = new TypedDocumentString(`
    mutation CreateSubject($input: CreateSubjectInput!) {
  createSubject(input: $input) {
    id
    kind
    title
    status
  }
}
    `) as unknown as TypedDocumentString<CreateSubjectMutation, CreateSubjectMutationVariables>;
export const UpdateSubjectDocument = new TypedDocumentString(`
    mutation UpdateSubject($input: UpdateSubjectInput!) {
  updateSubject(input: $input) {
    id
    status
    assignee
    labels
  }
}
    `) as unknown as TypedDocumentString<UpdateSubjectMutation, UpdateSubjectMutationVariables>;
export const SetSubjectStatusDocument = new TypedDocumentString(`
    mutation SetSubjectStatus($id: ID!, $status: SubjectStatus!) {
  setSubjectStatus(id: $id, status: $status) {
    id
    status
    nativeStatus
  }
}
    `) as unknown as TypedDocumentString<SetSubjectStatusMutation, SetSubjectStatusMutationVariables>;
export const WorkflowsDocument = new TypedDocumentString(`
    query Workflows($status: WorkflowStatus) {
  workflows(status: $status) {
    id
    definition
    status
    subjectId
    startedAt
    finishedAt
  }
}
    `) as unknown as TypedDocumentString<WorkflowsQuery, WorkflowsQueryVariables>;
export const WorkflowDetailDocument = new TypedDocumentString(`
    query WorkflowDetail($id: ID!) {
  workflow(id: $id) {
    id
    definition
    status
    subjectId
    startedAt
    finishedAt
    detail
  }
}
    `) as unknown as TypedDocumentString<WorkflowDetailQuery, WorkflowDetailQueryVariables>;
export const RunWorkflowDocument = new TypedDocumentString(`
    mutation RunWorkflow($taskId: ID!, $definition: String) {
  runWorkflow(taskId: $taskId, definition: $definition) {
    workflowId
    status
    startedAt
  }
}
    `) as unknown as TypedDocumentString<RunWorkflowMutation, RunWorkflowMutationVariables>;
export const ExecuteWorkflowDocument = new TypedDocumentString(`
    mutation ExecuteWorkflow($definition: String!, $subjectId: ID) {
  executeWorkflow(definition: $definition, subjectId: $subjectId) {
    workflowId
    status
    startedAt
  }
}
    `) as unknown as TypedDocumentString<ExecuteWorkflowMutation, ExecuteWorkflowMutationVariables>;
export const PauseWorkflowDocument = new TypedDocumentString(`
    mutation PauseWorkflow($id: ID!) {
  pauseWorkflow(id: $id)
}
    `) as unknown as TypedDocumentString<PauseWorkflowMutation, PauseWorkflowMutationVariables>;
export const ResumeWorkflowDocument = new TypedDocumentString(`
    mutation ResumeWorkflow($id: ID!, $feedback: String) {
  resumeWorkflow(id: $id, feedback: $feedback)
}
    `) as unknown as TypedDocumentString<ResumeWorkflowMutation, ResumeWorkflowMutationVariables>;
export const CancelWorkflowDocument = new TypedDocumentString(`
    mutation CancelWorkflow($id: ID!, $reason: String) {
  cancelWorkflow(id: $id, reason: $reason)
}
    `) as unknown as TypedDocumentString<CancelWorkflowMutation, CancelWorkflowMutationVariables>;
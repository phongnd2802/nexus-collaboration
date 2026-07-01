import { randomUUID } from 'crypto';

type TranscriptStatus = 'pending' | 'running' | 'completed' | 'error' | 'denied' | 'skipped';

type WorkspaceReferencePayload = {
  sourceType?: string;
  entityType?: string;
  entityId?: string;
  title?: string;
  href?: string;
  snippet?: string;
  citation?: string;
  score?: number;
};

type WorkspaceActionPayload = {
  toolName?: string;
  action?: string;
  status?: string;
  entityType?: string;
  entityId?: string;
  title?: string;
  href?: string;
  message?: string;
};

type ProjectCardPayload = {
  id: string;
  name: string;
  href: string;
  description?: string;
  status?: string;
  type?: string;
  updatedAt?: string;
  memberCount?: number;
};

type AgentChatPart = {
  id: string;
  type: string;
  status: TranscriptStatus;
  label?: string;
  summary?: string;
  text?: string;
  metadata?: Record<string, any>;
  startedAt?: string;
  endedAt?: string;
  toolName?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  references?: WorkspaceReferencePayload[];
  actions?: WorkspaceActionPayload[];
  projects?: ProjectCardPayload[];
};

export type NormalizedAgentChatEvent =
  | { type: 'session'; data: { sessionId: string; runId?: string } }
  | { type: 'message.part'; data: { part: AgentChatPart } }
  | { type: 'run.error'; data: { error: string } }
  | { type: 'run.completed'; data: { message: string; sessionId?: string; runId?: string } };

export type AgentChatNormalizationState = {
  assistantContent: string;
  sessionId?: string;
  runId?: string;
  reasoning: Record<string, { text: string; startedAt?: string }>;
  toolCalls: Record<string, { toolName?: string; input?: Record<string, any>; startedAt?: string }>;
};

export function createNormalizationState(): AgentChatNormalizationState {
  return {
    assistantContent: '',
    reasoning: {},
    toolCalls: {},
  };
}

export function normalizeAgentChatChunk(
  chunk: Record<string, any>,
  workspaceId: string,
  state: AgentChatNormalizationState,
): NormalizedAgentChatEvent[] {
  if (chunk?.type === 'data-session') {
    state.sessionId = typeof chunk.data?.sessionId === 'string' ? chunk.data.sessionId : state.sessionId;
    state.runId = typeof chunk.data?.runId === 'string' ? chunk.data.runId : state.runId;
    if (!state.sessionId) return [];
    return [{ type: 'session', data: { sessionId: state.sessionId, runId: state.runId } }];
  }

  if (chunk?.type === 'text-delta' && typeof chunk.delta === 'string') {
    state.assistantContent += chunk.delta;
    return [partEvent({
      id: 'assistant-text',
      type: 'text',
      status: 'running',
      label: 'Message',
      text: state.assistantContent,
    })];
  }

  if (chunk?.type === 'reasoning-start') {
    const id = typeof chunk.id === 'string' ? chunk.id : 'reasoning';
    state.reasoning[id] = { text: '', startedAt: new Date().toISOString() };
    return [partEvent({
      id,
      type: 'reasoning',
      status: 'running',
      label: 'Dang suy nghi...',
      summary: 'Dang suy nghi...',
      text: '',
      startedAt: state.reasoning[id].startedAt,
    })];
  }

  if (chunk?.type === 'reasoning-delta' && typeof chunk.delta === 'string') {
    const id = typeof chunk.id === 'string' ? chunk.id : 'reasoning';
    const current = state.reasoning[id] || { text: '', startedAt: new Date().toISOString() };
    current.text += chunk.delta;
    state.reasoning[id] = current;
    return [partEvent({
      id,
      type: 'reasoning',
      status: 'running',
      label: 'Dang suy nghi...',
      summary: 'Dang suy nghi...',
      text: current.text,
      startedAt: current.startedAt,
    })];
  }

  if (chunk?.type === 'reasoning-end') {
    const id = typeof chunk.id === 'string' ? chunk.id : 'reasoning';
    const current = state.reasoning[id] || { text: '', startedAt: undefined };
    return [partEvent({
      id,
      type: 'reasoning',
      status: 'completed',
      label: 'Da suy nghi',
      summary: 'Da suy nghi',
      text: current.text || 'Assistant completed reasoning',
      startedAt: current.startedAt,
      endedAt: new Date().toISOString(),
    })];
  }

  if (chunk?.type === 'tool-input-start') {
    const toolCallId = typeof chunk.tool_call_id === 'string' ? chunk.tool_call_id : randomUUID();
    const startedAt = new Date().toISOString();
    state.toolCalls[toolCallId] = {
      toolName: typeof chunk.tool_name === 'string' ? chunk.tool_name : undefined,
      input: {},
      startedAt,
    };
    return [partEvent({
      id: toolCallId,
      type: 'tool-input',
      status: 'running',
      label: `Calling ${state.toolCalls[toolCallId].toolName || 'tool'}`,
      summary: 'Dang goi cong cu...',
      toolName: state.toolCalls[toolCallId].toolName,
      text: 'Preparing tool arguments',
      startedAt,
    })];
  }

  if (chunk?.type === 'tool-input-delta') {
    const toolCallId = typeof chunk.tool_call_id === 'string' ? chunk.tool_call_id : randomUUID();
    const current = state.toolCalls[toolCallId];
    return [partEvent({
      id: toolCallId,
      type: 'tool-input',
      status: 'running',
      label: `Calling ${current?.toolName || 'tool'}`,
      summary: 'Dang goi cong cu...',
      toolName: current?.toolName,
      text: 'Streaming tool arguments',
      input: current?.input,
      startedAt: current?.startedAt,
    })];
  }

  if (chunk?.type === 'tool-input-available') {
    const toolCallId = typeof chunk.tool_call_id === 'string' ? chunk.tool_call_id : randomUUID();
    const current = state.toolCalls[toolCallId] || {};
    state.toolCalls[toolCallId] = {
      toolName: typeof chunk.tool_name === 'string' ? chunk.tool_name : current.toolName,
      input: isRecord(chunk.input) ? chunk.input : undefined,
      startedAt: current.startedAt || new Date().toISOString(),
    };
    return [partEvent({
      id: toolCallId,
      type: 'tool-input',
      status: 'running',
      label: `Calling ${state.toolCalls[toolCallId].toolName || 'tool'}`,
      summary: 'Dang goi cong cu...',
      toolName: state.toolCalls[toolCallId].toolName,
      text: 'Tool arguments ready',
      input: state.toolCalls[toolCallId].input,
      startedAt: state.toolCalls[toolCallId].startedAt,
    })];
  }

  if (chunk?.type === 'tool-output-available') {
    const toolCallId = typeof chunk.tool_call_id === 'string' ? chunk.tool_call_id : randomUUID();
    const current = state.toolCalls[toolCallId];
    const toolName = current?.toolName;
    return [
      partEvent({
        id: toolCallId,
        type: 'tool-output',
        status: 'completed',
        label: `${toolName || 'Tool'} completed`,
        summary: `${toolName || 'Tool'} completed`,
        toolName,
        text: 'Tool result received',
        input: current?.input,
        output: isRecord(chunk.output) ? chunk.output : undefined,
        startedAt: current?.startedAt,
        endedAt: new Date().toISOString(),
      }),
      ...derivedPartsFromToolOutput(toolName, chunk.output, workspaceId).map(partEvent),
    ];
  }

  if (chunk?.type === 'tool-output-error') {
    const toolCallId = typeof chunk.tool_call_id === 'string' ? chunk.tool_call_id : randomUUID();
    const current = state.toolCalls[toolCallId];
    return [partEvent({
      id: toolCallId,
      type: 'tool-output',
      status: 'error',
      label: `${current?.toolName || 'Tool'} failed`,
      summary: `${current?.toolName || 'Tool'} failed`,
      toolName: current?.toolName,
      input: current?.input,
      error: typeof chunk.error_text === 'string' ? chunk.error_text : 'Tool execution failed',
      startedAt: current?.startedAt,
      endedAt: new Date().toISOString(),
    })];
  }

  if (chunk?.type === 'tool-output-denied') {
    const toolCallId = typeof chunk.tool_call_id === 'string' ? chunk.tool_call_id : randomUUID();
    const current = state.toolCalls[toolCallId];
    return [partEvent({
      id: toolCallId,
      type: 'tool-output',
      status: 'denied',
      label: `${current?.toolName || 'Tool'} denied`,
      summary: `${current?.toolName || 'Tool'} denied`,
      toolName: current?.toolName,
      input: current?.input,
      error: 'Tool execution denied',
      startedAt: current?.startedAt,
      endedAt: new Date().toISOString(),
    })];
  }

  if (chunk?.type === 'error') {
    return [{ type: 'run.error', data: { error: typeof chunk.error_text === 'string' ? chunk.error_text : 'Nexus AI request failed' } }];
  }

  const directPart = normalizedPartFromStructuredChunk(chunk);
  if (directPart) {
    return [partEvent(directPart)];
  }

  return [];
}

export function createRunCompletedEvent(state: AgentChatNormalizationState): NormalizedAgentChatEvent {
  return {
    type: 'run.completed',
    data: {
      message: state.assistantContent,
      sessionId: state.sessionId,
      runId: state.runId,
    },
  };
}

function normalizedPartFromStructuredChunk(chunk: Record<string, any>): AgentChatPart | null {
  if (chunk?.type === 'data-orchestration_stage') {
    const data = isRecord(chunk.data) ? chunk.data : {};
    const stage = typeof data.stage === 'string' ? data.stage : 'unknown';
    const label = orchestrationLabel(stage);
    return {
      id: `orchestration-${stage}`,
      type: 'data-orchestration_stage',
      status: normalizeTranscriptStatus(typeof data.status === 'string' ? data.status : undefined),
      label,
      summary: typeof data.summary === 'string' ? data.summary : label,
      metadata: isRecord(data.metadata) ? data.metadata : undefined,
      startedAt: typeof data.startedAt === 'string' ? data.startedAt : undefined,
      endedAt: typeof data.endedAt === 'string' ? data.endedAt : undefined,
    };
  }

  if (chunk?.type === 'data-routing_decision') {
    const data = isRecord(chunk.data) ? chunk.data : {};
    const route = typeof data.route === 'string' ? data.route : 'unknown';
    const executionPath = typeof data.executionPath === 'string' ? data.executionPath : undefined;
    const isDirect = route === 'direct_workspace' || executionPath === 'direct_workspace' || route === 'direct';
    return {
      id: `routing-${executionPath || route}`,
      type: 'data-routing_decision',
      status: 'completed',
      label: isDirect ? 'Direct workspace route' : 'Multi-agent route',
      summary: isDirect ? 'Routed to direct workspace agent' : 'Routed to multi-agent orchestration',
      metadata: data,
    };
  }

  if (
    chunk?.type === 'data-plan'
    || chunk?.type === 'data-retrieval_bundle'
    || chunk?.type === 'data-draft_answer'
    || chunk?.type === 'data-critique'
    || chunk?.type === 'data-final_answer'
  ) {
    const labelByType: Record<string, string> = {
      'data-plan': 'Plan',
      'data-retrieval_bundle': 'Retrieval bundle',
      'data-draft_answer': 'Draft answer',
      'data-critique': 'Critique',
      'data-final_answer': 'Final answer',
    };
    const data = isRecord(chunk.data) ? chunk.data : {};
    return {
      id: `${chunk.type}-${randomUUID()}`,
      type: chunk.type,
      status: 'completed',
      label: labelByType[chunk.type] || chunk.type,
      summary: labelByType[chunk.type] || chunk.type,
      metadata: data,
      text: chunk.type === 'data-final_answer' && typeof data.content === 'string' ? data.content : undefined,
    };
  }

  if (chunk?.type === 'data-rag_sources' || chunk?.type === 'data-mcp_sources') {
    const data = isRecord(chunk.data) ? chunk.data : {};
    const references = toWorkspaceReferences(data.sources || data.references || data.results);
    if (references.length === 0) return null;
    return {
      id: `${chunk.type}-${randomUUID()}`,
      type: chunk.type,
      status: 'completed',
      label: chunk.type === 'data-rag_sources' ? 'RAG sources' : 'Workspace sources',
      summary: chunk.type === 'data-rag_sources' ? 'Indexed file sources' : 'Workspace data sources',
      references,
      metadata: data,
    };
  }

  if (chunk?.type === 'data-action_result') {
    const data = isRecord(chunk.data) ? chunk.data : {};
    const actions = toWorkspaceActions(data.actions || data.actionResults || data.results);
    if (actions.length === 0) return null;
    return {
      id: `action-result-${randomUUID()}`,
      type: 'data-action_result',
      status: actions.some(action => action.status === 'error') ? 'error' : 'completed',
      label: 'Action result',
      summary: 'Workspace action result',
      actions,
      metadata: data,
    };
  }

  if (chunk?.type === 'source-url') {
    return {
      id: typeof chunk.id === 'string' ? chunk.id : `source-url-${randomUUID()}`,
      type: 'source-url',
      status: 'completed',
      label: typeof chunk.title === 'string' ? chunk.title : typeof chunk.url === 'string' ? chunk.url : 'Source',
      summary: 'Source attached',
      metadata: {
        url: chunk.url,
        title: chunk.title,
      },
    };
  }

  if (chunk?.type === 'source-document') {
    return {
      id: typeof chunk.id === 'string' ? chunk.id : `source-document-${randomUUID()}`,
      type: 'source-document',
      status: 'completed',
      label: typeof chunk.title === 'string' ? chunk.title : 'Document',
      summary: 'Document attached',
      metadata: {
        title: chunk.title,
        mediaType: chunk.mediaType,
      },
    };
  }

  if (chunk?.type === 'file') {
    return {
      id: typeof chunk.id === 'string' ? chunk.id : `file-${randomUUID()}`,
      type: 'file',
      status: 'completed',
      label: typeof chunk.filename === 'string' ? chunk.filename : 'File',
      summary: 'File attached',
      metadata: {
        filename: chunk.filename,
        mediaType: chunk.mediaType,
      },
    };
  }

  if (chunk?.type === 'data-project_list') {
    const projects = toProjectCardPayloads(chunk.data?.projects || chunk.projects);
    if (projects.length === 0) return null;
    return {
      id: typeof chunk.id === 'string' ? chunk.id : `project-list-${randomUUID()}`,
      type: 'data-project_list',
      status: 'completed',
      label:
        (typeof chunk.data?.title === 'string' && chunk.data.title)
        || (typeof chunk.title === 'string' && chunk.title)
        || 'Projects',
      summary: 'Project list attached',
      projects,
    };
  }

  return null;
}

function partEvent(part: AgentChatPart): NormalizedAgentChatEvent {
  return { type: 'message.part', data: { part } };
}

function normalizeTranscriptStatus(status: string | undefined): TranscriptStatus {
  if (status === 'pending' || status === 'running' || status === 'completed' || status === 'error' || status === 'denied' || status === 'skipped') {
    return status;
  }
  return 'completed';
}

function orchestrationLabel(stage: string): string {
  const labels: Record<string, string> = {
    plan: 'Planning',
    route: 'Routing',
    retrieval: 'Retrieval',
    draft: 'Drafting',
    critique: 'Critiquing',
    final: 'Finalizing',
  };
  return labels[stage] || stage;
}

function toProjectCardPayloads(value: unknown): ProjectCardPayload[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<ProjectCardPayload[]>((acc, item) => {
    if (!isRecord(item)) return acc;
    const id = typeof item.id === 'string' ? item.id : '';
    const name = typeof item.name === 'string' ? item.name : '';
    const href = typeof item.href === 'string' ? item.href : '';
    if (!id || !name || !href) return acc;
    acc.push({
      id,
      name,
      href,
      description: typeof item.description === 'string' ? item.description : undefined,
      status: typeof item.status === 'string' ? item.status : undefined,
      type: typeof item.type === 'string' ? item.type : undefined,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
      memberCount: typeof item.memberCount === 'number' ? item.memberCount : undefined,
    });
    return acc;
  }, []);
}

function toWorkspaceReferences(value: unknown): WorkspaceReferencePayload[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<WorkspaceReferencePayload[]>((acc, item) => {
    if (!isRecord(item)) return acc;
    const title = typeof item.title === 'string' ? item.title : undefined;
    const href = typeof item.href === 'string' ? item.href : undefined;
    const entityId = typeof item.entityId === 'string' ? item.entityId : undefined;
    if (!title && !href && !entityId) return acc;
    acc.push({
      sourceType: typeof item.sourceType === 'string' ? item.sourceType : undefined,
      entityType: typeof item.entityType === 'string' ? item.entityType : undefined,
      entityId,
      title,
      href,
      snippet: typeof item.snippet === 'string' ? item.snippet : undefined,
      citation: typeof item.citation === 'string' ? item.citation : undefined,
      score: typeof item.score === 'number' ? item.score : undefined,
    });
    return acc;
  }, []);
}

function toWorkspaceActions(value: unknown): WorkspaceActionPayload[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<WorkspaceActionPayload[]>((acc, item) => {
    if (!isRecord(item)) return acc;
    const title = typeof item.title === 'string' ? item.title : undefined;
    const href = typeof item.href === 'string' ? item.href : undefined;
    const message = typeof item.message === 'string' ? item.message : undefined;
    if (!title && !href && !message) return acc;
    acc.push({
      toolName: typeof item.toolName === 'string' ? item.toolName : undefined,
      action: typeof item.action === 'string' ? item.action : undefined,
      status: typeof item.status === 'string' ? item.status : undefined,
      entityType: typeof item.entityType === 'string' ? item.entityType : undefined,
      entityId: typeof item.entityId === 'string' ? item.entityId : undefined,
      title,
      href,
      message,
    });
    return acc;
  }, []);
}

const ACTION_WORDS = ['create', 'created', 'update', 'updated', 'delete', 'deleted', 'assign', 'assigned', 'send', 'sent', 'move', 'moved', 'share', 'shared'];

function derivedPartsFromToolOutput(toolName: string | undefined, output: unknown, workspaceId: string): AgentChatPart[] {
  if (!toolName || !isRecord(output)) return [];
  if (toolName === 'search_rag') {
    const references = toWorkspaceReferences(output.sources);
    if (references.length === 0) return [];
    return [{
      id: `rag-sources-${randomUUID()}`,
      type: 'data-rag_sources',
      status: 'completed',
      label: 'RAG sources',
      summary: 'Indexed file sources',
      references,
      metadata: { sources: references },
    }];
  }

  const actions = dedupeByHref([
    ...toWorkspaceActions(output.actions || output.actionResults || output.results),
    ...actionsFromToolOutput(toolName, output, workspaceId),
  ]);

  if (actions.length > 0) {
    return [{
      id: `action-result-${randomUUID()}`,
      type: 'data-action_result',
      status: actions.some(action => action.status === 'error') ? 'error' : 'completed',
      label: 'Action result',
      summary: 'Workspace action result',
      actions,
      metadata: { toolName, actions },
    }];
  }

  const references = dedupeByHref([
    ...toWorkspaceReferences(output.sources || output.references),
    ...referencesFromToolOutput(toolName, output, workspaceId),
  ]);

  if (references.length === 0) return [];
  return [{
    id: `mcp-sources-${randomUUID()}`,
    type: 'data-mcp_sources',
    status: 'completed',
    label: 'Workspace sources',
    summary: 'Workspace data sources',
    references,
    metadata: { toolName, sources: references },
  }];
}

function recordsFromOutput(value: unknown): Record<string, any>[] {
  if (Array.isArray(value)) return value.flatMap(recordsFromOutput);
  if (!isRecord(value)) return [];
  const nestedKeys = ['items', 'results', 'data', 'projects', 'tasks', 'files', 'notes', 'channels', 'messages'];
  const nested = nestedKeys.flatMap(key => recordsFromOutput(value[key]));
  return nested.length > 0 ? nested : [value];
}

function entityTypeFromTool(toolName: string | undefined): string | undefined {
  if (!toolName) return undefined;
  const name = toolName.toLowerCase();
  if (name.includes('project')) return 'project';
  if (name.includes('task')) return 'task';
  if (name.includes('file')) return 'file';
  if (name.includes('note')) return 'note';
  if (name.includes('channel')) return 'channel';
  if (name.includes('message')) return 'message';
  if (name.includes('calendar') || name.includes('event')) return 'calendar_event';
  if (name.includes('call')) return 'video_call';
  return undefined;
}

function inferredEntity(record: Record<string, any>, toolName: string | undefined): { entityType?: string; entityId?: string } {
  const toolEntityType = entityTypeFromTool(toolName);
  if (toolEntityType) {
    const prefix = toolEntityType === 'calendar_event' ? 'event' : toolEntityType;
    const directKey = `${prefix}Id`;
    const snakeKey = `${prefix}_id`;
    if (typeof record[directKey] === 'string') return { entityType: toolEntityType, entityId: record[directKey] };
    if (typeof record[snakeKey] === 'string') return { entityType: toolEntityType, entityId: record[snakeKey] };
    if (typeof record.id === 'string') return { entityType: toolEntityType, entityId: record.id };
  }

  const keyMap: Array<[string, string]> = [
    ['projectId', 'project'], ['project_id', 'project'],
    ['taskId', 'task'], ['task_id', 'task'],
    ['fileId', 'file'], ['file_id', 'file'],
    ['noteId', 'note'], ['note_id', 'note'],
    ['channelId', 'channel'], ['channel_id', 'channel'],
    ['messageId', 'message'], ['message_id', 'message'],
    ['eventId', 'calendar_event'], ['event_id', 'calendar_event'],
  ];
  for (const [key, entityType] of keyMap) {
    if (typeof record[key] === 'string') return { entityType, entityId: record[key] };
  }

  const entityType = typeof record.entityType === 'string'
    ? record.entityType
    : typeof record.entity_type === 'string'
      ? record.entity_type
      : toolEntityType;
  const entityId = typeof record.entityId === 'string'
    ? record.entityId
    : typeof record.entity_id === 'string'
      ? record.entity_id
      : typeof record.id === 'string'
        ? record.id
        : undefined;
  return { entityType, entityId };
}

function entityHref(workspaceId: string, entityType: string | undefined, entityId: string | undefined, record: Record<string, any>): string | undefined {
  if (!workspaceId || !entityType || !entityId) return undefined;
  if (entityType === 'project') return `/workspaces/${workspaceId}/projects/${entityId}`;
  if (entityType === 'task') {
    const projectId = typeof record.projectId === 'string' ? record.projectId : typeof record.project_id === 'string' ? record.project_id : undefined;
    return projectId ? `/workspaces/${workspaceId}/projects/${projectId}?taskId=${entityId}` : `/workspaces/${workspaceId}/projects?taskId=${entityId}`;
  }
  if (entityType === 'file') return `/workspaces/${workspaceId}/files/${entityId}`;
  if (entityType === 'note') return `/workspaces/${workspaceId}/notes/${entityId}`;
  if (entityType === 'channel') return `/workspaces/${workspaceId}/chat/${entityId}`;
  if (entityType === 'message') {
    const channelId = typeof record.channelId === 'string' ? record.channelId : typeof record.channel_id === 'string' ? record.channel_id : undefined;
    return channelId ? `/workspaces/${workspaceId}/chat/${channelId}` : undefined;
  }
  if (entityType === 'calendar_event') return `/workspaces/${workspaceId}/calendar?eventId=${entityId}`;
  if (entityType === 'video_call') return `/workspaces/${workspaceId}/video-calls`;
  return undefined;
}

function referencesFromToolOutput(toolName: string | undefined, output: unknown, workspaceId: string): WorkspaceReferencePayload[] {
  return recordsFromOutput(output).reduce<WorkspaceReferencePayload[]>((acc, record) => {
    const { entityType, entityId } = inferredEntity(record, toolName);
    if (!entityType || !entityId) return acc;
    const title = typeof record.title === 'string'
      ? record.title
      : typeof record.name === 'string'
        ? record.name
        : `${entityType} ${entityId}`;
    acc.push({
      sourceType: 'mcp',
      entityType,
      entityId,
      title,
      href: typeof record.href === 'string' ? record.href : entityHref(workspaceId, entityType, entityId, record),
    });
    return acc;
  }, []);
}

function actionsFromToolOutput(toolName: string | undefined, output: unknown, workspaceId: string): WorkspaceActionPayload[] {
  if (!toolName || !ACTION_WORDS.some(word => toolName.toLowerCase().includes(word))) return [];
  return recordsFromOutput(output).reduce<WorkspaceActionPayload[]>((acc, record) => {
    const { entityType, entityId } = inferredEntity(record, toolName);
    const message = typeof record.message === 'string' ? record.message : typeof record.error === 'string' ? record.error : undefined;
    if (!entityType && !entityId && !message) return acc;
    const status = record.success === true || record.ok === true
      ? 'completed'
      : record.success === false || record.ok === false || record.error
        ? 'error'
        : typeof record.status === 'string'
          ? record.status
          : 'unknown';
    acc.push({
      toolName,
      action: ACTION_WORDS.find(word => toolName.toLowerCase().includes(word)),
      status,
      entityType,
      entityId,
      title: typeof record.title === 'string' ? record.title : typeof record.name === 'string' ? record.name : undefined,
      href: typeof record.href === 'string' ? record.href : entityHref(workspaceId, entityType, entityId, record),
      message,
    });
    return acc;
  }, []);
}

function dedupeByHref<T extends { href?: string; entityType?: string; entityId?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.href || `${item.entityType || ''}:${item.entityId || ''}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

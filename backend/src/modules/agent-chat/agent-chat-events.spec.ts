import {
  createNormalizationState,
  createRunCompletedEvent,
  normalizeAgentChatChunk,
} from './agent-chat-events';

describe('agent-chat event normalization', () => {
  it('normalizes session and streaming text chunks', () => {
    const state = createNormalizationState();

    const sessionEvents = normalizeAgentChatChunk(
      {
        type: 'data-session',
        data: { sessionId: 'session-1', runId: 'run-1' },
      },
      'ws-1',
      state,
    );

    expect(sessionEvents).toEqual([
      {
        type: 'session',
        data: { sessionId: 'session-1', runId: 'run-1' },
      },
    ]);

    const textEvents = normalizeAgentChatChunk(
      {
        type: 'text-delta',
        delta: 'Hello',
      },
      'ws-1',
      state,
    );

    expect(textEvents).toEqual([
      {
        type: 'message.part',
        data: {
          part: expect.objectContaining({
            id: 'assistant-text',
            type: 'text',
            status: 'running',
            text: 'Hello',
          }),
        },
      },
    ]);

    expect(createRunCompletedEvent(state)).toEqual({
      type: 'run.completed',
      data: {
        message: 'Hello',
        sessionId: 'session-1',
        runId: 'run-1',
      },
    });
  });

  it('normalizes tool results and derives workspace actions', () => {
    const state = createNormalizationState();

    normalizeAgentChatChunk(
      {
        type: 'tool-input-start',
        tool_call_id: 'tool-1',
        tool_name: 'create_project',
      },
      'ws-1',
      state,
    );

    normalizeAgentChatChunk(
      {
        type: 'tool-input-available',
        tool_call_id: 'tool-1',
        tool_name: 'create_project',
        input: { name: 'Roadmap' },
      },
      'ws-1',
      state,
    );

    const toolEvents = normalizeAgentChatChunk(
      {
        type: 'tool-output-available',
        tool_call_id: 'tool-1',
        output: {
          id: 'project-1',
          name: 'Roadmap',
          success: true,
        },
      },
      'ws-1',
      state,
    );

    expect(toolEvents[0]).toEqual({
      type: 'message.part',
      data: {
        part: expect.objectContaining({
          id: 'tool-1',
          type: 'tool-output',
          status: 'completed',
          toolName: 'create_project',
          input: { name: 'Roadmap' },
          output: { id: 'project-1', name: 'Roadmap', success: true },
        }),
      },
    });

    expect(toolEvents[1]).toEqual({
      type: 'message.part',
      data: {
        part: expect.objectContaining({
          type: 'data-action_result',
          actions: [
            expect.objectContaining({
              toolName: 'create_project',
              action: 'create',
              status: 'completed',
              entityType: 'project',
              entityId: 'project-1',
              href: '/workspaces/ws-1/projects/project-1',
            }),
          ],
        }),
      },
    });
  });

  it('normalizes upstream errors', () => {
    const state = createNormalizationState();

    const events = normalizeAgentChatChunk(
      {
        type: 'error',
        error_text: 'Upstream failed',
      },
      'ws-1',
      state,
    );

    expect(events).toEqual([
      {
        type: 'run.error',
        data: { error: 'Upstream failed' },
      },
    ]);
  });
});

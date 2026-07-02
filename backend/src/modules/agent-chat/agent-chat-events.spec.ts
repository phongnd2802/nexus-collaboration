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

  it('uses data-final_answer to complete the run without emitting a duplicate part', () => {
    const state = createNormalizationState();

    const finalAnswerEvents = normalizeAgentChatChunk(
      {
        type: 'data-final_answer',
        data: { content: 'Final answer', sessionId: 'session-1', runId: 'run-2' },
      },
      'ws-1',
      state,
    );

    expect(finalAnswerEvents).toEqual([]);
    expect(createRunCompletedEvent(state)).toEqual({
      type: 'run.completed',
      data: {
        message: 'Final answer',
        sessionId: 'session-1',
        runId: 'run-2',
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

  it('derives RAG sources from MCP search results and preserves source metadata', () => {
    const state = createNormalizationState();

    normalizeAgentChatChunk(
      {
        type: 'tool-input-start',
        tool_call_id: 'tool-rag',
        tool_name: 'nexus_search_files_rag',
      },
      'ws-1',
      state,
    );

    const toolEvents = normalizeAgentChatChunk(
      {
        type: 'tool-output-available',
        tool_call_id: 'tool-rag',
        output: {
          results: [
            {
              file_id: 'file-1',
              file_name: 'Roadmap.pdf',
              mime_type: 'application/pdf',
              score: 0.87,
              snippet: 'Roadmap source text',
              citation: 'Roadmap.pdf, page 2',
              retrieval_mode: 'hybrid',
              page_numbers: [2],
              bbox_refs: [{ page_number: 2, bbox: [0, 0, 10, 10] }],
            },
            {
              file_id: 'file-1',
              file_name: 'Roadmap.pdf',
              mime_type: 'application/pdf',
              score: 0.81,
              snippet: 'Different source text from the same file',
              citation: 'Roadmap.pdf, page 3',
              retrieval_mode: 'hybrid',
              page_numbers: [3],
              bbox_refs: [{ page_number: 3, bbox: [1, 1, 11, 11] }],
            },
          ],
        },
      },
      'ws-1',
      state,
    );

    expect(toolEvents[1]).toEqual({
      type: 'message.part',
      data: {
        part: expect.objectContaining({
          type: 'data-rag_sources',
          references: [
            expect.objectContaining({
              entityType: 'file',
              entityId: 'file-1',
              fileId: 'file-1',
              mimeType: 'application/pdf',
              title: 'Roadmap.pdf',
              href: '/workspaces/ws-1/files/all-files?fileId=file-1',
              snippet: 'Roadmap source text',
              citation: 'Roadmap.pdf, page 2',
              score: 0.87,
              pageNumbers: [2],
              bboxRefs: [{ page_number: 2, bbox: [0, 0, 10, 10] }],
              retrievalMode: 'hybrid',
            }),
            expect.objectContaining({
              fileId: 'file-1',
              snippet: 'Different source text from the same file',
              pageNumbers: [3],
            }),
          ],
        }),
      },
    });
  });

  it('keeps legacy search_rag sources working', () => {
    const state = createNormalizationState();

    normalizeAgentChatChunk(
      {
        type: 'tool-input-start',
        tool_call_id: 'tool-legacy-rag',
        tool_name: 'search_rag',
      },
      'ws-1',
      state,
    );

    const toolEvents = normalizeAgentChatChunk(
      {
        type: 'tool-output-available',
        tool_call_id: 'tool-legacy-rag',
        output: {
          sources: [
            {
              title: 'Legacy source',
              href: '/legacy',
              snippet: 'Legacy source text',
            },
          ],
        },
      },
      'ws-1',
      state,
    );

    expect(toolEvents[1]).toEqual({
      type: 'message.part',
      data: {
        part: expect.objectContaining({
          type: 'data-rag_sources',
          references: [
            expect.objectContaining({
              title: 'Legacy source',
              href: '/legacy',
              snippet: 'Legacy source text',
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

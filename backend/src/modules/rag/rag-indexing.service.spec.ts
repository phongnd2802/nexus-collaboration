import { RagIndexingService } from './rag-indexing.service';

describe('RagIndexingService searchFiles', () => {
  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        NEXUS_AI_BASE_URL: 'http://nexus-ai.test',
        NEXUS_INTERNAL_API_KEY: 'internal-key',
      };
      return values[key] ?? fallback;
    }),
  };

  const db = {
    findOne: jest.fn(),
    findMany: jest.fn(),
    query: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    db.findOne.mockResolvedValue({ role: 'admin' });
    db.findMany.mockResolvedValue([{ id: 'file-1' }]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns raw chunk content and uses it for snippet before contextual chunk_text', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            file_id: 'file-1',
            file_name: 'Plan.pdf',
            mime_type: 'application/pdf',
            score: 0.9,
            raw_text: 'Raw chunk content',
            content: 'Raw content fallback',
            chunk_text: 'Contextual header\n\nRaw chunk content',
            citation: 'Plan.pdf, page 2',
            retrieval_mode: 'hybrid',
            page_numbers: [2],
          },
        ],
      }),
    } as Response);

    const service = new RagIndexingService(db as any, configService as any);

    const response = await service.searchFiles('ws-1', 'project plan', 5, 0.5, 'user-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://nexus-ai.test/rag/internal/search',
      expect.objectContaining({
        body: JSON.stringify({
          workspace_id: 'ws-1',
          query: 'project plan',
          limit: 5,
          min_score: 0.5,
          file_ids: ['file-1'],
        }),
      }),
    );
    expect(response.results[0]).toEqual(
      expect.objectContaining({
        file_id: 'file-1',
        content: 'Raw chunk content',
        snippet: 'Raw chunk content',
      }),
    );
  });

  it('falls back to contextual chunk_text when raw content is unavailable', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            file_id: 'file-1',
            file_name: 'Plan.pdf',
            mime_type: 'application/pdf',
            score: 0.9,
            chunk_text: 'Contextual only content',
            page_numbers: [],
          },
        ],
      }),
    } as Response);

    const service = new RagIndexingService(db as any, configService as any);

    const response = await service.searchFiles('ws-1', 'project plan', 5, 0.5, 'user-1');

    expect(response.results[0]).toEqual(
      expect.objectContaining({
        content: 'Contextual only content',
        snippet: 'Contextual only content',
      }),
    );
  });
});

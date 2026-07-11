import { AgentChatService } from './agent-chat.service';

describe('AgentChatService header forwarding', () => {
  it('forwards timezone to Nexus AI when present', () => {
    const service = new AgentChatService({ get: jest.fn() } as any);

    const headers = (service as any).buildHeaders({
      workspaceId: 'workspace-1',
      requestId: 'req-1',
      userId: 'user-1',
      timezone: 'Asia/Ho_Chi_Minh',
      accept: 'text/event-stream',
    });

    expect(headers['X-Nexus-Workspace-ID']).toBe('workspace-1');
    expect(headers['X-Nexus-Request-ID']).toBe('req-1');
    expect(headers['X-Nexus-User-ID']).toBe('user-1');
    expect(headers['X-Nexus-Timezone']).toBe('Asia/Ho_Chi_Minh');
  });
});

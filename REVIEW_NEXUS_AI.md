# Review Nexus AI cho production/MVP release

Ngày review: 2026-07-01

## Phạm vi

Review tập trung vào:

- `nexus-ai`: runtime Pydantic AI, API streaming, settings, storage, policies/capabilities, tests.
- Backend giao tiếp với `nexus-ai`: `agent-chat` proxy, guard auth/workspace, RAG service đang gọi sang Nexus AI.
- Frontend giao tiếp với `nexus-ai`: API client `ai-chat-api`, state/UI AI chat.

Không review sâu toàn bộ domain tool của `nexus-mcp`, nhưng có kiểm tra đường auth `frontend -> backend -> nexus-ai -> nexus-mcp -> backend` vì nó quyết định khả năng ship production.

## Kết luận ngắn

Chưa nên ship production theo trạng thái hiện tại nếu bật AI Chat như một feature chính. MVP đã chốt theo hướng full-capability: AI Chat, RAG, CodeMode, Langfuse, tất cả MCP tools, private chat history theo user, và storage riêng cho `nexus-ai` bằng Postgres.

Vì MVP cho phép cả write/destructive tools nhưng chưa làm approval flow, các điều kiện bắt buộc để giảm rủi ro là: JWT verify bằng `JWT_SECRET`, kiểm workspace/user permission end-to-end, audit log mọi tool call, storage per-user trên Postgres riêng, và RAG route phải khớp contract backend hiện tại.

Các vấn đề lớn nhất:

- Storage hội thoại/memory dùng SQLite file cục bộ, không phù hợp scale nhiều replica và cần backup/retention rõ ràng.
- Backend RAG đang gọi endpoint `/rag/internal/*` trên `nexus-ai`, nhưng source `nexus-ai` hiện không expose các route này.

## Quyết định MVP đã chốt

- Auth: dùng JWT verify bằng `JWT_SECRET`, không dùng decode-only.
- Tools: cho phép tất cả MCP tools trong MVP, bao gồm write/destructive tools.
- Approval: chưa làm approval flow trong MVP.
- Audit: phải có audit log cho mọi tool call, đặc biệt write/destructive calls.
- RAG: nằm trong MVP; giữ flow backend hiện tại và chỉnh `nexus-ai` để expose đúng contract `/rag/internal/*`.
- Chat history: private theo user, không shared workspace-wide.
- Storage: chuyển session/memory từ SQLite sang Postgres database/schema riêng cho `nexus-ai`, dựng thêm một Postgres container trong `docker-compose`.
- Deployment production: chưa cần làm ngay ở thời điểm hiện tại.
- CodeMode: bật trong MVP.
- Langfuse: bật trong MVP.
- Timeout budget: không cần product-level timeout/cost budget trong MVP.
- Model/provider: dùng OpenRouter; model lấy từ env.

## Plan MVP đã chốt

### Phase 1 - Auth và tenant isolation

Mục tiêu: mọi request AI/MCP phải chạy dưới user thật đã verify và workspace membership hợp lệ.

- Sửa backend `AuthGuard` dùng `jwtService.verify(token, { secret: JWT_SECRET })` hoặc config tương đương.
- Bắt buộc env `JWT_SECRET` khi app chạy ngoài development.
- Test reject forged token, expired token, token sai secret.
- Giữ `WorkspaceGuard` nhưng giảm log PII.
- Truyền `x-nexus-user-id`, `x-nexus-workspace-id`, `x-nexus-request-id` xuyên suốt backend -> `nexus-ai` -> `nexus-mcp`.

### Phase 2 - Postgres riêng cho `nexus-ai`

Mục tiêu: session/memory/event/approval decision không còn phụ thuộc SQLite local file.

- Thêm Postgres container riêng trong `docker-compose`, ví dụ `nexus-ai-postgres`.
- Thêm env cho `nexus-ai`: `NEXUS_AI_DATABASE_URL`.
- Implement Postgres store tương đương schema hiện tại: `sessions`, `chat_messages`, `chat_events`, `approval_decisions`, `memories`.
- `list_sessions`, `get_session`, `delete_session`, `snapshot`, `get_message_history`, `save_message_history` filter theo `workspace_id + user_id`.
- `memories` cũng phải scope theo `workspace_id + user_id + session_id` nếu memory là private theo user.
- Giữ SQLite store cho test/local fallback nếu cần, nhưng production config dùng Postgres.

### Phase 3 - RAG theo contract backend hiện tại

Mục tiêu: không đổi flow backend; `nexus-ai` phải đáp ứng route backend đang gọi.

- Implement trong `nexus-ai` các route:
  - `POST /rag/internal/search`
  - `POST /rag/internal/workspaces/{workspace_id}/files/{file_id}/index`
- Route internal phải validate `X-API-Key`, `X-Nexus-Source`, `X-Nexus-Workspace-ID`.
- Giữ backend enqueue/trigger flow hiện tại trong `RagIndexingService`.
- Nếu trong `nexus_ai` đã có thư mục/module RAG, chỉnh adapter/API layer để khớp route hiện có thay vì đổi backend flow.
- Thêm contract test: backend trigger index/search gọi đúng route và `nexus-ai` trả status/payload đúng.

### Phase 4 - Full tools + audit log

Mục tiêu: cho phép tất cả tools nhưng có khả năng truy vết production.

- Không bật approval gating trong MVP.
- Không block write/destructive tools bằng policy mặc định.
- Thêm audit log cho mọi MCP tool call: request id, workspace id, user id, session id, tool name, args redacted, status, latency, error, result summary redacted.
- Với destructive/write tools, audit thêm marker `is_write_tool`, `is_destructive_tool`.
- Audit log lưu vào Postgres riêng của `nexus-ai` hoặc backend audit table; ưu tiên Postgres `nexus-ai` để triển khai nhanh, nhưng cần request id để join với backend logs.
- Không log full token, token prefix, secrets, raw file content, raw prompt dài.

### Phase 5 - CodeMode và Langfuse

Mục tiêu: bật tính năng đã chốt nhưng có guardrails tối thiểu.

- Bật CodeMode bằng env, ví dụ `NEXUS_AI_ENABLE_CODE_MODE=true`.
- Đảm bảo CodeMode dùng runtime dir scoped theo `workspace_id/session_id/user_id`.
- Không truyền secrets không cần thiết vào CodeMode environment.
- Bật Langfuse bằng `NEXUS_AI_ENABLE_LANGFUSE=true`.
- Gắn trace attributes: `workspace_id`, `user_id`, `session_id`, `request_id`, `model`, `environment`.
- Redact prompt/tool payload nhạy cảm trước khi log/trace nếu SDK cho phép.

### Phase 6 - Streaming/error hardening

Mục tiêu: frontend không hiểu nhầm lỗi upstream là completed.

- Backend không emit `run.completed` khi upstream stream gãy chưa có final/done.
- Frontend coi unexpected stream end là error/stopped thay vì success rỗng.
- Validate request body và empty prompt trước khi tạo session/run.
- Forward client disconnect từ backend sang upstream `nexus-ai`.

## Kiến trúc hiện tại

Luồng AI Chat:

1. Frontend gọi `/api/v1/agent-chat/ui/workspaces/:workspaceId/...` với `Accept: text/event-stream`.
2. Backend `AgentChatController` chạy `AuthGuard` + `WorkspaceGuard`, rồi proxy sang `NEXUS_AI_BASE_URL`.
3. Backend `AgentChatService` normalize SSE từ upstream thành event `session`, `message.part`, `run.error`, `run.completed`.
4. `nexus-ai` tạo/lấy session trong SQLite, chạy `runtime.agent.run_stream_events(...)`, stream Pydantic AI events.
5. Agent dùng MCP capability để gọi `nexus-mcp`; `nexus-mcp` gọi backend bằng user bearer token + internal API key.

Điểm tốt:

- Có separation khá rõ: backend chịu auth/workspace, `nexus-ai` chịu agent runtime, `nexus-mcp` chịu tool bridge.
- Frontend đã có streaming UI, session list/detail/delete, stop stream bằng `AbortController`.
- Có test cơ bản cho `nexus-ai` agent-chat route/store và backend event normalization.
- MCP request có workspace header và `nexus-mcp` kiểm workspace mismatch trong path.

## Blocking trước khi release

### 1. Phải verify JWT trong backend `AuthGuard`

Hiện `AuthGuard` dùng `this.jwtService.decode(token)` và tự check `exp`, không verify signature. File: `backend/src/common/guards/auth.guard.ts:23`.

Rủi ro production:

- Kẻ tấn công có thể tự tạo JWT payload với `userId` bất kỳ nếu endpoint backend public.
- `WorkspaceGuard` sẽ query membership theo `userId` từ payload không tin cậy.
- AI/MCP chain truyền token này xuống MCP/backend, làm các tool workspace action dựa trên identity giả.

Đề xuất:

- Thay decode bằng verify với secret/public key/JWKS đúng issuer đang phát token.
- Validate ít nhất: signature, `exp`, `iss`, `aud`, `sub/userId`.
- Nếu token đến từ Supabase/Auth provider, dùng SDK/JWKS verifier thay vì Nest `decode`.
- Thêm test: forged unsigned JWT không được qua `AuthGuard`.

Không nên ship AI Chat production trước khi sửa mục này.


### 2. Storage SQLite cục bộ cần quyết định rõ cho MVP

`nexus-ai` lưu `sessions`, `chat_messages`, `chat_events`, `approval_decisions`, `memories` trong SQLite file. File: `nexus-ai/src/nexus_ai/storage/sqlite.py:11`.

Rủi ro production:

- Không scale nhiều replica nếu không dùng shared volume có lock semantics phù hợp.
- Mất lịch sử chat nếu container/volume không persistent hoặc backup.
- User-level isolation chưa chặt: list/get/delete session filter theo workspace, không filter theo user. Có thể là chủ đích workspace-shared chat, nhưng hiện UI/UX có vẻ là conversation cá nhân.

Đề xuất MVP:

- MVP đã chốt chuyển chat/session/memory sang Postgres riêng cho `nexus-ai`.
- Session là private theo user: filter `list_sessions/get_session/delete_session` theo `workspace_id + user_id`.
- SQLite chỉ nên giữ làm local/test fallback nếu cần.

### 3. Contract RAG đang lệch implementation

Backend RAG service gọi:

- `POST {NEXUS_AI_BASE_URL}/rag/internal/search`
- `POST {NEXUS_AI_BASE_URL}/rag/internal/workspaces/:workspaceId/files/:fileId/index`

File: `backend/src/modules/rag/rag-indexing.service.ts:180`, `backend/src/modules/rag/rag-indexing.service.ts:317`.

Trong `nexus-ai/src/nexus_ai/api.py`, route hiện chỉ có `/health` và `/agent-chat/*`. File: `nexus-ai/src/nexus_ai/api.py:128`.

Rủi ro production:

- Upload file sẽ enqueue job rồi trigger AI index fail 404, chỉ log warn.
- Search/RAG silently degrade thành empty result.
- Frontend badge/status có thể gây hiểu nhầm nếu job không bao giờ indexed.

Đề xuất MVP:

- RAG đã nằm trong MVP: implement route internal trên `nexus-ai` theo đúng contract backend hiện tại; thêm contract test backend -> nexus-ai.
- Không đổi backend enqueue/search flow nếu không cần thiết.

### 4. Approval/write-tool safety chưa hoàn chỉnh

Có endpoint lưu approval decision tại `nexus-ai/src/nexus_ai/api.py:95`, nhưng chưa thấy tool execution nào chờ approval. `ToolGuard(require_approval=[])` đang không yêu cầu approval. File: `nexus-ai/src/nexus_ai/capabilities/ecosystem.py:44`.

Rủi ro production:

- Destructive/write actions qua MCP có thể chạy ngay nếu model gọi tool.
- Frontend `activeApprovalItemId` hardcode `null`; approval UX chưa hoạt động.

Đề xuất MVP:

- MVP đã chốt cho phép tất cả tools và chưa làm approval flow.
- Bù lại bắt buộc audit log mọi tool call, phân loại `is_write_tool`/`is_destructive_tool`, redact args/result nhạy cảm, và đảm bảo permission dựa trên JWT đã verify.
- Cần chấp nhận rủi ro product: model có thể thực hiện write/destructive action nếu user có quyền và MCP expose tool tương ứng.

## High priority nên sửa trước MVP

### 1. Không log token prefix trong production

`nexus-ai` log `effective_token_prefix` và `nexus-mcp` log bearer token prefix. File: `nexus-ai/src/nexus_ai/api.py:161`.

Đề xuất:

- Bỏ token prefix khỏi log hoặc chỉ log hash one-way ngắn khi debug local.
- Dùng structured logger có redaction thay vì `print`.

### 2. Không swallow upstream SSE parse/error quá im lặng

Backend `AgentChatService.streamNormalizedEvents` ignore JSON parse errors và nếu upstream đóng mà chưa `[DONE]` thì vẫn emit `run.completed`. File: `backend/src/modules/agent-chat/agent-chat.service.ts:159`, `backend/src/modules/agent-chat/agent-chat.service.ts:173`.

Rủi ro:

- Upstream crash giữa chừng nhưng UI thấy completed với message rỗng/partial.

Đề xuất:

- Nếu upstream status không ok hoặc stream kết thúc không có done/final/error, emit `run.error`.
- Log parse error với request id, không cần payload thô nếu có PII.
- Frontend cũng nên coi stream kết thúc không completed là error hoặc stopped, không phải success. File: `frontend/src/lib/api/ai-chat-api.ts:466`.

### 3. Validate request body và empty prompt

`nexus-ai` `_last_user_text` trả `""` nếu body sai/không có user message, nhưng vẫn tạo session và gọi agent với empty prompt. File: `nexus-ai/src/nexus_ai/api.py:183`.

Đề xuất:

- Trả 400/SSE error nếu thiếu `messages` hoặc last user text empty.
- Limit message length và số messages gửi từ frontend.
- Gọi guardrail trước khi agent run, không chỉ expose `validate_prompt` như tool tùy model gọi.

### 4. Dùng route/session ownership rõ ràng

Session API hiện filter theo workspace, không user. Nếu AI chat là private conversation, user A trong workspace có thể list/get/delete session của user B nếu biết id hoặc list endpoint trả tất cả.

Đề xuất:

- MVP private: filter theo `workspace_id + user_id`.
- Workspace-shared: UI phải hiển thị owner, quyền delete, audit.

### 5. Backend proxy cần forward client disconnect

Frontend abort chỉ cắt browser request. Backend hiện không truyền abort từ `res close` tới upstream fetch. File: `backend/src/modules/agent-chat/agent-chat.service.ts:29`.

Đề xuất:

- Tạo `AbortController`; `res.on('close', () => controller.abort())`.
- Truyền `signal` vào fetch upstream.
- `nexus-ai` cần handle cancellation và không lưu assistant message incomplete như completed.

## MVP scope đã chốt

Ship MVP với phạm vi:

- AI Chat theo workspace, streaming answer.
- Cho phép tất cả MCP tools, bao gồm read/write/destructive theo quyền user.
- Session history per-user, persistent.
- RAG indexing/search nằm trong MVP, route `nexus-ai` phải khớp backend contract hiện tại.
- Chưa làm approval flow.
- Bật CodeMode.
- Bật Langfuse.
- Audit log mọi tool call.
- Observability tối thiểu: request id, workspace id, user id, status, latency, model, error category; không log token/prompt full mặc định.

Feature flag khuyến nghị:

- `AI_CHAT_ENABLED=true`
- `NEXUS_RAG_ENABLED=true`
- `NEXUS_AI_ENABLE_CODE_MODE=true`
- `NEXUS_AI_ENABLE_LANGFUSE=true`
- `NEXUS_AI_AUDIT_TOOL_CALLS=true`
- `NEXUS_AI_DATABASE_URL=postgres://...` trỏ Postgres riêng của `nexus-ai`
- `JWT_SECRET` bắt buộc ở backend

## Chỉnh sửa cụ thể đề xuất

### Backend

- Sửa `AuthGuard` verify JWT signature.
- Thêm abort khi client disconnect cho `AgentChatService.proxy`; không thêm product-level timeout budget trong MVP.
- Không emit `run.completed` nếu upstream bị lỗi/stream gãy không có completion.
- Add DTO validation cho `agent-chat` body hoặc validate trước khi proxy.
- Thêm config required check ở startup: production phải có `NEXUS_AI_BASE_URL`, không dùng default `127.0.0.1`.
- Giảm logging nhạy cảm trong `WorkspaceGuard`; hiện log full user object và membership query có thể chứa PII.

### Nexus AI

- Add `Dockerfile` và production entrypoint bind `0.0.0.0`.
- Không enforce product-level timeout/cost budget trong MVP theo quyết định đã chốt.
- Validate body và prompt trước run.
- Áp dụng input guard trực tiếp trước agent, không phụ thuộc model gọi `validate_prompt`.
- Chọn storage production: Postgres riêng cho `nexus-ai`.
- Implement route RAG internal theo contract backend hiện tại.
- Bật CodeMode theo scope đã chốt; đảm bảo runtime dir scoped và không leak secrets.
- Cho phép write tools theo scope đã chốt, nhưng thêm audit log bắt buộc và redaction.
- Thêm structured logging + metrics.

### Nexus MCP

- Không log token prefix.
- Đảm bảo `NEXUS_API_KEY` dùng internal key mạnh, không default `change-me` trong production.
- Không block tools trong MVP; thêm audit metadata và giữ workspace/user permission enforcement.
- Contract test tool workspace mismatch và user permission.

### Frontend

- Treat unexpected stream end as error/stopped, không success rỗng.
- Hiển thị trạng thái service unavailable rõ khi backend trả 502/timeout.
- Không gửi toàn bộ transcript quá dài; backend/AI đã có history, frontend chỉ cần last message + session id sau khi session tồn tại.
- Ẩn approval-related state vì MVP chưa làm approval flow.
- Sessions per-user theo scope đã chốt; không cần owner/permission affordance cho shared workspace history.

## Test cần có trước release

- Backend auth: reject forged JWT, expired JWT, token ký sai `JWT_SECRET`.
- Backend workspace: user không thuộc workspace không gọi được agent-chat.
- Contract stream: upstream text/tool/error/final -> backend normalized events -> frontend parser.
- Cancellation: frontend abort -> backend abort upstream -> nexus-ai run cancelled.
- Multi-tenant: user/workspace A không list/get/delete session B.
- Tool audit: write/destructive tool được phép chạy nhưng phải có audit log, marker, redaction.
- RAG enabled: route exists và job status/search trả đúng contract.

## Checklist ship MVP

- [ ] JWT verify signature trong backend.
- [ ] Postgres container/database riêng cho `nexus-ai`.
- [ ] `nexus-ai` dùng Postgres store cho session/memory/event.
- [ ] Session history private theo `workspace_id + user_id`.
- [ ] RAG internal routes trong `nexus-ai` khớp backend contract hiện tại.
- [ ] Client cancel/disconnect hoạt động end-to-end.
- [ ] Full tools enabled, chưa approval flow.
- [ ] Audit log mọi tool call, có marker write/destructive và redaction.
- [ ] CodeMode enabled với runtime dir scoped và không leak secrets.
- [ ] Langfuse enabled với trace attributes/redaction.
- [ ] Logs không chứa token prefix/full user object/prompt nhạy cảm mặc định.
- [ ] Contract tests pass cho stream/session/error.
- [ ] Contract tests pass cho RAG index/search.

## Đánh giá release

Khuyến nghị: ship MVP sau khi hoàn thành các mục blocking và các quyết định đã chốt ở trên. Với scope hiện tại, release chấp nhận rủi ro cao hơn read-only MVP vì cho phép tất cả tools và chưa có approval flow.

Release tối thiểu cần có:

- JWT verify bằng `JWT_SECRET`.
- Postgres riêng cho `nexus-ai`, private session per-user.
- RAG enabled đúng contract backend hiện tại.
- Full tools enabled kèm audit log bắt buộc.
- CodeMode enabled nhưng scoped runtime và không leak secrets.
- Langfuse enabled với redaction.
- Streaming/error handling không báo success giả khi upstream lỗi.

Rủi ro còn lại được chấp nhận cho MVP: không có approval flow, không có timeout/cost budget product-level, và model có thể thực hiện write/destructive action nếu user có quyền.

# Nexus Backend Documentation

## Mục lục
1. [Tech Stack Tổng Quan](#1-tech-stack-tổng-quan)
2. [Cấu Trúc Thư Mục](#2-cấu-trúc-thư-mục)
3. [Kiến Trúc Hệ Thống](#3-kiến-trúc-hệ-thống)
4. [Nhiệm Vụ Các Module](#4-nhiệm-vụ-các-module)
5. [Các File Script Quan Trọng](#5-các-file-script-quan-trọng)
6. [Các Điểm Đặc Biệt](#6-các-điểm-đặc-biệt)

---

## 1. Tech Stack Tổng Quan

| Thành phần | Công nghệ |
|------------|-----------|
| Framework | **NestJS 11** + TypeScript |
| Database | **PostgreSQL** (raw SQL qua `pg`, 148+ bảng) |
| Cache / Pub-Sub | **Redis** (`ioredis`) |
| Vector DB | **Qdrant** (cho AI semantic search) |
| Real-time | **Socket.io / WebSockets** |
| AI / LLM | **LangChain + OpenAI** (có hỗ trợ nhiều provider) |
| API Docs | **Swagger / OpenAPI** |
| Testing | **Jest** |
| Container | **Docker** (multi-stage build) |

---

## 2. Cấu Trúc Thư Mục

```
backend/
├── src/                              # Source code chính
│   ├── main.ts                       # Entry point, bootstrap NestJS app
│   ├── app.module.ts                 # Root module, import toàn bộ 57 modules
│   ├── database/
│   │   └── schema.ts                 # Định nghĩa schema 148+ bảng PostgreSQL (~4350 dòng)
│   ├── common/                       # Shared code toàn hệ thống
│   │   ├── decorators/               # Custom decorators (Auth, Roles, v.v.)
│   │   ├── filters/                  # Exception filters
│   │   ├── guards/                   # Auth guards, Permission guards
│   │   ├── interceptors/             # Logging, Transform interceptors
│   │   ├── validators/               # Custom class validators
│   │   ├── interfaces/               # Shared TypeScript interfaces
│   │   ├── gateways/                 # WebSocket global setup & adapters
│   │   └── common.module.ts
│   ├── constants/
│   │   └── upload.ts                 # Constants cho file upload
│   └── modules/                      # 57 modules chức năng
├── scripts/                          # Utility & setup scripts
│   ├── setup.ts                      # Interactive CLI wizard cấu hình first-run
│   ├── migrate.js                    # Database migration runner
│   ├── convert-schema-to-sql.js      # Convert schema.ts sang SQL
│   ├── generate-integrations-seed.js # Generate seed data cho integration catalog
│   ├── smoke-test-*.ts               # Test kết nối providers (AI, auth, email, push, search, storage)
│   └── integration-data/             # Data definitions cho 175+ integrations
├── migrations/                       # SQL migration files
│   ├── 001_initial.sql               # ~177KB schema khởi tạo
│   └── 002_auth_users.sql
├── test/                             # Test helpers & setup
├── docs/providers/                   # Tài liệu setup providers
│   ├── ai.md, auth-sso.md, email.md, push.md, search.md, storage.md
├── package.json, tsconfig.json, nest-cli.json
├── Dockerfile                        # Multi-stage Docker build (base/deps/build/dev/prod)
├── .env.example                      # Template cấu hình môi trường đầy đủ
├── README.md, MIGRATION.md
└── jest.config.js, eslint.config.js
```

---

## 3. Kiến Trúc Hệ Thống

### 3.1. Layered Architecture (NestJS Standard)

```
HTTP Request / WebSocket Event
    |
Controllers (REST API + WebSocket Gateways)
    |
Services (Business Logic)
    |
Database Service / External APIs (pg, Redis, Qdrant, S3, OpenAI, v.v.)
```

### 3.2. Pluggable Provider Pattern (Strategy Pattern)

Hệ thống sử dụng **Strategy Pattern** cho infrastructure, cho phép thay đổi provider mà không đổi code business logic:

| Loại | Interface | Các Implementation |
|------|-----------|--------------------|
| **Storage** | `StorageProvider` | Local filesystem, S3/R2/MinIO, Google Cloud Storage, Azure |
| **AI** | `AiProviderService` | OpenAI, Anthropic, Gemini, Ollama, Groq |
| **Search** | `SearchProvider` | PostgreSQL trigram (default), Meilisearch, Typesense |
| **Email** | `EmailProvider` | SMTP, Resend, SendGrid, Postmark, AWS SES, Mailgun |
| **Push Notification** | `PushProvider` | WebPush, FCM, OneSignal, Expo |
| **Auth SSO** | Pluggable registry | Local, Google, GitHub, GitLab, Magic Link, Keycloak, Clerk, Auth0 |

### 3.3. AI & Automation Architecture

```
User Request
    |
AI Module (Router/Orchestrator)
    |
Autopilot (LangChain Agent)
    |---> AgentMemoryService          # Lưu trữ context hội thoại
    |---> AgentToolsService           # Gọi các module: chat, files, calendar, projects, budget, approvals...
    |---> ScheduledActionsService     # Thực hiện tác vụ theo lịch
    |---> ProactiveModule             # Daily briefings, deadline alerts
    |
SuperAgentMemory (Long-term memory)
    |
Qdrant (Vector store cho semantic search)
```

### 3.4. Integration Framework Architecture

```
IntegrationFrameworkModule
    |
CatalogService (175+ integrations metadata)
ConnectionService (User OAuth connections)
GenericOAuthService (OAuth flow abstraction)
    |
Per-App Modules (Slack, GitHub, Jira, Notion, Google Drive, v.v.)
    |
External APIs
```

### 3.5. Module Dependencies

- `AppModule` là root, import toàn bộ 57 modules.
- `DatabaseModule`, `RedisModule`, `AiProviderModule` là **Global modules** (dùng ở mọi nơi không cần import lại).
- Một số module dùng `forwardRef()` để tránh **circular dependencies** (đặc biệt giữa AI, Autopilot, Workflows).
- `EventEmitterModule` dùng cho internal events (trigger workflow).
- `WebSocketModule` cung cấp global Socket.io adapter.

### 3.6. Real-Time Communication

- **Socket.io** với global `IoAdapter`
- Gateways riêng cho từng feature:
  - `AppGateway` (global presence)
  - `ChatGateway` (real-time messaging)
  - `NotificationsGateway` (push notifications)
  - `VideoCallsGateway` + `TranscriptionGateway`
  - `WhiteboardCollaborationGateway` (Yjs-based)
  - `NoteCollaborationGateway`

---

## 4. Nhiệm Vụ Các Module

### 4.1. Core Infrastructure

| Module | Nhiệm vụ |
|--------|----------|
| `database` | PostgreSQL connection pool (global), raw SQL queries, query builder |
| `redis` | Redis cache & pub/sub (global) |
| `storage` | File storage abstraction (pluggable) |
| `ai-provider` | AI provider factory |
| `search-provider` | Search provider factory |
| `email` | Email provider factory |
| `push` | Push notification provider factory |
| `health` | Health check endpoints |

### 4.2. Workspace & Collaboration

| Module | Nhiệm vụ |
|--------|----------|
| `workspace` | Workspace CRUD, members, invitations, roles |
| `chat` | Real-time messaging, channels |
| `notifications` | In-app notifications, Firebase push |
| `events` | Event streaming, real-time updates |
| `settings` | Workspace/user settings |

### 4.3. Productivity & Project Management

| Module | Nhiệm vụ |
|--------|----------|
| `projects` | Projects, sprints, tasks, comments, Kanban boards |
| `calendar` | Events, scheduling, bot reminders, Google Calendar sync |
| `notes` | Notes CRUD, collaboration, PDF/URL import |
| `documents` | Document management |
| `whiteboards` | Collaborative whiteboards |
| `forms` | Form builder, public forms, responses, analytics |
| `templates` | 1000+ document templates theo ngành (business, legal, HR, finance...) |
| `signatures` | Digital signatures |

### 4.4. AI & Automation

| Module | Nhiệm vụ |
|--------|----------|
| `ai` | AI orchestration, routing requests |
| `autopilot` | LangChain-based AI agent tự động thực hiện tác vụ |
| `conversation-memory` | Lưu trữ context hội thoại AI |
| `super-agent-memory` | Memory system nâng cao |
| `bots` | Bot management & seeding |
| `workflows` | Automation: triggers, conditions, actions, webhooks |
| `automation-core` | Core engine cho automation |
| `scheduler` | Cron jobs, scheduled messages, recording processor |

### 4.5. Integrations (20+ Apps)

| Module | Nhiệm vụ |
|--------|----------|
| `integration-framework` | Unified catalog (175+ integrations), connection management, generic OAuth |
| `slack` / `slack-whiteboard` / `slack-projects` / `slack-calendar` | Slack bot & bridges |
| `twitter` | Twitter/X OAuth & API |
| `telegram` | Telegram bot |
| `github` | GitHub integration |
| `google-drive` / `google-sheets` | Google Workspace |
| `dropbox` | Dropbox OAuth & file ops |
| `asana` / `clickup` / `jira` / `linear` / `trello` / `notion` | PM tools |
| `youtube` | YouTube integration |
| `hubspot` / `shopify` | CRM / E-commerce |
| `discord` | Discord integration |

### 4.6. Communication & Media

| Module | Nhiệm vụ |
|--------|----------|
| `video-calls` | Video conferencing: LiveKit, Agora, Daily, Jitsi, Whereby; transcription; recording |
| `contact` | Contact/CRM cơ bản |

### 4.7. Business & Admin

| Module | Nhiệm vụ |
|--------|----------|
| `analytics` | Analytics & reporting |
| `dashboard` | Dashboard statistics, AI suggestions |
| `monitoring` | System monitoring |
| `budget` | Budget tracking |
| `approvals` | Approval workflows |
| `blog` | Blog/CMS |
| `seo` | Sitemap, RSS, robots.txt, metadata |
| `crypto` | Cryptocurrency features |
| `feedback` | User feedback |
| `openai` | Direct OpenAI service wrapper |

---

## 5. Các File Script Quan Trọng

### 5.1. Build & Run Scripts (`package.json`)

| Script | Lệnh | Mô tả |
|--------|------|-------|
| `npm run build` | `nest build` | Compile TypeScript |
| `npm run start:dev` | `nest start --watch` | Development mode với watch |
| `npm run start:prod` | `node dist/main` | Production mode |
| `npm run test` | `jest` | Unit tests |
| `npm run test:e2e` | `jest --config ./test/jest-e2e.json` | End-to-end tests |
| `npm run test:oauth` | — | Test OAuth integrations |
| `npm run test:integrations` | — | Test integration-framework |

### 5.2. Database Scripts

| File | Mô tả |
|------|-------|
| `scripts/setup.ts` | Interactive CLI wizard: hướng dẫn cấu hình `.env`, chọn providers (ưu tiên zero-infra defaults) |
| `scripts/migrate.js` | Migration runner: đọc file `.sql` trong `migrations/`, track trong bảng `_migrations`, chạy transaction-safe |
| `scripts/convert-schema-to-sql.js` | Convert `src/database/schema.ts` sang SQL migration |
| `scripts/generate-integrations-seed.js` | Generate seed data cho integration catalog |

### 5.3. Smoke Test Scripts (Test kết nối providers)

| File | Mô tả |
|------|-------|
| `scripts/smoke-test-ai-providers.ts` | Test AI: OpenAI, Anthropic, Gemini, Ollama, Groq |
| `scripts/smoke-test-auth-sso.ts` | Test SSO: Google, GitHub, Magic Link, Keycloak, Clerk, Auth0 |
| `scripts/smoke-test-email-providers.ts` | Test email providers |
| `scripts/smoke-test-push-providers.ts` | Test push notification providers |
| `scripts/smoke-test-search-providers.ts` | Test search providers |
| `scripts/smoke-test-storage-providers.ts` | Test storage providers |
| `scripts/smoke-test-setup-wizard.ts` | Test setup wizard |
| `scripts/test-live-search-providers.ts` | Live search testing |

---

## 6. Các Điểm Đặc Biệt

1. **Zero-Infra Defaults:** Mọi pluggable provider đều có option zero-cost (local filesystem, PostgreSQL trigram search, local SMTP, Ollama local AI) để chạy ngay không cần cấu hình phức tạp.

2. **Schema-as-Code:** `schema.ts` (~4350 dòng) định nghĩa toàn bộ 148+ bảng PostgreSQL bằng JS objects, sau đó convert sang SQL qua `scripts/convert-schema-to-sql.js`.

3. **Template-rich:** Module `templates` chứa hàng trăm document templates phân loại theo ~20 ngành nghề.

4. **Multi-provider hỗ trợ:** 5 video conferencing providers, 6 email providers, 5 AI providers, 4 search providers, 4 push providers.

5. **Migration tự viết:** Không dùng ORM migration mà có runner tự viết (`scripts/migrate.js`) với transaction-safe execution.

6. **Docker-ready:** Multi-stage Dockerfile hỗ trợ cả dev (`npm run start:dev`) và production (`node dist/main`).

7. **Comprehensive Smoke Tests:** Script test riêng cho từng provider infrastructure để verify cấu hình.

---

*Document được tạo vào: Tháng 5/2026*

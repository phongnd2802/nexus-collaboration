# Nexus Backend

API backend của Nexus được xây dựng bằng NestJS. Service này chịu trách nhiệm xác thực, quản lý workspace và cung cấp các API cốt lõi cho chat, dự án, lịch, ghi chú, tệp, tích hợp và các tính năng AI.

## Công nghệ chính

- NestJS với TypeScript
- PostgreSQL
- Redis
- Qdrant
- Socket.io
- LiveKit
- SeaweedFS

## Cài đặt và chạy

```bash
npm install
npm run migrate
npm run start:dev
```

## AI Chat Proxy

- Đặt `NEXUS_AI_BASE_URL` tới URL của service `nexus-ai`, ví dụ `http://127.0.0.1:8000`.
- Frontend gọi `/ai-chat` thông qua endpoint `/api/v1/agent-chat/*` của backend.
- Backend sẽ kiểm tra quyền truy cập, ngữ cảnh workspace và stream phản hồi từ `nexus-ai` về client.

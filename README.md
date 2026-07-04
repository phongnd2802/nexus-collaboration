# Nexus Collaboration

Monorepo cho nền tảng cộng tác Nexus. Dự án gồm frontend web, backend API, MCP server cho agent/tool calling và runtime AI độc lập, cùng các dịch vụ hạ tầng chạy qua Docker.

## Cấu trúc dự án

- `frontend/`: ứng dụng React + TypeScript + Vite
- `backend/`: API NestJS
- `nexus-mcp/`: MCP server bọc các API của backend
- `nexus-ai/`: runtime agent AI kết nối tới `nexus-mcp`
- `docker-compose.yml`: hạ tầng local như PostgreSQL, Redis, Qdrant, Elasticsearch và SeaweedFS

## Kiến trúc tổng quan

Luồng chính giữa các service:

```text
Frontend -> Backend -> Nexus AI -> Nexus MCP -> Backend API tools
```

Hạ tầng dùng chung:

- PostgreSQL cho dữ liệu ứng dụng
- Redis cho cache, pub/sub và hàng đợi realtime
- Qdrant cho vector search / RAG
- Elasticsearch cho tìm kiếm bổ sung
- SeaweedFS cho object storage tương thích S3

## Yêu cầu môi trường

- Node.js 20+
- npm
- Python 3.11+
- `uv` cho `nexus-ai`
- Docker và Docker Compose

## Khởi động hạ tầng local

Thiết lập biến môi trường gốc nếu cần:

```bash
cp .env.docker .env
```

Khởi động các dịch vụ hạ tầng:

```bash
docker compose up -d
```

Mặc định các cổng quan trọng:

- PostgreSQL: `5432` hoặc theo `POSTGRES_PORT`
- Redis: `6379` hoặc theo `REDIS_PORT`
- Qdrant: `6333`
- Elasticsearch: `9200`
- SeaweedFS filer: `8888`
- SeaweedFS S3 endpoint: `8333`

## Chạy dự án local

Thứ tự khuyến nghị:

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run start:dev
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 3. Nexus MCP

```bash
cd nexus-mcp
npm install
npm run build
npm run start:http
```

### 4. Nexus AI

```bash
cd nexus-ai
cp .env.example .env
uv sync --extra dev
uv run nexus-ai-check
opendataloader-pdf-hybrid --port 5002
uv run nexus-ai-web
```

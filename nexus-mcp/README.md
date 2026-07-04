# Nexus MCP Server

## Chức năng cung cấp

Service hiện mở ra các nhóm công cụ sau:

- Workspace và thành viên
- Dữ liệu dashboard
- Tìm kiếm semantic search và tìm kiếm ghi chú
- CRUD ghi chú và import từ URL
- Dự án và task
- Kênh chat và tin nhắn
- Sự kiện lịch

## Kiểu transport hỗ trợ

- `stdio` cho việc chạy local như một MCP subprocess
- Streamable HTTP cho MCP client qua HTTP, local hoặc remote

## Cấu hình

Thiết lập các biến môi trường trước khi chạy:

```bash
export NEXUS_API_BASE_URL="http://localhost:3002/api/v1"
export NEXUS_API_KEY="<internal Nexus API key>"
```

Backend Nexus cần được cấu hình cùng internal key thông qua `NEXUS_INTERNAL_API_KEY` hoặc `NEXUS_API_KEY`.

## Cài đặt và build

```bash
npm install
npm run build
```

## Chạy service

```bash
npm run start:http
```

Giá trị mặc định:

- Host: `127.0.0.1`
- Port: `3333`
- Endpoint MCP: `/mcp`
- Health check: `/health`

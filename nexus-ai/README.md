# Nexus AI

## Mục đích

- Chạy agent AI tách biệt khỏi backend chính
- Tool calling qua `nexus-mcp`
- RAG, guardrails, Langfuse và các mô hình suy luận

## Cài đặt và chạy

```bash
uv sync --extra dev

# trong thư mục nexus-mcp/
npm run start:http

# trong thư mục nexus-ai/

opendataloader-pdf-hybrid --port 5002
uv run nexus-ai-web
```

## Lập chỉ mục Office RAG

Để index tài liệu Office với cơ chế chuẩn hóa PDF và giữ lại thông tin trang / bounding box:

- cài `LibreOffice` ở chế độ headless để lệnh `soffice` có sẵn trong `PATH`
- hoặc đặt biến `NEXUS_RAG_LIBREOFFICE_PATH`

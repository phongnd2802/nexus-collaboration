# Nexus MCP

Remote MCP server for the Nexus backend.

## Environment

- `PORT`: HTTP port, default `3100`
- `MCP_SERVER_NAME`: default `nexus-mcp-server`
- `NEXUS_BACKEND_BASE_URL`: backend API base URL, for example `http://host.docker.internal:3002/api/v1`
- `REQUEST_TIMEOUT_MS`: default `30000`

## Auth

Every MCP HTTP request must include:

- `Authorization: Bearer <nexus_user_jwt>`
- `x-workspace-id: <workspace-id>` for workspace-scoped tools

The server forwards the user JWT directly to the backend so backend guards remain the source of truth.

## Run

```bash
npm install
npm run dev
```

The MCP endpoint is `POST /mcp`. Health check is `GET /health`.

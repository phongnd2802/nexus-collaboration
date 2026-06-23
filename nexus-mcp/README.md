# Nexus MCP Server

MCP server for the Nexus Collaboration backend API.

## What It Provides

This server exposes tools for the existing NestJS backend:

- Workspaces and members
- Dashboard data
- Universal, semantic, and note search
- Notes CRUD and URL import
- Projects and tasks
- Chat channels and channel messages
- Calendar events

The server supports two transports:

- `stdio` for local MCP subprocess usage.
- Stateless Streamable HTTP for local or remote HTTP MCP clients.

## Requirements

- Node.js 20+
- Nexus backend running, by default at `http://localhost:3002/api/v1`
- A valid Nexus bearer token

## Configuration

Set these environment variables before starting the MCP server:

```bash
export NEXUS_API_BASE_URL="http://localhost:3002/api/v1"
export NEXUS_API_TOKEN="<your bearer token>"
```

Optional headers supported by the backend:

```bash
export NEXUS_API_KEY="<optional api key>"
export NEXUS_PROJECT_ID="<optional project id>"
export NEXUS_APP_ID="<optional app id>"
export NEXUS_ORGANIZATION_ID="<optional organization id>"
export NEXUS_API_TIMEOUT_MS="30000"
```

## Install And Build

```bash
npm install
npm run build
```

## Run

### stdio

```bash
npm start
```

### Streamable HTTP

```bash
npm run start:http
```

Defaults:

- Host: `127.0.0.1`
- Port: `3333`
- MCP endpoint: `/mcp`
- Health endpoint: `/health`

Override with environment variables:

```bash
export NEXUS_MCP_HTTP_HOST="127.0.0.1"
export NEXUS_MCP_HTTP_PORT="3333"
export NEXUS_MCP_HTTP_PATH="/mcp"
export NEXUS_MCP_ALLOWED_HOSTS="localhost,127.0.0.1"
```

`NEXUS_MCP_ALLOWED_HOSTS` is useful when binding to `0.0.0.0` and you still want host header validation.

## Inspect

### stdio

```bash
npm run inspect
```

### Streamable HTTP

Start the HTTP server first:

```bash
npm run start:http
```

Then point an MCP client or Inspector at:

```text
http://127.0.0.1:3333/mcp
```

## MCP Client Example

### stdio

```json
{
  "mcpServers": {
    "nexus": {
      "command": "node",
      "args": ["/absolute/path/to/nexus-mcp/dist/index.js"],
      "env": {
        "NEXUS_API_BASE_URL": "http://localhost:3002/api/v1",
        "NEXUS_API_TOKEN": "<your bearer token>"
      }
    }
  }
}
```

### Streamable HTTP

Use this URL in clients that support Streamable HTTP:

```text
http://127.0.0.1:3333/mcp
```

## Notes

- Tools that call complex backend DTOs use a `data` object and forward it to the backend unchanged.
- File upload endpoints are intentionally not exposed because stdio MCP tools cannot safely model multipart file upload without additional file access policy.
- Delete endpoints are intentionally omitted in the initial tool set to reduce destructive surface area.

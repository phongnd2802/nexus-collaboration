# nexus-mcp

Python MCP sidecar service for Nexus AutoPilot tools.

## Local run

```bash
cd nexus-mcp
python -m venv .venv
. .venv/bin/activate
pip install -e .
NEXUS_INTERNAL_API_URL=http://localhost:3002/api/v1/internal/mcp \
NEXUS_INTERNAL_API_TOKEN=change-me \
uvicorn nexus_mcp.server:app --host 0.0.0.0 --port 8000
```

Backend MCP config:

```env
MCP_SERVERS_JSON=[{"name":"autopilot_core","transport":"http","url":"http://localhost:8000/mcp","enabled":true}]
NEXUS_INTERNAL_API_TOKEN=change-me
```


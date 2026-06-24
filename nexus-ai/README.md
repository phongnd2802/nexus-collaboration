# Nexus AI

Standalone Nexus AI agent runtime for local development and capability testing.

It connects to `nexus-mcp` over Streamable HTTP and exposes the Pydantic AI web test interface through `agent.to_web()`.

## Run

```bash
cp .env.example .env
uv sync --extra dev

# in nexus-mcp/
npm run start:http

# in nexus-ai/
uv run nexus-ai-check
uv run nexus-ai-web
```

Required env:

- `NEXUS_MCP_URL`
- `NEXUS_API_TOKEN`
- `NEXUS_WORKSPACE_ID`
- `OPENROUTER_API_KEY` for the default OpenRouter model

Default model:

- `openrouter:openai/gpt-4o-mini`

Langfuse is enabled when `NEXUS_AI_ENABLE_LANGFUSE=true` and Langfuse keys are configured.

## Safety Defaults

- Filesystem access is restricted to `.runtime/workspaces/<workspace_id>/sessions/<session_id>/files`.
- Shell commands run only inside the session sandbox.
- Dangerous shell commands are denied.
- Secrets are redacted from tool outputs.
- MCP domain tools are accessed through `nexus-mcp`; the agent does not call the Nexus backend directly.

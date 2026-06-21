const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: parseNumber(process.env.PORT, 3100),
  serverName: process.env.MCP_SERVER_NAME || "nexus-mcp-server",
  backendBaseUrl: (process.env.NEXUS_BACKEND_BASE_URL || "http://localhost:3002/api/v1").replace(/\/+$/, ""),
  requestTimeoutMs: parseNumber(process.env.REQUEST_TIMEOUT_MS, 30_000),
};

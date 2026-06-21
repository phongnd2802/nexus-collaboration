import { randomUUID } from "node:crypto";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp";
import type { Request, Response } from "express";

import { config } from "./config";
import { withRequestContext } from "./context";
import { logger } from "./logger";
import { authMetadataResponses, resourceMetadataUrl } from "./authMetadata";
import { registerTools } from "./tools/registerTools";

const createServer = (): McpServer => {
  const server = new McpServer(
    {
      name: config.serverName,
      version: "0.1.0",
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  registerTools(server);
  return server;
};

const httpStatusLabel = (statusCode: number): "ok" | "client_error" | "server_error" => {
  if (statusCode >= 500) {
    return "server_error";
  }
  if (statusCode >= 400) {
    return "client_error";
  }
  return "ok";
};

const app = createMcpExpressApp();

app.use((req, res, next) => {
  const requestId = req.header("x-request-id") ?? randomUUID();
  const workspaceId = req.header("x-workspace-id") ?? undefined;
  const startedAt = Date.now();
  res.locals.requestId = requestId;
  res.locals.workspaceId = workspaceId;

  logger.info("http_request_started", {
    status: "started",
    requestId,
    workspaceId,
    method: req.method,
    path: req.path,
    ip: req.ip ?? null,
    userAgent: req.header("user-agent") ?? null,
    contentLength: req.header("content-length") ?? null,
  });

  res.on("finish", () => {
    logger.info("http_request_finished", {
      status: httpStatusLabel(res.statusCode),
      requestId,
      workspaceId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});

app.get("/.well-known/oauth-protected-resource/mcp", (req, res) => {
  res.json(authMetadataResponses.protectedResource(req));
});

app.get("/mcp/.well-known/oauth-protected-resource", (req, res) => {
  res.json(authMetadataResponses.protectedResource(req));
});

app.get("/.well-known/oauth-protected-resource", (req, res) => {
  res.json(authMetadataResponses.protectedResource(req));
});

app.get("/.well-known/oauth-authorization-server", (req, res) => {
  res.json(authMetadataResponses.authorizationServer(req));
});

app.get("/.well-known/oauth-authorization-server/mcp", (req, res) => {
  res.json(authMetadataResponses.authorizationServer(req));
});

app.get("/.well-known/openid-configuration", (req, res) => {
  res.json(authMetadataResponses.openIdConfiguration(req));
});

app.get("/.well-known/openid-configuration/mcp", (req, res) => {
  res.json(authMetadataResponses.openIdConfiguration(req));
});

app.get("/mcp/.well-known/openid-configuration", (req, res) => {
  res.json(authMetadataResponses.openIdConfiguration(req));
});

app.get("/.well-known/jwks.json", (_req, res) => {
  res.json(authMetadataResponses.jwks());
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    server: config.serverName,
    backendBaseUrl: config.backendBaseUrl,
  });
});

app.post("/mcp", async (req: Request, res: Response) => {
  const authorization = req.header("authorization");
  const requestId = (res.locals.requestId as string | undefined) ?? req.header("x-request-id") ?? randomUUID();
  const workspaceId = (res.locals.workspaceId as string | undefined) ?? req.header("x-workspace-id") ?? undefined;

  if (!authorization?.startsWith("Bearer ")) {
    res.set(
      "WWW-Authenticate",
      `Bearer error="invalid_token", error_description="Missing Authorization header", resource_metadata="${resourceMetadataUrl(req)}"`,
    );
    logger.warn("mcp_request_unauthorized", {
      status: "unauthorized",
      requestId,
      workspaceId,
      method: req.method,
      path: req.path,
      hasAuthorizationHeader: Boolean(authorization),
    });
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Authorization: Bearer <token> is required.",
      },
      id: null,
    });
    return;
  }

  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  logger.info("mcp_request_started", {
    status: "started",
    requestId,
    workspaceId,
    method: req.method,
    path: req.path,
    userAgent: req.header("user-agent") ?? null,
    hasBody: req.body != null,
  });

  try {
    await withRequestContext(
      {
        authorization,
        workspaceId,
        requestId,
      },
      async () => {
        await server.connect(transport);
        logger.debug("mcp_transport_connected", {
          status: "connected",
        });
        await transport.handleRequest(req, res, req.body);
      },
    );
  } catch (error) {
    logger.error("mcp_request_failed", {
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error.",
        },
        id: null,
      });
    }
  } finally {
    transport.close().catch(() => undefined);
    server.close().catch(() => undefined);
  }
});

app.get("/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
});

app.delete("/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
});

app.listen(config.port, "0.0.0.0", () => {
  logger.info("mcp_server_started", {
    status: "ready",
    host: "0.0.0.0",
    port: config.port,
    backendBaseUrl: config.backendBaseUrl,
    serverName: config.serverName,
  });
});

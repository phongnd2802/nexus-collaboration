import type { Request } from "express";

import { config } from "./config";

const baseUrl = (req: Request): string => {
  return `${req.protocol}://${req.get("host")}`;
};

const mcpResourceUrl = (req: Request): string => {
  return `${baseUrl(req)}/mcp`;
};

const authorizationServerMetadata = (req: Request) => {
  const origin = baseUrl(req);
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/authorize`,
    token_endpoint: `${origin}/token`,
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    scopes_supported: [],
    service_documentation: `${origin}/health`,
  };
};

const openIdConfiguration = (req: Request) => {
  const origin = baseUrl(req);
  return {
    ...authorizationServerMetadata(req),
    jwks_uri: `${origin}/.well-known/jwks.json`,
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
  };
};

export const authMetadataResponses = {
  protectedResource: (req: Request) => ({
    resource: mcpResourceUrl(req),
    authorization_servers: [baseUrl(req)],
    scopes_supported: [],
    bearer_methods_supported: ["header"],
    resource_name: config.serverName,
    resource_documentation: `${baseUrl(req)}/health`,
  }),
  authorizationServer: authorizationServerMetadata,
  openIdConfiguration,
  jwks: () => ({
    keys: [],
  }),
};

export const resourceMetadataUrl = (req: Request): string => {
  return `${baseUrl(req)}/.well-known/oauth-protected-resource/mcp`;
};

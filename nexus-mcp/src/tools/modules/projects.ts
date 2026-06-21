import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

import { requestBackend, requireWorkspaceId } from "../../backend/client";
import { makeToolResult, summarizeCollection } from "../common";
import { registerTool } from "../registry";
import { projectCreateBodyShape, projectPatchShape, taskBodyShape, taskPatchShape, uuid } from "../schemas";

export const registerProjectTools = (server: McpServer) => {
  registerTool(
    server,
    "nexus_list_projects",
    "List projects in the current workspace with optional status and type filters.",
    {
      status: z.string().optional(),
      type: z.string().optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ status, type }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/projects`,
        query: { status: status as string | undefined, type: type as string | undefined },
      });
      return makeToolResult(summarizeCollection("Projects", data), data);
    },
  );

  registerTool(
    server,
    "nexus_get_project",
    "Get one project by project_id.",
    { project_id: uuid },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ project_id }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/projects/${project_id as string}`,
      });
      return makeToolResult("Project loaded.", data);
    },
  );

  registerTool(
    server,
    "nexus_create_project",
    "Create a project in the current workspace.",
    projectCreateBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (body) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "POST",
        path: `/workspaces/${workspaceId}/projects`,
        body,
      });
      return makeToolResult("Project created.", data);
    },
  );

  registerTool(
    server,
    "nexus_update_project",
    "Update an existing project in the current workspace.",
    {
      project_id: uuid,
      ...projectPatchShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ project_id, ...body }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "PATCH",
        path: `/workspaces/${workspaceId}/projects/${project_id as string}`,
        body,
      });
      return makeToolResult("Project updated.", data);
    },
  );

  registerTool(
    server,
    "nexus_list_workspace_tasks",
    "List tasks across all projects in the current workspace.",
    {
      search: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ search, status, limit }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/projects/all-tasks`,
        query: {
          search: search as string | undefined,
          status: status as string | undefined,
          limit: limit as number | undefined,
        },
      });
      return makeToolResult(summarizeCollection("Workspace tasks", data), data);
    },
  );

  registerTool(
    server,
    "nexus_list_project_tasks",
    "List tasks within a project.",
    {
      project_id: uuid,
      sprintId: z.string().optional(),
      status: z.string().optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ project_id, sprintId, status }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/projects/${project_id as string}/tasks`,
        query: { sprintId: sprintId as string | undefined, status: status as string | undefined },
      });
      return makeToolResult(summarizeCollection("Project tasks", data), data);
    },
  );

  registerTool(
    server,
    "nexus_get_task",
    "Get one task by task_id.",
    { task_id: uuid },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ task_id }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/projects/tasks/${task_id as string}`,
      });
      return makeToolResult("Task loaded.", data);
    },
  );

  registerTool(
    server,
    "nexus_create_task",
    "Create a task in a project.",
    {
      project_id: uuid,
      ...taskBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ project_id, ...body }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "POST",
        path: `/workspaces/${workspaceId}/projects/${project_id as string}/tasks`,
        body,
      });
      return makeToolResult("Task created.", data);
    },
  );

  registerTool(
    server,
    "nexus_update_task",
    "Update a task by task_id.",
    {
      task_id: uuid,
      ...taskPatchShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ task_id, ...body }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "PATCH",
        path: `/workspaces/${workspaceId}/projects/tasks/${task_id as string}`,
        body,
      });
      return makeToolResult("Task updated.", data);
    },
  );
};

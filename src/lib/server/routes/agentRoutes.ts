/**
 * Agent Routes
 * Endpoints for agent execution and streaming
 */

import { SpanStatusCode } from "@opentelemetry/api";
import { ProviderFactory } from "../../factories/providerFactory.js";
import type {
  AgentExecuteRequest,
  AgentExecuteResponse,
  EmbedManyRequest,
  EmbedManyResponse,
  EmbedRequest,
  EmbedResponse,
  RouteGroup,
  ServerContext,
} from "../../types/index.js";
import { withSpan } from "../../telemetry/withSpan.js";
import { tracers } from "../../telemetry/tracers.js";
import { logger } from "../../utils/logger.js";

/**
 * Resolve `request.tools` (an array of tool NAMES shared by the execute and
 * stream endpoints) into a `toolFilter` whitelist. The field was previously
 * accepted and silently ignored, so entries are validated against registered
 * names and the whole field fails open (undefined — keep all tools) when
 * nothing matches: existing clients sending unknown names must not lose
 * their tool set.
 */
async function resolveRequestToolFilter(
  ctx: ServerContext,
  requestedTools: unknown,
): Promise<string[] | undefined> {
  if (!Array.isArray(requestedTools) || requestedTools.length === 0) {
    return undefined;
  }
  const registered = new Set(
    (await ctx.neurolink.getAllAvailableTools()).map((t) => t.name),
  );
  const known = requestedTools.filter(
    (name): name is string => typeof name === "string" && registered.has(name),
  );
  if (known.length > 0) {
    return known;
  }
  logger.warn(
    "[agentRoutes] Ignoring request.tools — no entries match registered tool names (legacy fail-open)",
    { requested: requestedTools },
  );
  return undefined;
}
import { createStreamRedactor } from "../utils/redaction.js";
import {
  AgentExecuteRequestSchema,
  type createErrorResponse,
  createErrorResponse as createError,
  EmbedManyRequestSchema,
  EmbedRequestSchema,
  SkillCreateRequestSchema,
  SkillUpdateRequestSchema,
  validateRequest,
} from "../utils/validation.js";
import type { SkillsManager } from "../../skills/skillsManager.js";

/**
 * Resolve the skills manager from the server's NeuroLink instance, or a
 * 503 error response when skills are not configured on this server.
 */
function resolveSkillsManager(
  ctx: ServerContext,
): SkillsManager | ReturnType<typeof createErrorResponse> {
  const manager = ctx.neurolink.getSkillsManager();
  if (!manager) {
    return createError(
      "SKILLS_UNAVAILABLE",
      "Skills are not enabled on this server — construct NeuroLink with a `skills` config.",
      undefined,
      ctx.requestId,
    );
  }
  return manager;
}

/**
 * Resolve the skills manager for a *mutating* route, or an error response when
 * skills aren't configured (503) or mutations are disabled (allowMutations is
 * not true). The LLM tools are already registration-gated; this applies the
 * same switch to the REST create/update/delete endpoints.
 */
function resolveMutableSkillsManager(
  ctx: ServerContext,
): SkillsManager | ReturnType<typeof createErrorResponse> {
  const manager = resolveSkillsManager(ctx);
  if ("error" in manager) {
    return manager;
  }
  if (!manager.mutationsAllowed) {
    return createError(
      "SKILLS_MUTATIONS_DISABLED",
      "Skill mutations are disabled on this server \u2014 construct NeuroLink with `skills.allowMutations: true` to enable create/update/delete.",
      undefined,
      ctx.requestId,
    );
  }
  return manager;
}

/**
 * Create agent routes
 */
export function createAgentRoutes(basePath: string = "/api"): RouteGroup {
  return {
    prefix: `${basePath}/agent`,
    routes: [
      {
        method: "POST",
        path: `${basePath}/agent/execute`,
        handler: async (
          ctx: ServerContext,
        ): Promise<
          AgentExecuteResponse | ReturnType<typeof createErrorResponse>
        > => {
          // Validate request body
          const validation = validateRequest(
            AgentExecuteRequestSchema,
            ctx.body,
            ctx.requestId,
          );

          if (!validation.success) {
            return validation.error;
          }

          const request = validation.data as AgentExecuteRequest;

          return withSpan(
            {
              name: "neurolink.http.execute",
              tracer: tracers.http,
              attributes: {
                "http.route": "/api/agent/execute",
                "ai.provider": request.provider || "default",
                "ai.model": request.model || "default",
              },
            },
            async () => {
              // Normalize input
              const input =
                typeof request.input === "string"
                  ? { text: request.input }
                  : request.input;

              const requestToolFilter = await resolveRequestToolFilter(
                ctx,
                request.tools,
              );

              const result = await ctx.neurolink.generate({
                input,
                provider: request.provider,
                model: request.model,
                systemPrompt: request.systemPrompt,
                temperature: request.temperature,
                maxTokens: request.maxTokens,
                ...(requestToolFilter ? { toolFilter: requestToolFilter } : {}),
                context: {
                  // When an authenticated user context exists (set by auth middleware),
                  // always use its IDs to prevent caller-supplied impersonation.
                  sessionId: ctx.user
                    ? ctx.session?.id
                    : (ctx.session?.id ?? request.sessionId),
                  userId: ctx.user ? ctx.user.id : request.userId,
                  userEmail: ctx.user?.email,
                  userRoles: ctx.user?.roles,
                  requestId: ctx.requestId,
                },
              });

              // Map tool calls from SDK format to API format
              const toolCalls = result.toolCalls?.map(
                (tc: {
                  toolCallId: string;
                  toolName: string;
                  args: Record<string, unknown>;
                }) => ({
                  name: tc.toolName,
                  arguments: tc.args,
                }),
              );

              return {
                content: result.content || "",
                provider: result.provider || request.provider || "unknown",
                model: result.model || request.model || "unknown",
                usage: result.usage,
                toolCalls,
              };
            },
          ); // end withSpan
        },
        description: "Execute agent with prompt",
        tags: ["agent"],
      },
      {
        method: "POST",
        path: `${basePath}/agent/stream`,
        streaming: { enabled: true, contentType: "text/event-stream" },
        handler: async (ctx: ServerContext) => {
          // Validate request body
          const validation = validateRequest(
            AgentExecuteRequestSchema,
            ctx.body,
            ctx.requestId,
          );

          if (!validation.success) {
            return validation.error;
          }

          const request = validation.data as AgentExecuteRequest;

          // Normalize input
          const input =
            typeof request.input === "string"
              ? { text: request.input }
              : request.input;

          const streamToolFilter = await resolveRequestToolFilter(
            ctx,
            request.tools,
          );

          const result = await ctx.neurolink.stream({
            input,
            provider: request.provider,
            model: request.model,
            systemPrompt: request.systemPrompt,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            ...(streamToolFilter ? { toolFilter: streamToolFilter } : {}),
            context: {
              // When an authenticated user context exists (set by auth middleware),
              // always use its IDs to prevent caller-supplied impersonation.
              sessionId: ctx.user
                ? ctx.session?.id
                : (ctx.session?.id ?? request.sessionId),
              userId: ctx.user ? ctx.user.id : request.userId,
              userEmail: ctx.user?.email,
              userRoles: ctx.user?.roles,
              requestId: ctx.requestId,
            },
          });

          // Create redactor (no-op if redaction is not enabled)
          const redactor = createStreamRedactor(ctx.redaction);

          // Wrap stream with a span that stays open for the full consumption
          // lifetime, not just the generator creation.
          async function* redactedStream(): AsyncIterable<unknown> {
            const streamSpan = tracers.http.startSpan("neurolink.http.stream", {
              attributes: {
                "http.route": "/api/agent/stream",
                "ai.provider": request.provider || "default",
                "ai.model": request.model || "default",
              },
            });
            try {
              for await (const chunk of result.stream) {
                yield redactor(chunk);
              }
              streamSpan.setStatus({ code: SpanStatusCode.OK });
            } catch (err) {
              streamSpan.recordException(
                err instanceof Error ? err : new Error(String(err)),
              );
              streamSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: err instanceof Error ? err.message : String(err),
              });
              throw err;
            } finally {
              streamSpan.end();
            }
          }

          return redactedStream();
        },
        description: "Stream agent response",
        tags: ["agent", "streaming"],
      },
      {
        method: "GET",
        path: `${basePath}/agent/providers`,
        handler: async () => {
          // Get available providers dynamically from ProviderFactory
          const providers = ProviderFactory.getAvailableProviders();

          return {
            providers,
            total: providers.length,
          };
        },
        description: "List available AI providers",
        tags: ["agent", "providers"],
      },
      {
        method: "POST",
        path: `${basePath}/agent/embed`,
        handler: async (
          ctx: ServerContext,
        ): Promise<EmbedResponse | ReturnType<typeof createErrorResponse>> => {
          const validation = validateRequest(
            EmbedRequestSchema,
            ctx.body,
            ctx.requestId,
          );

          if (!validation.success) {
            return validation.error;
          }

          const request = validation.data as EmbedRequest;

          try {
            const providerName = request.provider || "openai";
            return await withSpan(
              {
                name: "neurolink.http.embed",
                tracer: tracers.http,
                attributes: {
                  "http.route": "/api/agent/embed",
                  "ai.provider": providerName,
                  "ai.model": request.model || "default",
                },
              },
              async () => {
                const provider = await ProviderFactory.createProvider(
                  providerName,
                  request.model,
                );
                const embedding = await provider.embed(
                  request.text,
                  request.model,
                );
                return {
                  embedding,
                  provider: providerName,
                  model: request.model || "default",
                  dimension: embedding.length,
                };
              },
            );
          } catch (error) {
            return createError(
              "EXECUTION_FAILED",
              error instanceof Error
                ? error.message
                : "Embedding generation failed",
              undefined,
              ctx.requestId,
            );
          }
        },
        description: "Generate embedding for a single text",
        tags: ["agent", "embeddings"],
      },
      {
        method: "POST",
        path: `${basePath}/agent/embed-many`,
        handler: async (
          ctx: ServerContext,
        ): Promise<
          EmbedManyResponse | ReturnType<typeof createErrorResponse>
        > => {
          const validation = validateRequest(
            EmbedManyRequestSchema,
            ctx.body,
            ctx.requestId,
          );

          if (!validation.success) {
            return validation.error;
          }

          const request = validation.data as EmbedManyRequest;

          try {
            const providerName = request.provider || "openai";
            return await withSpan(
              {
                name: "neurolink.http.embedMany",
                tracer: tracers.http,
                attributes: {
                  "http.route": "/api/agent/embed-many",
                  "ai.provider": providerName,
                  "ai.model": request.model || "default",
                  "ai.embed.count": request.texts.length,
                },
              },
              async () => {
                const provider = await ProviderFactory.createProvider(
                  providerName,
                  request.model,
                );

                const embeddings = await provider.embedMany(
                  request.texts,
                  request.model,
                );

                return {
                  embeddings,
                  provider: providerName,
                  model: request.model || "default",
                  count: embeddings.length,
                  dimension: embeddings[0]?.length ?? 0,
                };
              },
            );
          } catch (error) {
            return createError(
              "EXECUTION_FAILED",
              error instanceof Error
                ? error.message
                : "Batch embedding generation failed",
              undefined,
              ctx.requestId,
            );
          }
        },
        description: "Generate embeddings for multiple texts in a batch",
        tags: ["agent", "embeddings"],
      },
      {
        method: "GET",
        path: `${basePath}/agent/skills`,
        handler: async (ctx: ServerContext) => {
          const manager = resolveSkillsManager(ctx);
          if ("error" in manager) {
            return manager;
          }
          try {
            const skills = await manager.list(ctx.query.scopeId);
            return { skills, count: skills.length };
          } catch (error) {
            return createError(
              "EXECUTION_FAILED",
              error instanceof Error ? error.message : "Skills listing failed",
              undefined,
              ctx.requestId,
            );
          }
        },
        description:
          "List active skills (index only — no instructions). Optional ?scopeId= filter.",
        tags: ["agent", "skills"],
      },
      {
        method: "GET",
        path: `${basePath}/agent/skills/:id`,
        handler: async (ctx: ServerContext) => {
          const manager = resolveSkillsManager(ctx);
          if ("error" in manager) {
            return manager;
          }
          try {
            const skill = await manager.get(ctx.params.id);
            if (!skill) {
              return createError(
                "NOT_FOUND",
                `Skill "${ctx.params.id}" not found`,
                undefined,
                ctx.requestId,
              );
            }
            return skill;
          } catch (error) {
            return createError(
              "EXECUTION_FAILED",
              error instanceof Error ? error.message : "Skill lookup failed",
              undefined,
              ctx.requestId,
            );
          }
        },
        description: "Fetch one skill (by id or exact name) with instructions",
        tags: ["agent", "skills"],
      },
      {
        method: "POST",
        path: `${basePath}/agent/skills`,
        handler: async (ctx: ServerContext) => {
          const manager = resolveMutableSkillsManager(ctx);
          if ("error" in manager) {
            return manager;
          }
          const validation = validateRequest(
            SkillCreateRequestSchema,
            ctx.body,
            ctx.requestId,
          );
          if (!validation.success) {
            return validation.error;
          }
          const { requestedBy, ...skill } = validation.data;
          try {
            const result = await manager.requestMutation({
              type: "create",
              skill,
              // Authenticated identity wins over caller-supplied attribution.
              ...(ctx.user?.id || requestedBy
                ? { requestedBy: ctx.user?.id ?? requestedBy }
                : {}),
            });
            return result;
          } catch (error) {
            return createError(
              "EXECUTION_FAILED",
              error instanceof Error ? error.message : "Skill create failed",
              undefined,
              ctx.requestId,
            );
          }
        },
        description:
          "Create a skill (routed through the host's onMutationRequest gate when configured)",
        tags: ["agent", "skills"],
      },
      {
        method: "PATCH",
        path: `${basePath}/agent/skills/:id`,
        handler: async (ctx: ServerContext) => {
          const manager = resolveMutableSkillsManager(ctx);
          if ("error" in manager) {
            return manager;
          }
          const validation = validateRequest(
            SkillUpdateRequestSchema,
            ctx.body,
            ctx.requestId,
          );
          if (!validation.success) {
            return validation.error;
          }
          const { requestedBy, ...patch } = validation.data;
          try {
            const result = await manager.requestMutation({
              type: "update",
              skillId: ctx.params.id,
              patch,
              ...(ctx.user?.id || requestedBy
                ? { requestedBy: ctx.user?.id ?? requestedBy }
                : {}),
            });
            return result;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Skill update failed";
            return createError(
              message.includes("not found") ? "NOT_FOUND" : "EXECUTION_FAILED",
              message,
              undefined,
              ctx.requestId,
            );
          }
        },
        description: "Update a skill (patch semantics; version is bumped)",
        tags: ["agent", "skills"],
      },
      {
        method: "DELETE",
        path: `${basePath}/agent/skills/:id`,
        handler: async (ctx: ServerContext) => {
          const manager = resolveMutableSkillsManager(ctx);
          if ("error" in manager) {
            return manager;
          }
          try {
            const result = await manager.requestMutation({
              type: "delete",
              skillId: ctx.params.id,
              ...(ctx.user?.id ? { requestedBy: ctx.user.id } : {}),
            });
            return result;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Skill delete failed";
            return createError(
              message.includes("not found") ? "NOT_FOUND" : "EXECUTION_FAILED",
              message,
              undefined,
              ctx.requestId,
            );
          }
        },
        description: "Soft-delete (deprecate) a skill",
        tags: ["agent", "skills"],
      },
    ],
  };
}

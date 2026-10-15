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
  ServerAgentResolvedInput,
  ServerAgentRouteOptions,
  ServerContext,
} from "../../types/index.js";
import { withSpan } from "../../telemetry/withSpan.js";
import { tracers } from "../../telemetry/tracers.js";
import { logger } from "../../utils/logger.js";
import { isContextCarried } from "../utils/carriedContextMark.js";

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
import { AgentInputError, resolveAgentInput } from "../utils/agentInput.js";
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
 * The request's `input` with its attachments vetted (see `agentInput.ts`), or
 * the error response for the first one the server refuses.
 */
async function resolveRequestInput(
  ctx: ServerContext,
  requestInput: AgentExecuteRequest["input"],
  options: ServerAgentRouteOptions | undefined,
): Promise<ServerAgentResolvedInput | ReturnType<typeof createErrorResponse>> {
  if (typeof requestInput === "string") {
    return { text: requestInput };
  }
  try {
    return await resolveAgentInput(requestInput, options);
  } catch (error) {
    if (error instanceof AgentInputError) {
      return createError(
        error.code,
        error.message,
        undefined,
        ctx.requestId,
        error.status,
      );
    }
    throw error;
  }
}

/**
 * Create agent routes
 *
 * `options.perUserAuth` decides where a request's identity comes from; see
 * `ServerAgentRouteOptions`. Authentication middleware that sets `ctx.user`
 * does not change that on its own: one shared API key sets the same user for
 * every caller, so trusting it as a person would give every client the same
 * userId and no conversation memory. The converse is the operator's to act on:
 * a server whose authentication identifies individual people must set
 * `perUserAuth`, or any authenticated caller can name another userId and
 * sessionId in the body.
 *
 * Unset, identity resolves as it did before the adapters carried `ctx.user` to
 * the handler: the body's `userId` and `sessionId`, with one exception. On
 * Hono, a request whose client sent its own `X-Request-ID` header reached the
 * handler with the middleware's context, so an authenticated `ctx.user` (and
 * `ctx.session`) won over the body there, and still does. A context the
 * built-in adapters did not hand the carry to also keeps that rule: a custom
 * adapter that sets `ctx.user` itself, or a handler called directly with a
 * context the caller built. Only `perUserAuth` (with the server carrying
 * middleware state) makes these routes take the user from `ctx.user`, and
 * ignore the body's `userId`, on every built-in adapter and for every request.
 *
 * `perUserAuth` needs the user in the handler, which an adapter hands over on
 * every request only when the server carries middleware state.
 * `registerAllRoutes()` turns that on for the server when it is given
 * `perUserAuth`. A caller that registers these routes itself with `perUserAuth`
 * must create the server with `carryMiddlewareState: true`. Without it, a
 * request has a user only on Hono when the client sent its own `X-Request-ID`
 * (Hono then hands the handler the middleware's context regardless); every
 * other request (Hono without that header, Express, Fastify, Koa) runs as
 * anonymous, with no `userId` and no session.
 *
 * Without `perUserAuth`, and when the server carries middleware state, the
 * routes log one warning per instance the first time a request whose body names
 * a different `userId` than its `ctx.user` is served from the body, unless that
 * user is marked `shared: true` (an identity for every holder of one
 * credential, which the CLI's API-key middleware sets). Such a request is
 * served from the body; the warning only tells the operator that per-person
 * authentication is running without the flag that makes it hold. With the
 * carry off the handler has no `ctx.user` on those requests, so there is
 * nothing to compare and no warning. A request where `ctx.user` already won has
 * nothing to warn about.
 *
 * @param options - Limits for `input.images` / `input.files`:
 *   `allowedInputRoots` (default: none, every local-path attachment is
 *   refused), `maxInputBytes` per attachment (default 50 MiB),
 *   `maxInputAttachments` per request (default 20, images and files together)
 *   and `maxInputTotalBytes` per request (default 100 MiB, one budget shared by
 *   images and files); and `perUserAuth` (described above).
 */
export function createAgentRoutes(
  basePath: string = "/api",
  options?: ServerAgentRouteOptions,
): RouteGroup {
  // Truthiness, not `=== true`: a JavaScript caller passing "true" or 1 must get
  // the strict mode, not silently the permissive one.
  const perUser = Boolean(options?.perUserAuth);
  // Without perUserAuth the body's userId wins (except where ctx.user already
  // did), so an authenticated person who names someone else is acting as them.
  // That is expected under one shared key (marked `shared`), where the body is
  // how callers keep separate memory, and a misconfiguration under per-person
  // authentication: say so, once, with no request values in the message.
  // alwaysStderr, not warn: logger.warn is dropped unless debug logging is on,
  // which would hide a security notice from the operator it is for.
  let warnedNamingAnotherUser = false;
  const warnIfNamingAnotherUser = (
    ctx: ServerContext,
    request: AgentExecuteRequest,
  ): void => {
    if (
      warnedNamingAnotherUser ||
      !ctx.user ||
      ctx.user.shared === true ||
      !isContextCarried(ctx) ||
      typeof request.userId !== "string" ||
      request.userId === ctx.user.id
    ) {
      return;
    }
    warnedNamingAnotherUser = true;
    logger.alwaysStderr(
      "[agentRoutes] An authenticated user named a different userId in the request body, and the body's userId was used. " +
        "Per-person authentication without perUserAuth lets a caller name another user. " +
        "Set perUserAuth: true, or mark an identity that stands for a shared credential with shared: true. " +
        "This warning is logged once per server.",
    );
  };
  // Who a skill mutation is attributed to. With perUserAuth the authenticated
  // user wins and a caller-supplied name is never trusted. Otherwise the body's
  // `requestedBy` is used, since a shared key's `ctx.user` names no person, for
  // a context that received the adapters' carry; a context that did not (Hono
  // with the caller's X-Request-ID, a custom adapter, a direct call) lets the
  // authenticated user win, as it did before.
  const skillRequester = (
    ctx: ServerContext,
    bodyRequestedBy: string | undefined,
  ): string | undefined => {
    if (perUser) {
      return ctx.user?.id;
    }
    return isContextCarried(ctx)
      ? bodyRequestedBy
      : (ctx.user?.id ?? bodyRequestedBy);
  };
  // The identity generate() and stream() run under.
  //
  // perUserAuth: the middleware identifies individual people, so userId, email,
  // roles and the session come only from ctx.user / ctx.session and the body's
  // are ignored (no caller-supplied impersonation). The session is the
  // authenticated user's: a request with no ctx.user gets none, even if a
  // session middleware named one, because with optional authentication every
  // anonymous caller that sends the same session id would otherwise share one
  // conversation.
  //
  // Otherwise the body keeps choosing userId and sessionId, which is what every
  // adapter did before it carried ctx.user to the handler: a context that
  // received the adapters' carry is treated as the fresh one it used to be. The
  // exceptions are the contexts that did not get the carry, where an
  // authenticated ctx.user wins over the body, as it did, and so does the
  // session: Hono with the caller's own X-Request-ID, a custom adapter that sets
  // ctx.user itself, a handler called directly. Per-person authentication
  // without perUserAuth therefore does not stop a caller naming someone else on
  // the other requests.
  const callerContext = (
    ctx: ServerContext,
    request: AgentExecuteRequest,
  ): Record<string, unknown> => {
    if (perUser) {
      return {
        sessionId: ctx.user ? ctx.session?.id : undefined,
        userId: ctx.user?.id,
        userEmail: ctx.user?.email,
        userRoles: ctx.user?.roles,
        requestId: ctx.requestId,
      };
    }
    if (!isContextCarried(ctx)) {
      return {
        sessionId: ctx.user
          ? ctx.session?.id
          : (ctx.session?.id ?? request.sessionId),
        userId: ctx.user ? ctx.user.id : request.userId,
        userEmail: ctx.user?.email,
        userRoles: ctx.user?.roles,
        requestId: ctx.requestId,
      };
    }
    warnIfNamingAnotherUser(ctx, request);
    return {
      sessionId: request.sessionId,
      userId: request.userId,
      userEmail: undefined,
      userRoles: undefined,
      requestId: ctx.requestId,
    };
  };
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
              name: "http.execute",
              tracer: tracers.http,
              attributes: {
                "http.route": "/api/agent/execute",
                "ai.provider": request.provider || "default",
                "ai.model": request.model || "default",
              },
            },
            async () => {
              const input = await resolveRequestInput(
                ctx,
                request.input,
                options,
              );
              if ("error" in input) {
                return input;
              }

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
                context: callerContext(ctx, request),
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

          const input = await resolveRequestInput(ctx, request.input, options);
          if ("error" in input) {
            return input;
          }

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
            context: callerContext(ctx, request),
          });

          // Create redactor (no-op if redaction is not enabled)
          const redactor = createStreamRedactor(ctx.redaction);

          // Wrap stream with a span that stays open for the full consumption
          // lifetime, not just the generator creation.
          async function* redactedStream(): AsyncIterable<unknown> {
            const streamSpan = tracers.http.startSpan("http.stream", {
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
                name: "http.embed",
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
                name: "http.embedMany",
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
          const requester = skillRequester(ctx, requestedBy);
          try {
            const result = await manager.requestMutation({
              type: "create",
              skill,
              ...(requester ? { requestedBy: requester } : {}),
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
          const requester = skillRequester(ctx, requestedBy);
          try {
            const result = await manager.requestMutation({
              type: "update",
              skillId: ctx.params.id,
              patch,
              ...(requester ? { requestedBy: requester } : {}),
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
          const requester = skillRequester(ctx, undefined);
          try {
            const result = await manager.requestMutation({
              type: "delete",
              skillId: ctx.params.id,
              ...(requester ? { requestedBy: requester } : {}),
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

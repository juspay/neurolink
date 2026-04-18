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
import { createStreamRedactor } from "../utils/redaction.js";
import {
  AgentExecuteRequestSchema,
  type createErrorResponse,
  createErrorResponse as createError,
  EmbedManyRequestSchema,
  EmbedRequestSchema,
  validateRequest,
} from "../utils/validation.js";

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

              const result = await ctx.neurolink.generate({
                input,
                provider: request.provider,
                model: request.model,
                systemPrompt: request.systemPrompt,
                temperature: request.temperature,
                maxTokens: request.maxTokens,
                // Note: tools should be passed as Record<string, Tool> in generate options
                // If request.tools is an array of tool names, we skip them
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

          const result = await ctx.neurolink.stream({
            input,
            provider: request.provider,
            model: request.model,
            systemPrompt: request.systemPrompt,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
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
    ],
  };
}

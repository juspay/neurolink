/**
 * Built-in skill tools.
 *
 * Two factories, mirroring the two disclosure levels:
 *
 * createSkillTools — instance tools registered once at construction:
 *   list_skills (lightweight catalog) plus the gated skill_create /
 *   skill_update / skill_delete mutation tools.
 *
 * createSkillCallTools — per-call tools injected into options.tools by
 *   prepareGenerate/prepareStream (the RAG-tool pattern): use_skill, whose
 *   description embeds the `<available_skills>` listing so the model
 *   decides from context when a skill applies (no mandatory pre-flight
 *   call), and read_skill_resource for on-demand auxiliary files. The
 *   sessionId rides in by closure, so activations pin to the session
 *   without runtime tool-context plumbing.
 *
 * The manager is resolved lazily via a resolver callback so tools can be
 * registered at construction time while the store initializes on first
 * use (mirrors how retrieve_context resolves conversationMemory lazily).
 */

import { trace } from "@opentelemetry/api";
import { z } from "zod";
import type {
  SkillCallToolsContext,
  SkillDefinition,
  SkillMutationAction,
  SkillsManagerLike,
  SkillToolsOptions,
  Tool,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { tool } from "../utils/tool.js";
import { isSkillVisibleInScope } from "./skillMatcher.js";

const NOT_CONFIGURED = {
  success: false as const,
  error:
    "Skills are not available — the skills store failed to initialize. " +
    "Answer from general knowledge.",
};

/** Response payload for an activated skill — full instructions, never truncated. */
function toActivationPayload(skill: SkillDefinition) {
  return {
    name: skill.name,
    ...(skill.displayName ? { displayName: skill.displayName } : {}),
    version: skill.version ?? 1,
    instructions: skill.instructions,
    ...(skill.resources && skill.resources.length > 0
      ? {
          resources: skill.resources.map((r) => r.path),
          resourcesHint:
            "Auxiliary files — read one with read_skill_resource only when the task needs it.",
        }
      : {}),
    note:
      "Follow these instructions for the current task. The skill stays loaded " +
      "for this conversation — do not invoke use_skill for it again.",
  };
}

/** Build the use_skill description for the call's discovery mode. */
function useSkillDescription(context: SkillCallToolsContext): string {
  const base =
    "Load a team-defined skill (SOP, playbook, workflow) by name to get its full instructions. " +
    "When the user's task matches a skill, invoke this tool, then follow the loaded instructions exactly. " +
    "Do NOT invoke it for a skill that is already loaded in this conversation, and do not " +
    "invoke it at all when no skill matches the task.";
  if (context.discovery === "tool" && context.listing) {
    return `${base}\n\nSkills available in this conversation:\n${context.listing}`;
  }
  if (context.discovery === "system-prompt") {
    return `${base} The available skills are listed under "## Available Skills" in your instructions.`;
  }
  return `${base} Discover available skills with list_skills.`;
}

/**
 * Per-call skill tools: use_skill + read_skill_resource. Injected into
 * options.tools for one generate()/stream() call; same-name entries shadow
 * any registered tool, so the description always reflects this call's
 * listing and scope.
 */
export function createSkillCallTools(
  resolveManager: () => SkillsManagerLike | null,
  context: SkillCallToolsContext,
): Record<string, Tool> {
  /**
   * Rebuild activation state from stored history before every dedup
   * check. use_skill is rare, so one history read per attempt is cheap —
   * and it keeps dedup truthful across restarts, other instances sharing
   * the memory backend, and pins whose persistence failed. Fail-open: a
   * hydration error only risks a duplicate pin, never a lost activation.
   */
  const ensureHydrated = async (manager: SkillsManagerLike): Promise<void> => {
    const { sessionId, getStoredMessages } = context;
    if (!sessionId) {
      return;
    }
    try {
      const stored = getStoredMessages
        ? await getStoredMessages(sessionId)
        : [];
      manager.sessions.hydrate(sessionId, stored);
    } catch (error) {
      logger.warn("[SkillTools] Session hydration failed — continuing", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return {
    use_skill: tool({
      description: useSkillDescription(context),
      inputSchema: z.object({
        name: z
          .string()
          .min(1)
          .describe(
            'Exact skill name from the available skills listing, e.g. "refund_dispute_escalation".',
          ),
      }),
      execute: async (args) => {
        const manager = resolveManager();
        if (!manager) {
          return NOT_CONFIGURED;
        }
        try {
          const skill = await manager.get(args.name);
          if (!skill || !isSkillVisibleInScope(skill, context.scopeId)) {
            return {
              success: false,
              error:
                `No skill named "${args.name}" is available. Use the exact name ` +
                "from the available skills listing (or list_skills).",
            };
          }

          if (context.sessionId && context.sessionPersistence) {
            await ensureHydrated(manager);
            if (
              manager.sessions.isActive(context.sessionId, skill.id, skill.name)
            ) {
              // Report the version the session actually follows — a
              // mid-session update must not masquerade as loaded.
              const activation = manager.sessions.getActivation(
                context.sessionId,
                skill.id,
                skill.name,
              );
              return {
                success: true,
                data: {
                  status: "already_loaded",
                  name: skill.name,
                  version: activation?.version ?? skill.version ?? 1,
                  message:
                    "This skill is already loaded in the conversation — follow " +
                    "the instructions from when it was loaded.",
                },
              };
            }
            manager.sessions.recordActivation(context.sessionId, skill);
          }

          const pinned = Boolean(
            context.sessionId && context.sessionPersistence,
          );
          trace.getActiveSpan()?.setAttributes({
            "skill.name": skill.name,
            "skill.version": skill.version ?? 1,
            "skill.instructions_chars": skill.instructions.length,
            "skill.pinned": pinned,
          });
          logger.debug("[SkillTools] Skill activated", {
            skill: skill.name,
            version: skill.version ?? 1,
            sessionId: context.sessionId,
            pinned,
          });
          return { success: true, data: toActivationPayload(skill) };
        } catch (error) {
          logger.warn("[SkillTools] use_skill failed", {
            skill: args.name,
            error: error instanceof Error ? error.message : String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    read_skill_resource: tool({
      description:
        "Read an auxiliary file bundled with a loaded skill (paths appear in the " +
        "skill's `resources` list or are referenced from its instructions). Load the " +
        "skill with use_skill first. Only read files the current task actually needs — " +
        "each resource costs context.",
      inputSchema: z.object({
        skill: z.string().min(1).describe("Name of the loaded skill."),
        path: z
          .string()
          .min(1)
          .describe(
            'Resource path relative to the skill, e.g. "references/forms.md".',
          ),
      }),
      execute: async (args) => {
        const manager = resolveManager();
        if (!manager) {
          return NOT_CONFIGURED;
        }
        try {
          const skill = await manager.get(args.skill);
          if (!skill || !isSkillVisibleInScope(skill, context.scopeId)) {
            return {
              success: false,
              error: `No skill named "${args.skill}" is available.`,
            };
          }
          if (context.sessionId && context.sessionPersistence) {
            await ensureHydrated(manager);
            if (
              !manager.sessions.isActive(
                context.sessionId,
                skill.id,
                skill.name,
              )
            ) {
              return {
                success: false,
                error: `Skill "${skill.name}" is not loaded — call use_skill first.`,
              };
            }
          }
          const content = await manager.getResource(skill.id, args.path);
          if (content === null) {
            return {
              success: false,
              error:
                `Resource "${args.path}" not found on skill "${skill.name}". ` +
                "Valid paths are listed in the skill's `resources`.",
            };
          }
          return {
            success: true,
            data: { skill: skill.name, path: args.path, content },
          };
        } catch (error) {
          logger.warn("[SkillTools] read_skill_resource failed", {
            skill: args.skill,
            path: args.path,
            error: error instanceof Error ? error.message : String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };
}

/**
 * Instance skill tools bound to a lazily-resolved manager: list_skills
 * plus the gated mutation tools. Returns Vercel AI SDK tool() objects
 * (description + Zod inputSchema + execute) keyed by tool name.
 */
export function createSkillTools(
  resolveManager: () => SkillsManagerLike | null,
  options?: SkillToolsOptions,
): Record<string, Tool> {
  const tools: Record<string, Tool> = {
    list_skills: tool({
      description:
        "Returns a lightweight list of all available skills — name, display name, description, and " +
        "tags only. No instructions are returned, keeping context cost minimal. " +
        'Use this only when a user explicitly asks "what skills do you have?" or "what can you help ' +
        'me with?". To load a skill for a task, use use_skill instead.',
      inputSchema: z.object({
        scopeId: z
          .string()
          .optional()
          .describe(
            "Scope identifier to include scoped skills alongside global ones. Usually omit.",
          ),
      }),
      execute: async (args) => {
        const manager = resolveManager();
        if (!manager) {
          return { ...NOT_CONFIGURED, data: { skills: [] } };
        }
        try {
          const items = await manager.list(args.scopeId);
          return {
            success: true,
            data: {
              skills: items.map((item) => ({
                name: item.name,
                ...(item.displayName ? { displayName: item.displayName } : {}),
                description: item.description,
                tags: item.tags ?? [],
                scope: item.scope ?? "global",
              })),
              count: items.length,
            },
          };
        } catch (error) {
          logger.warn("[SkillTools] list_skills failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            data: { skills: [] },
          };
        }
      },
    }),
  };

  if (options?.allowMutations) {
    Object.assign(tools, createSkillMutationTools(resolveManager));
  }

  return tools;
}

/** Shared executor for the three mutation tools. */
async function runMutation(
  resolveManager: () => SkillsManagerLike | null,
  action: SkillMutationAction,
) {
  const manager = resolveManager();
  if (!manager) {
    return NOT_CONFIGURED;
  }
  try {
    const result = await manager.requestMutation(action);
    if (result.decision.outcome === "rejected") {
      return {
        success: false,
        error: `Skill ${action.type} was rejected${result.decision.reason ? `: ${result.decision.reason}` : "."}`,
      };
    }
    if (result.decision.outcome === "pending") {
      return {
        success: true,
        data: {
          status: "pending_approval",
          ...(result.decision.reference
            ? { reference: result.decision.reference }
            : {}),
          message: `Skill ${action.type} was submitted for approval. It takes effect once an approver accepts it.`,
        },
      };
    }
    return {
      success: true,
      data: {
        status: "applied",
        ...(result.skill
          ? {
              skillId: result.skill.id,
              name: result.skill.name,
              version: result.skill.version,
              skillStatus: result.skill.status,
            }
          : {}),
      },
    };
  } catch (error) {
    logger.warn(`[SkillTools] skill_${action.type} failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function createSkillMutationTools(
  resolveManager: () => SkillsManagerLike | null,
): Record<string, Tool> {
  const scopeFields = {
    scope: z
      .enum(["global", "scoped"])
      .optional()
      .describe(
        '"global" = available everywhere; "scoped" = only for specific scope ids.',
      ),
    scopeIds: z
      .array(z.string())
      .optional()
      .describe(
        'Required when scope="scoped": the scope ids (channel/team/tenant) the skill applies to.',
      ),
  };

  return {
    skill_create: tool({
      description:
        "Propose a NEW skill (SOP/playbook). Depending on host configuration the skill is either " +
        "applied immediately or queued for human approval. " +
        "INVOKE ONLY WHEN the user explicitly asks to create a new skill and has supplied the name, " +
        "description, and full instructions text. DO NOT INVENT CONTENT — the instructions must come " +
        "from the user verbatim or nearly so. If the user has not given the full text, ask. " +
        "Do not use this to modify an existing skill (use skill_update).",
      inputSchema: z.object({
        name: z
          .string()
          .min(1)
          .describe(
            'Short machine-friendly skill name (snake_case recommended), unique. E.g. "refund_dispute_escalation".',
          ),
        displayName: z
          .string()
          .optional()
          .describe(
            'Human-readable display name. E.g. "Refund Dispute Escalation".',
          ),
        description: z
          .string()
          .min(1)
          .describe(
            "One or two sentences explaining when this skill applies. Used for matching.",
          ),
        instructions: z
          .string()
          .min(1)
          .describe(
            "The full step-by-step instructions to follow when this skill matches. " +
              "Must come from the user — do not invent steps.",
          ),
        tags: z
          .array(z.string())
          .optional()
          .describe(
            'Domain tags for filtering (e.g. ["payments", "escalation"]).',
          ),
        ...scopeFields,
        requestedBy: z
          .string()
          .optional()
          .describe("Identifier of the requesting user, when known."),
      }),
      execute: async (args) => {
        if (args.scope === "scoped" && (args.scopeIds ?? []).length === 0) {
          return {
            success: false,
            error:
              '"scopeIds" must contain at least one scope id when scope="scoped".',
          };
        }
        const { requestedBy, ...skill } = args;
        return runMutation(resolveManager, {
          type: "create",
          skill,
          ...(requestedBy ? { requestedBy } : {}),
        });
      },
    }),

    skill_update: tool({
      description:
        "Propose an update to an EXISTING skill. Only the provided fields change; the version is " +
        "bumped. Depending on host configuration the change is applied immediately or queued for " +
        "human approval. Look the skill up with list_skills first to get its exact name. " +
        "Do not paraphrase or expand the user's instructions.",
      inputSchema: z.object({
        skillId: z
          .string()
          .min(1)
          .describe("Id (or exact unique name) of the skill to update."),
        displayName: z.string().optional(),
        description: z.string().optional(),
        instructions: z
          .string()
          .optional()
          .describe("Replacement instructions text, verbatim from the user."),
        tags: z.array(z.string()).optional(),
        ...scopeFields,
        requestedBy: z.string().optional(),
      }),
      execute: async (args) => {
        const { skillId, requestedBy, ...patch } = args;
        if (Object.values(patch).every((v) => v === undefined)) {
          return {
            success: false,
            error: "Provide at least one field to update.",
          };
        }
        return runMutation(resolveManager, {
          type: "update",
          skillId,
          patch,
          ...(requestedBy ? { requestedBy } : {}),
        });
      },
    }),

    skill_delete: tool({
      description:
        "Propose deleting (deprecating) an EXISTING skill. The skill stops matching but stays in " +
        "storage for audit. Depending on host configuration this is applied immediately or queued " +
        "for human approval. INVOKE ONLY WHEN the user explicitly asks to delete a skill.",
      inputSchema: z.object({
        skillId: z
          .string()
          .min(1)
          .describe("Id (or exact unique name) of the skill to delete."),
        requestedBy: z.string().optional(),
      }),
      execute: async (args) =>
        runMutation(resolveManager, {
          type: "delete",
          skillId: args.skillId,
          ...(args.requestedBy ? { requestedBy: args.requestedBy } : {}),
        }),
    }),
  };
}

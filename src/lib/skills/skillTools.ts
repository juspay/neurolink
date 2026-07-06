/**
 * Built-in skill tools, following the createMemoryRetrievalTools /
 * createFileTools / createTaskTools factory pattern.
 *
 * The manager is resolved lazily via a resolver callback so tools can be
 * registered at construction time while the store initializes on first
 * use (mirrors how retrieve_context resolves conversationMemory lazily).
 *
 * Tool descriptions are ported from curator's production skills tools —
 * the "always check skills first / no_match is expected, not an error /
 * pick the best of 2-5 or ask" prompt engineering is proven in prod.
 */

import { z } from "zod";
import type {
  SkillDefinition,
  SkillMutationAction,
  SkillsManagerLike,
  SkillToolsOptions,
  Tool,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { tool } from "../utils/tool.js";

/** Trim a hydrated skill to the fields the model needs. */
function toToolSkill(skill: SkillDefinition) {
  return {
    id: skill.id,
    name: skill.name,
    ...(skill.displayName ? { displayName: skill.displayName } : {}),
    description: skill.description,
    instructions: skill.instructions,
    tags: skill.tags ?? [],
    scope: skill.scope ?? "global",
    version: skill.version ?? 1,
  };
}

/**
 * Create the built-in skill tools bound to a lazily-resolved manager.
 * Returns Vercel AI SDK tool() objects (description + Zod inputSchema +
 * execute) keyed by tool name.
 */
export function createSkillTools(
  resolveManager: () => SkillsManagerLike | null,
  options?: SkillToolsOptions,
): Record<string, Tool> {
  const notConfigured = {
    success: false as const,
    error:
      "Skills are not available — the skills store failed to initialize. " +
      "Answer from general knowledge.",
    data: { skills: [] },
  };

  const tools: Record<string, Tool> = {
    search_skills: tool({
      description:
        "ALWAYS call this at the start of every user request before answering from general knowledge. " +
        "Searches team-defined skills (SOPs, playbooks, workflows) using an index-first approach — " +
        "fast, low-cost, and does not load skills that do not match. " +
        "You MUST provide at least one of: query (keyword from the user message) or tag (domain category). " +
        "If 1 match is found, follow its instructions exactly. " +
        "If 2-5 matches are found, use your judgment based on the user message to pick the best one, " +
        "or ask the user to clarify if the instructions would lead to meaningfully different actions. " +
        "Only skip this call for purely conversational messages like greetings. " +
        'Returns `{ skills: [], reason: "no_match" }` when nothing matches — this is expected, NOT an ' +
        "error. In that case, answer from general knowledge.",
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe(
            "Keyword from the user message, matched against skill name, display name, and description. " +
              'E.g. "deployment", "refund process", "on-call escalation".',
          ),
        tag: z
          .string()
          .optional()
          .describe(
            'Domain category tag to narrow results (e.g. "payments", "devops"). ' +
              "Applied on top of the query filter when both are provided.",
          ),
        scopeId: z
          .string()
          .optional()
          .describe(
            "Scope identifier (channel/team/tenant id) to include scoped skills alongside global ones. " +
              "Usually omit — the host default applies.",
          ),
      }),
      execute: async (args) => {
        if (!args.query && !args.tag) {
          return {
            success: false,
            error:
              'At least one of "query" or "tag" must be provided to search_skills.',
            data: { skills: [] },
          };
        }
        const manager = resolveManager();
        if (!manager) {
          return notConfigured;
        }
        try {
          const skills = await manager.search(args);
          if (skills.length === 0) {
            return {
              success: true,
              data: {
                skills: [],
                reason: "no_match" as const,
                message: `No skills found${args.query ? ` matching "${args.query}"` : ""}${args.tag ? ` with tag "${args.tag}"` : ""}. Answer from general knowledge.`,
              },
            };
          }
          return {
            success: true,
            data: {
              skills: skills.map(toToolSkill),
              count: skills.length,
              ...(skills.length > 1
                ? {
                    hint: "Multiple skills matched. Pick the most relevant one for the user message, or ask the user to clarify.",
                  }
                : {}),
            },
          };
        } catch (error) {
          logger.warn("[SkillTools] search_skills failed", {
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

    list_skills: tool({
      description:
        "Returns a lightweight list of all available skills — name, display name, description, and " +
        "tags only. No instructions are returned, keeping context cost minimal. " +
        'Use this only when a user explicitly asks "what skills do you have?" or "what can you help ' +
        'me with?". Do NOT use this for skill lookup before answering — use search_skills instead.',
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
          return notConfigured;
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
    return {
      success: false,
      error:
        "Skills are not available — the skills store failed to initialize.",
    };
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
        "human approval. Look the skill up with search_skills or list_skills first to get its id or " +
        "exact name. Do not paraphrase or expand the user's instructions.",
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

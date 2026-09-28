/**
 * Codex-outbound fallback: request translation, Codex Responses -> ClaudeRequest.
 *
 * Named to mirror the existing asymmetry: `codexFallback.ts` is the Claude
 * engine's fallback _into_ Codex; this file is the Codex engine's fallback
 * _out_ to the Anthropic OAuth pool or Vertex-Claude. Owns one thing:
 * untrusted inbound Codex Responses JSON -> a typed `ClaudeRequest`. Does not
 * own target/model selection, response/stream translation back to Codex wire
 * format, tool execution, or dispatch/HTTP.
 *
 * `parallel_tool_calls` feeds `tool_choice.disable_parallel_tool_use` in
 * `mapCodexToolChoiceToClaude`, and tool declarations are flattened through
 * `inlineJsonSchema` (dropping `strict` and degrading a circular `$ref` to a
 * bare `{type:"object"}`) — the tool-call-fidelity PR's changes to this file.
 * A `toolKindByName` map is also returned alongside the translated request,
 * so response serialization (which sees only Claude's `name`+`input` on a
 * `tool_use` block, no kind discriminator) knows which declared tools were
 * `custom` rather than `function`.
 */
import type {
  ClaudeImageBlock,
  ClaudeMessage,
  ClaudeRequest,
  ClaudeTextBlock,
  ClaudeTool,
} from "../types/index.js";
import type {
  CodexContentPart,
  CodexNativeAdditionalToolsInputItem,
  CodexNativeCustomToolDeclaration,
  CodexNativeFunctionToolDeclaration,
  CodexNativeInputItem,
  CodexNativeMessageInputItem,
  CodexNativeRequest,
  CodexNativeToolChoice,
  CodexNativeToolDeclaration,
  CodexNativeToolKind,
  CodexNativeToolNamespace,
  CodexOutboundMessageGroup,
  CodexOutboundToolMappingResult,
  CodexReasoningEffort,
  CodexTranslationError,
} from "../types/index.js";
import { resolveClaudeMaxTokens } from "../utils/tokenLimits.js";
import { inlineJsonSchema } from "../utils/schemaConversion.js";
import { parseToolArguments } from "./argumentParsing.js";
import {
  recordCodexOutboundSchemaDegraded,
  recordCodexOutboundUnsupportedField,
} from "./proxyTracer.js";
import {
  CODEX_STREAM_MAX_TOOL_CALLS,
  CODEX_STREAM_SIZE_CEILING_BYTES,
} from "./streamLimits.js";

// ---------------------------------------------------------------------------
// §3.1 parseCodexNativeRequest — the untrusted-JSON -> typed boundary.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCodexContentPart(value: unknown): value is CodexContentPart {
  if (!isRecord(value)) {
    return false;
  }
  if (value.type === "input_text" || value.type === "output_text") {
    return typeof value.text === "string";
  }
  if (value.type === "input_image") {
    return typeof value.image_url === "string";
  }
  return false;
}

function isCodexNativeToolDeclaration(
  value: unknown,
): value is CodexNativeToolDeclaration {
  if (!isRecord(value) || typeof value.name !== "string") {
    return false;
  }
  if (value.type === "function") {
    return (
      typeof value.strict === "boolean" &&
      isRecord(value.parameters) &&
      (value.description === undefined || typeof value.description === "string")
    );
  }
  if (value.type === "custom") {
    return (
      isRecord(value.format) &&
      value.format.type === "grammar" &&
      (value.format.syntax === "lark" || value.format.syntax === "regex") &&
      typeof value.format.definition === "string" &&
      (value.description === undefined || typeof value.description === "string")
    );
  }
  return false;
}

function isCodexNativeToolNamespace(
  value: unknown,
): value is CodexNativeToolNamespace {
  return (
    isRecord(value) &&
    value.type === "namespace" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    Array.isArray(value.tools) &&
    value.tools.every(isCodexNativeToolDeclaration)
  );
}

function isCodexNativeInputItem(value: unknown): value is CodexNativeInputItem {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.type) {
    case "message":
      return (
        (value.role === "user" ||
          value.role === "assistant" ||
          value.role === "developer") &&
        Array.isArray(value.content) &&
        value.content.every(isCodexContentPart)
      );
    case "function_call":
      return (
        typeof value.call_id === "string" &&
        typeof value.name === "string" &&
        typeof value.arguments === "string"
      );
    case "function_call_output":
    case "custom_tool_call_output":
      return (
        typeof value.call_id === "string" && typeof value.output === "string"
      );
    case "custom_tool_call":
      return (
        typeof value.call_id === "string" &&
        typeof value.name === "string" &&
        typeof value.input === "string"
      );
    case "reasoning":
      return true;
    case "additional_tools":
      return (
        value.role === "developer" &&
        Array.isArray(value.tools) &&
        value.tools.every(isCodexNativeToolNamespace)
      );
    default:
      return false;
  }
}

function isCodexNativeToolChoice(
  value: unknown,
): value is CodexNativeToolChoice {
  if (value === "auto" || value === "required" || value === "none") {
    return true;
  }
  return (
    isRecord(value) &&
    value.type === "function" &&
    typeof value.name === "string"
  );
}

const CODEX_REASONING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

function isCodexNativeReasoning(
  value: unknown,
): value is { effort: CodexReasoningEffort; context?: string } {
  return (
    isRecord(value) &&
    (CODEX_REASONING_EFFORTS as readonly unknown[]).includes(value.effort) &&
    (value.context === undefined || typeof value.context === "string")
  );
}

export function parseCodexNativeRequest(
  raw: unknown,
):
  | { ok: true; value: CodexNativeRequest }
  | { ok: false; error: CodexTranslationError } {
  if (
    !isRecord(raw) ||
    typeof raw.model !== "string" ||
    typeof raw.stream !== "boolean" ||
    typeof raw.store !== "boolean" ||
    !Array.isArray(raw.input) ||
    !raw.input.every(isCodexNativeInputItem) ||
    (raw.tool_choice !== undefined &&
      !isCodexNativeToolChoice(raw.tool_choice)) ||
    (raw.reasoning !== undefined && !isCodexNativeReasoning(raw.reasoning)) ||
    (raw.parallel_tool_calls !== undefined &&
      typeof raw.parallel_tool_calls !== "boolean")
  ) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_REQUEST",
        message: "inbound body does not match CodexNativeRequest",
      },
    };
  }
  return { ok: true, value: raw as CodexNativeRequest };
}

// ---------------------------------------------------------------------------
// §3.3 tool_choice — exact inversion of codexFallback.ts's convertClaudeRequestToCodex.
// ---------------------------------------------------------------------------

// Absent tool_choice and "auto" both mean the same thing to Codex, and both
// now map to an *explicit* `{type:"auto"}` (previously: `undefined` for the
// absent case) so `disable_parallel_tool_use` always has a field on the
// output to attach to, regardless of whether the source request bothered to
// say "auto" out loud. `parallel_tool_calls: false` is inert on `"none"` —
// there is nothing running in parallel to disable.
function mapCodexToolChoiceToClaude(
  choice: CodexNativeToolChoice | undefined,
  parallelToolCalls: boolean | undefined,
): NonNullable<ClaudeRequest["tool_choice"]> {
  const disable = parallelToolCalls === false;
  if (choice === undefined || choice === "auto") {
    return disable
      ? { type: "auto", disable_parallel_tool_use: true }
      : { type: "auto" };
  }
  if (choice === "required") {
    return disable
      ? { type: "any", disable_parallel_tool_use: true }
      : { type: "any" };
  }
  if (choice === "none") {
    return { type: "none" };
  }
  return disable
    ? { type: "tool", name: choice.name, disable_parallel_tool_use: true }
    : { type: "tool", name: choice.name };
}

// ---------------------------------------------------------------------------
// §3.4 Tools: flattened across namespaces, split by each declaration's own type.
// ---------------------------------------------------------------------------

/**
 * Detection-only walk of a schema's `$ref` chain, independent of
 * `inlineJsonSchema`'s own flattening — the actual flattening stays fully
 * delegated to that function unmodified (never reimplemented here), so this
 * only answers "would a ref chain revisit itself" for the schemaDegraded
 * counter's benefit.
 */
function hasCircularRef(
  schema: Record<string, unknown>,
  defs: Record<string, Record<string, unknown>> | undefined,
  seen: ReadonlySet<string> = new Set(),
): boolean {
  if (typeof schema.$ref === "string" && schema.$ref.startsWith("#/")) {
    if (seen.has(schema.$ref)) {
      return true;
    }
    const key = schema.$ref.split("/").pop();
    const target = defs && key ? defs[key] : undefined;
    return target
      ? hasCircularRef(target, defs, new Set(seen).add(schema.$ref))
      : false;
  }
  const properties = isRecord(schema.properties)
    ? Object.values(schema.properties)
    : [];
  const items = Array.isArray(schema.items)
    ? schema.items
    : isRecord(schema.items)
      ? [schema.items]
      : [];
  return [...properties, ...items].some(
    (value): boolean => isRecord(value) && hasCircularRef(value, defs, seen),
  );
}

function mapCodexFunctionToolToClaude(
  tool: CodexNativeFunctionToolDeclaration,
): CodexOutboundToolMappingResult {
  const reasons: string[] = [];
  const defs = (tool.parameters.definitions ?? tool.parameters.$defs) as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (defs && hasCircularRef(tool.parameters, defs)) {
    reasons.push("circular_ref_flattened");
  }
  const input_schema = inlineJsonSchema(tool.parameters);
  if (tool.strict) {
    // Anthropic tool declarations have no `strict`-mode equivalent, so the
    // flag is dropped rather than silently passed through as an unknown key.
    reasons.push("strict_mode_flag_dropped");
  }
  return {
    tool: {
      name: tool.name,
      ...(tool.description ? { description: tool.description } : {}),
      input_schema,
    },
    kind: "function",
    reasons,
  };
}

function mapCodexCustomToolToClaude(
  tool: CodexNativeCustomToolDeclaration,
): CodexOutboundToolMappingResult {
  // Lossy, explicitly flagged: no JSON Schema exists for a Lark/regex grammar.
  // The model is no longer grammar-constrained after this mapping — needs
  // product sign-off before shipping (§10 of the design).
  return {
    tool: {
      name: tool.name,
      description: [
        tool.description,
        `Grammar (${tool.format.syntax}):\n${tool.format.definition}`,
      ]
        .filter((s): s is string => Boolean(s))
        .join("\n\n"),
      input_schema: {
        type: "object",
        properties: {
          input: {
            type: "string",
            description:
              "Raw command text, constrained by the grammar in this tool's description.",
          },
        },
        required: ["input"],
      },
    },
    kind: "custom",
    reasons: ["custom_tool_wrapped"],
  };
}

function mapCodexToolDeclarationToClaude(
  tool: CodexNativeToolDeclaration,
): CodexOutboundToolMappingResult {
  // Discriminate on the declaration's own `type`, never on which namespace it
  // came from — the real capture disproves the namespace-implies-kind
  // assumption (`exec` is `type:"custom"` inside a `type:"function"`-heavy
  // namespace).
  return tool.type === "custom"
    ? mapCodexCustomToolToClaude(tool)
    : mapCodexFunctionToolToClaude(tool);
}

function buildClaudeTools(
  additionalTools: CodexNativeAdditionalToolsInputItem | undefined,
): {
  tools: ClaudeTool[] | undefined;
  toolKindByName: ReadonlyMap<string, CodexNativeToolKind>;
  reasons: { toolName: string; reason: string }[];
} {
  if (!additionalTools) {
    return { tools: undefined, toolKindByName: new Map(), reasons: [] };
  }
  const mapped = additionalTools.tools.flatMap((namespace) =>
    namespace.tools.map(mapCodexToolDeclarationToClaude),
  );
  return {
    tools: mapped.length > 0 ? mapped.map((m) => m.tool) : undefined,
    toolKindByName: new Map(mapped.map((m) => [m.tool.name, m.kind])),
    reasons: mapped.flatMap((m) =>
      m.reasons.map((reason) => ({ toolName: m.tool.name, reason })),
    ),
  };
}

// ---------------------------------------------------------------------------
// §3.5 Reasoning: reasoning.effort -> thinking.
// ---------------------------------------------------------------------------

const REASONING_BUDGET: Record<
  Exclude<CodexReasoningEffort, "none" | "minimal">,
  number
> = {
  low: 4096,
  medium: 8192,
  high: 16384,
  xhigh: 24576,
  max: 32768,
};

function mapCodexReasoningToThinking(
  reasoning: { effort: CodexReasoningEffort } | undefined,
  resolvedMaxTokens: number,
): ClaudeRequest["thinking"] | undefined {
  if (
    !reasoning ||
    reasoning.effort === "none" ||
    reasoning.effort === "minimal"
  ) {
    return undefined;
  }
  const table = REASONING_BUDGET[reasoning.effort];
  // Explicit floor: makes the ">= 1024" invariant correct by construction
  // rather than an accident of today's model-table minimums.
  const budget_tokens = Math.max(
    1024,
    Math.min(table, resolvedMaxTokens - 1024),
  );
  return { type: "enabled", budget_tokens };
}

// ---------------------------------------------------------------------------
// §3.6 Non-JSON function_call.arguments — never throws. Parsing itself is
// `parseToolArguments` (argumentParsing.ts); this is a cheap, separate,
// redundant check purely so a malformed (non-empty, non-record) arguments
// string can be reported via the unsupportedFieldTotal counter without
// polluting that pure function's return shape with a degrade flag.
// ---------------------------------------------------------------------------

function isMalformedFunctionArguments(raw: string): boolean {
  if (raw === "") {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return !isRecord(parsed);
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// §3.7 Content parts, with the image data-URI fix.
// ---------------------------------------------------------------------------

const DATA_URI_RE = /^data:([^;,]+);base64,(.+)$/s;

// The four image types the Messages API accepts (mirrors
// SUPPORTED_IMAGE_MEDIA_TYPES in providers/anthropicImageBlocks.ts).
const ANTHROPIC_IMAGE_MEDIA_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const ANTHROPIC_TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

function normalizeImageMediaType(mediaType: string): string {
  const lower = mediaType.toLowerCase();
  return lower === "image/jpg" ? "image/jpeg" : lower;
}

function toClaudeContentPart(
  part: CodexContentPart,
): ClaudeTextBlock | ClaudeImageBlock {
  if (part.type === "input_image") {
    const match = DATA_URI_RE.exec(part.image_url);
    if (match) {
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: normalizeImageMediaType(match[1]),
          data: match[2],
        },
      };
    }
    return { type: "image", source: { type: "url", url: part.image_url } };
  }
  return { type: "text", text: part.text };
}

// ---------------------------------------------------------------------------
// §4 Role-alternation coalescing.
// ---------------------------------------------------------------------------

function coalesceCodexInputToClaudeMessages(
  items: readonly CodexNativeInputItem[],
): ClaudeMessage[] {
  const groups: CodexOutboundMessageGroup[] = [];
  let current: CodexOutboundMessageGroup | undefined;
  const open = (role: "user" | "assistant"): CodexOutboundMessageGroup => {
    if (current?.role === role) {
      return current;
    }
    if (current) {
      groups.push(current);
    }
    current = { role, blocks: [] };
    return current;
  };

  for (const item of items) {
    // additional_tools is handled out-of-band (§3.4). A reasoning item carries
    // OpenAI-encrypted chain of thought that only the OpenAI backend can read;
    // Anthropic has no way to consume it, so it is dropped by rule, not by
    // accident (unknown item types still fail parsing, per A.1).
    if (item.type === "additional_tools" || item.type === "reasoning") {
      continue;
    }
    if (item.type === "message") {
      // Developer messages become system blocks (below). An empty message
      // adds nothing, and on its own would become a content-less turn.
      if (item.role === "developer" || item.content.length === 0) {
        continue;
      }
      open(item.role).blocks.push(...item.content.map(toClaudeContentPart));
      continue;
    }
    if (item.type === "function_call" || item.type === "custom_tool_call") {
      open("assistant").blocks.push({
        type: "tool_use",
        id: item.call_id,
        name: item.name,
        // A custom tool is declared with a single `input` string (§3.4), so
        // its raw call text maps onto that field unchanged.
        input:
          item.type === "function_call"
            ? parseToolArguments(item.arguments, "function")
            : parseToolArguments(item.input, "custom"),
      });
      continue;
    }
    open("user").blocks.push({
      type: "tool_result",
      tool_use_id: item.call_id,
      content: item.output,
    });
  }
  if (current) {
    groups.push(current);
  }
  // In a user turn the Messages API wants tool_result blocks before any other
  // content, so a user message that arrives between a call and its output is
  // moved after the result rather than sent in an order the API rejects.
  return groups.map((g) => ({
    role: g.role,
    content:
      g.role === "user"
        ? [
            ...g.blocks.filter((block) => block.type === "tool_result"),
            ...g.blocks.filter((block) => block.type !== "tool_result"),
          ]
        : g.blocks,
  }));
}

function buildSystemBlocksFromDeveloperMessages(
  items: readonly CodexNativeInputItem[],
): ClaudeTextBlock[] {
  return items
    .filter(
      (i): i is CodexNativeMessageInputItem =>
        i.type === "message" && i.role === "developer",
    )
    .flatMap((i) => i.content.map(toClaudeContentPart))
    .filter((b): b is ClaudeTextBlock => b.type === "text");
}

// ---------------------------------------------------------------------------
// §5 Resumed-session history contract — fail loud, never guess.
// ---------------------------------------------------------------------------

// Detects only a missing tools preamble. A client-side prune that drops turns
// from the middle while resending the preamble passes this check; nothing in
// the wire format marks such a gap (spec Q6, still open).
function hasFreshSessionPreamble(
  items: readonly CodexNativeInputItem[],
): boolean {
  return items[0]?.type === "additional_tools";
}

// ---------------------------------------------------------------------------
// Tool-call history ceilings — the same streamLimits.ts numbers the response
// leg enforces, so a history is never accepted that the reply could not carry.
// ---------------------------------------------------------------------------

function toolHistoryText(item: CodexNativeInputItem): string | undefined {
  switch (item.type) {
    case "function_call":
      return item.arguments;
    case "custom_tool_call":
      return item.input;
    case "function_call_output":
    case "custom_tool_call_output":
      return item.output;
    default:
      return undefined;
  }
}

function describeOversizedToolHistory(
  items: readonly CodexNativeInputItem[],
): string | undefined {
  const calls = items.filter(
    (item) => item.type === "function_call" || item.type === "custom_tool_call",
  ).length;
  if (calls > CODEX_STREAM_MAX_TOOL_CALLS) {
    return `the history carries ${calls} tool calls, over the limit of ${CODEX_STREAM_MAX_TOOL_CALLS}`;
  }
  return items.some(
    (item) =>
      (toolHistoryText(item)?.length ?? 0) > CODEX_STREAM_SIZE_CEILING_BYTES,
  )
    ? `a tool call's arguments or output exceed the limit of ${CODEX_STREAM_SIZE_CEILING_BYTES} characters`
    : undefined;
}

// ---------------------------------------------------------------------------
// Inputs Codex accepts but the Messages API rejects — fail loud, never guess.
// ---------------------------------------------------------------------------

function describeUntranslatableItem(
  item: CodexNativeInputItem,
  provider: "anthropic" | "vertex",
): string | undefined {
  if (item.type === "additional_tools") {
    const badTool = item.tools
      .flatMap((namespace) => namespace.tools)
      .find((tool) => !ANTHROPIC_TOOL_NAME_RE.test(tool.name));
    return badTool
      ? `tool name ${JSON.stringify(badTool.name)} does not match the Messages API's ${String(ANTHROPIC_TOOL_NAME_RE)}`
      : undefined;
  }
  if (item.type !== "message") {
    return undefined;
  }
  return item.content
    .map((part): string | undefined => {
      if (part.type !== "input_image") {
        return undefined;
      }
      if (item.role === "developer") {
        return "a developer message carries an image, which a text-only system prompt cannot hold";
      }
      if (!part.image_url.startsWith("data:")) {
        // Claude on Vertex takes only inline (base64) image sources; the
        // Vertex client in providers/googleVertex fetches URLs for the same reason.
        return provider === "vertex"
          ? "Claude on Vertex accepts only base64 image sources, not an image URL"
          : undefined;
      }
      const match = DATA_URI_RE.exec(part.image_url);
      if (!match) {
        return "an image data URI is not base64-encoded";
      }
      const mediaType = normalizeImageMediaType(match[1]);
      return ANTHROPIC_IMAGE_MEDIA_TYPES.has(mediaType)
        ? undefined
        : `image media type ${mediaType} is not one the Messages API accepts (jpeg, png, gif, webp)`;
    })
    .find((reason): reason is string => reason !== undefined);
}

function toolUseIds(message: ClaudeMessage | undefined): string[] {
  return message?.role === "assistant" && Array.isArray(message.content)
    ? message.content.flatMap((block) =>
        block.type === "tool_use" ? [block.id] : [],
      )
    : [];
}

function toolResultIds(message: ClaudeMessage | undefined): string[] {
  return message?.role === "user" && Array.isArray(message.content)
    ? message.content.flatMap((block) =>
        block.type === "tool_result" ? [block.tool_use_id] : [],
      )
    : [];
}

// The Messages API requires every tool call to be answered in the very next
// user turn, and every tool result to answer a call in the turn before it.
// History pruned on the client side can break either; this catches it here
// instead of as an upstream 400.
function describeToolPairingGap(
  messages: readonly ClaudeMessage[],
): string | undefined {
  return messages
    .map((message, index): string | undefined => {
      const answered = toolResultIds(messages[index + 1]);
      const unanswered = toolUseIds(message).find(
        (id) => !answered.includes(id),
      );
      if (unanswered) {
        return `tool call ${unanswered} has no result in the next user turn`;
      }
      const called = toolUseIds(messages[index - 1]);
      const orphaned = toolResultIds(message).find(
        (id) => !called.includes(id),
      );
      return orphaned
        ? `tool result for ${orphaned} answers no call in the preceding assistant turn`
        : undefined;
    })
    .find((reason): reason is string => reason !== undefined);
}

function lastAssistantMessageUsesTool(
  messages: readonly ClaudeMessage[],
): boolean {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  return (
    Array.isArray(lastAssistant?.content) &&
    lastAssistant.content.some((block) => block.type === "tool_use")
  );
}

// ---------------------------------------------------------------------------
// §3.2 translateCodexRequestToClaude — the full field-by-field mapping.
// ---------------------------------------------------------------------------

export function translateCodexRequestToClaude(
  request: CodexNativeRequest,
  target: { provider: "anthropic" | "vertex"; model: string },
):
  | {
      ok: true;
      value: ClaudeRequest;
      toolKindByName: ReadonlyMap<string, CodexNativeToolKind>;
    }
  | { ok: false; error: CodexTranslationError } {
  const oversized = describeOversizedToolHistory(request.input);
  if (oversized) {
    return {
      ok: false,
      error: { code: "REQUEST_TOO_LARGE", message: oversized },
    };
  }

  // Read from client_metadata, not top-level session_id/thread_id: the real
  // capture carries neither at top level (only nested in client_metadata),
  // which is why CodexNativeRequest has no top-level fields for them.
  if (
    (request.client_metadata?.session_id !== undefined ||
      request.client_metadata?.thread_id !== undefined) &&
    !hasFreshSessionPreamble(request.input)
  ) {
    return {
      ok: false,
      error: {
        code: "SUSPECTED_PARTIAL_HISTORY",
        message:
          "a request with session metadata does not open with the additional_tools preamble; refusing to translate what may be an incremental history as if it were complete",
      },
    };
  }

  const untranslatable = request.input
    .map((item) => describeUntranslatableItem(item, target.provider))
    .find((reason): reason is string => reason !== undefined);
  if (untranslatable) {
    return {
      ok: false,
      error: { code: "UNTRANSLATABLE_REQUEST", message: untranslatable },
    };
  }

  // The spec's cardinality rule: when more than one additional_tools item
  // appears, the last one wins.
  const additionalTools = request.input
    .filter(
      (item): item is CodexNativeAdditionalToolsInputItem =>
        item.type === "additional_tools",
    )
    .at(-1);
  const {
    tools,
    toolKindByName,
    reasons: schemaReasons,
  } = buildClaudeTools(additionalTools);
  const toolChoice = mapCodexToolChoiceToClaude(
    request.tool_choice,
    request.parallel_tool_calls,
  );
  const forcesTool = toolChoice.type === "any" || toolChoice.type === "tool";
  if (forcesTool && !tools) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_REQUEST",
        message:
          "tool_choice forces a tool call but the request declares no tools",
      },
    };
  }
  if (
    toolChoice.type === "tool" &&
    !tools?.some((tool) => tool.name === toolChoice.name)
  ) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_REQUEST",
        message: `tool_choice names ${JSON.stringify(toolChoice.name)}, which the request does not declare`,
      },
    };
  }

  const messages = coalesceCodexInputToClaudeMessages(request.input);
  if (messages[0]?.role !== "user") {
    return {
      ok: false,
      error: {
        code: "UNTRANSLATABLE_REQUEST",
        message:
          "the translated history does not open with a user turn, which the Messages API requires",
      },
    };
  }
  const pairingGap = describeToolPairingGap(messages);
  if (pairingGap) {
    return {
      ok: false,
      error: { code: "UNTRANSLATABLE_REQUEST", message: pairingGap },
    };
  }

  const maxTokens = resolveClaudeMaxTokens(target.model, undefined);
  const systemBlocks = buildSystemBlocksFromDeveloperMessages(request.input);
  // Thinking is left off in two cases the Messages API would reject: a forced
  // tool_choice (the same rule oauthFetch.ts applies), and a history whose
  // final assistant turn calls a tool, which with thinking on must open with a
  // thinking block. Codex history carries none that can be translated, since
  // its reasoning is OpenAI ciphertext.
  const thinking =
    forcesTool || lastAssistantMessageUsesTool(messages)
      ? undefined
      : mapCodexReasoningToThinking(request.reasoning, maxTokens);

  const claudeRequest: ClaudeRequest = {
    model: target.model,
    messages,
    max_tokens: maxTokens,
    ...(systemBlocks.length > 0 ? { system: systemBlocks } : {}),
    ...(tools ? { tools } : {}),
    // The Messages API accepts tool_choice only alongside tools.
    ...(tools ? { tool_choice: toolChoice } : {}),
    ...(thinking ? { thinking } : {}),
    stream: request.stream ?? true,
  };

  // Recorded only once translation has fully succeeded, so a request that is
  // rejected earlier (malformed tool_choice, untranslatable content, a
  // pairing gap) never fires a degrade counter for work that was discarded.
  for (const reason of schemaReasons) {
    recordCodexOutboundSchemaDegraded({
      toolName: reason.toolName,
      reason: reason.reason,
    });
  }
  for (const item of request.input) {
    if (
      item.type === "function_call" &&
      isMalformedFunctionArguments(item.arguments)
    ) {
      recordCodexOutboundUnsupportedField({
        field: "function_call.arguments",
        reason: "malformed_arguments_wrapped",
      });
    }
  }

  return { ok: true, value: claudeRequest, toolKindByName };
}

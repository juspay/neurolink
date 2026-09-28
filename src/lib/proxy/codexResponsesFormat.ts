/**
 * Wire-format translation: Anthropic `ClaudeResponse` shape -> the Codex
 * Responses shape a native Codex client expects.
 *
 * Pure wire-format only — no account selection, retry policy, or transport.
 * Mirrors `claudeFormat.ts`'s role for the opposite direction: that module
 * serializes NeuroLink's internal result into Claude SSE, this one serializes
 * an already-Claude-shaped result into Codex SSE (or one JSON envelope).
 */

import { randomBytes } from "node:crypto";
import { formatSSE } from "./claudeFormat.js";
import type {
  ClaudeContentBlock,
  ClaudeResponse,
  ClaudeUsage,
  CodexNativeToolKind,
  CodexResponseCustomToolCallItem,
  CodexResponseEnvelope,
  CodexResponseFunctionCallItem,
  CodexResponseItem,
  CodexResponseMessageItem,
  CodexResponseOpenItemKind,
  CodexResponseUsage,
} from "../types/index.js";

/** Empty by default so every existing caller (no `toolKindByName` argument)
 *  keeps treating every tool_use block as a `function` call, unchanged. */
const NO_TOOL_KINDS: ReadonlyMap<string, CodexNativeToolKind> = new Map();

/**
 * A `custom` tool was wrapped, on the request side, into a single-field
 * `{ input: "..." }` schema (§3.4 of `codexOutboundFallback.ts`), so the
 * client's grammar text is that one field. Undefined when the record does not
 * carry it as a string.
 */
function unwrapCustomToolInput(value: unknown): string | undefined {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "input" in value &&
    typeof value.input === "string"
    ? value.input
    : undefined;
}

/** The accumulated `input_json_delta` text of a custom call, unwrapped, or
 *  undefined when it is not (yet) a complete `{ input: "..." }` object. */
function unwrapCustomToolInputJson(text: string): string | undefined {
  try {
    return unwrapCustomToolInput(JSON.parse(text));
  } catch {
    return undefined;
  }
}

/** Same idiom as `generateToolUseId` (`claudeFormat.ts`), Codex's own prefix. */
export function generateCodexResponseId(): string {
  return `resp_${randomBytes(24).toString("base64url")}`;
}

const CODEX_ITEM_ID_PREFIX: Record<
  "message" | "function_call" | "custom_tool_call",
  string
> = {
  message: "msg_",
  function_call: "fc_",
  custom_tool_call: "ctc_",
};

/** Item ids are prefixed by kind so a client can tell message/tool items apart at a glance. */
export function generateCodexItemId(
  kind: "message" | "function_call" | "custom_tool_call",
): string {
  return `${CODEX_ITEM_ID_PREFIX[kind]}${randomBytes(18).toString("base64url").slice(0, 24)}`;
}

/**
 * Reuse the Anthropic `tool_use.id` (`toolu_...`) verbatim as the Codex `call_id`.
 * No id-mapping table exists anywhere in this codebase's translation modules, and
 * nothing on the way in validates `call_id` format — see the design doc's §5 for
 * the full reasoning and its one unresolved edge (a real, non-fallback Codex
 * backend rejecting a non-`call_`-prefixed id on a later turn).
 */
export function codexCallIdFromToolUseId(toolUseId: string): string {
  return toolUseId;
}

/**
 * `ClaudeResponse.stop_reason` is `string | null` with no enum in this repo
 * (`proxy.ts`), so any value this repo cannot name — including a real
 * Anthropic "refusal" or "pause_turn" — falls into "completed" rather than
 * surfacing as unusual. Deliberate simplification, stated explicitly.
 */
function mapClaudeStopReasonToCodex(stopReason: string | null): {
  status: "completed" | "incomplete";
  incomplete_details: CodexResponseEnvelope["incomplete_details"];
} {
  if (stopReason === "max_tokens") {
    return {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
    };
  }
  return { status: "completed", incomplete_details: null };
}

/**
 * Absent cache fields are omitted rather than zeroed (never conflate "not
 * observed" with "observed as zero" — the field's own doc comment on
 * `CodexResponseUsage` states this contract).
 */
export function synthesizeCodexUsage(usage: ClaudeUsage): CodexResponseUsage {
  const cacheRead = usage.cache_read_input_tokens;
  const cacheCreation = usage.cache_creation_input_tokens;
  const inputTokens =
    usage.input_tokens + (cacheRead ?? 0) + (cacheCreation ?? 0);
  const details =
    cacheRead === undefined && cacheCreation === undefined
      ? undefined
      : {
          ...(cacheRead === undefined ? {} : { cached_tokens: cacheRead }),
          ...(cacheCreation === undefined
            ? {}
            : { cache_write_tokens: cacheCreation }),
        };
  return {
    input_tokens: inputTokens,
    output_tokens: usage.output_tokens,
    total_tokens: inputTokens + usage.output_tokens,
    ...(details ? { input_tokens_details: details } : {}),
  };
}

/**
 * Shared by the streaming serializer's non-failure item close and the
 * non-streaming path (`serializeCodexResponse`), so item shape is defined
 * once. Always produces a "completed" item — the streaming failure path
 * (an item closed "incomplete" mid-turn) builds its item directly, since it
 * must preserve the raw accumulated text/argument bytes rather than a value
 * reconstructed through this function.
 */
export function buildCodexResponseItem(
  block: ClaudeContentBlock,
  itemId: string,
  toolKindByName: ReadonlyMap<string, CodexNativeToolKind> = NO_TOOL_KINDS,
): CodexResponseItem | null {
  if (block.type === "text") {
    // The streaming path opens a message item only on a block's first delta,
    // so an empty text block produces no item there; match it here.
    if (block.text === "") {
      return null;
    }
    return {
      id: itemId,
      type: "message",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text: block.text, annotations: [] }],
    };
  }
  if (
    block.type === "tool_use" &&
    toolKindByName.get(block.name) === "custom"
  ) {
    return {
      id: itemId,
      type: "custom_tool_call",
      status: "completed",
      call_id: codexCallIdFromToolUseId(block.id),
      name: block.name,
      input: unwrapCustomToolInput(block.input) ?? JSON.stringify(block.input),
    };
  }
  if (block.type === "tool_use") {
    return {
      id: itemId,
      type: "function_call",
      status: "completed",
      call_id: codexCallIdFromToolUseId(block.id),
      name: block.name,
      arguments: JSON.stringify(block.input),
    };
  }
  // thinking / image / tool_result — not emitted; see the design doc's §5.
  return null;
}

/** Non-streaming path: `§7` of the design — the document root IS a `CodexResponseEnvelope`. */
export function serializeCodexResponse(
  result: ClaudeResponse,
  requestModel: string,
  toolKindByName: ReadonlyMap<string, CodexNativeToolKind> = NO_TOOL_KINDS,
): CodexResponseEnvelope {
  const items: CodexResponseItem[] = [];
  for (const block of result.content) {
    const item = buildCodexResponseItem(
      block,
      generateCodexItemId(
        block.type !== "tool_use"
          ? "message"
          : toolKindByName.get(block.name) === "custom"
            ? "custom_tool_call"
            : "function_call",
      ),
      toolKindByName,
    );
    if (item) {
      items.push(item);
    }
  }
  const { status, incomplete_details } = mapClaudeStopReasonToCodex(
    result.stop_reason,
  );
  return {
    id: generateCodexResponseId(),
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    status,
    model: requestModel,
    output: items,
    usage: synthesizeCodexUsage(result.usage),
    incomplete_details,
    error: null,
  };
}

/**
 * Push-based streaming serializer. A genuinely incremental tool-call-argument
 * path (`openToolCall`/`pushToolCallArgsDelta`/`closeToolCall`) forwards each
 * raw `input_json_delta` chunk as it arrives rather than buffering the whole
 * call before emitting anything — `partial_json` is not individually valid
 * JSON, so a serializer that validated per-chunk could not do this.
 */
export class CodexResponsesStreamSerializer {
  private state: "idle" | "streaming" | "done" | "error" = "idle";
  private readonly responseId = generateCodexResponseId();
  private outputIndex = 0;
  private openKind: CodexResponseOpenItemKind = null;
  private openItemId = "";
  private textAccum = "";
  private argsAccum = "";
  private toolCallId = "";
  private toolName = "";
  private readonly closedItems: CodexResponseItem[] = [];
  private terminalEnvelope: CodexResponseEnvelope | null = null;

  constructor(
    private readonly model: string,
    private readonly toolKindByName: ReadonlyMap<
      string,
      CodexNativeToolKind
    > = NO_TOOL_KINDS,
  ) {}

  *start(): Generator<string> {
    this.assertNotTerminal();
    this.state = "streaming";
    const response = {
      id: this.responseId,
      object: "response",
      status: "in_progress",
      created_at: Math.floor(Date.now() / 1000),
      model: this.model,
      output: [],
      usage: null,
      incomplete_details: null,
      error: null,
    };
    yield formatSSE("response.created", { type: "response.created", response });
    // Whether the real CLI tolerates a stream without in_progress was never
    // bisected (test/fixtures/sse-bisection-findings.md), so the order the
    // real backend uses is kept: created, then in_progress, then items.
    yield formatSSE("response.in_progress", {
      type: "response.in_progress",
      response,
    });
  }

  *pushDelta(text: string): Generator<string> {
    this.assertNotTerminal();
    if (this.openKind !== "message") {
      yield* this.closeOpenItem(false);
      yield* this.openMessage();
    }
    this.textAccum += text;
    yield formatSSE("response.output_text.delta", {
      type: "response.output_text.delta",
      output_index: this.outputIndex,
      item_id: this.openItemId,
      content_index: 0,
      delta: text,
    });
  }

  /** Opens the tool-call item header at content_block_start, before any argument text
   *  is known — mirrors what content_block_start already gives us (id, name). A tool
   *  the request declared `custom` opens as a `custom_tool_call` item. */
  *openToolCall(toolUseId: string, name: string): Generator<string> {
    this.assertNotTerminal();
    yield* this.closeOpenItem(false);
    const kind =
      this.toolKindByName.get(name) === "custom"
        ? "custom_tool_call"
        : "function_call";
    this.openKind = kind;
    this.openItemId = generateCodexItemId(kind);
    this.toolCallId = codexCallIdFromToolUseId(toolUseId);
    this.toolName = name;
    this.argsAccum = "";
    const item: CodexResponseItem =
      kind === "custom_tool_call"
        ? {
            id: this.openItemId,
            type: kind,
            status: "in_progress",
            call_id: this.toolCallId,
            name: this.toolName,
            input: "",
          }
        : {
            id: this.openItemId,
            type: kind,
            status: "in_progress",
            call_id: this.toolCallId,
            name: this.toolName,
            arguments: "",
          };
    yield formatSSE("response.output_item.added", {
      type: "response.output_item.added",
      output_index: this.outputIndex,
      item,
    });
  }

  /** Forwards one raw partial_json fragment as-is — no JSON.parse here, because a lone
   *  fragment is not required to be valid JSON on its own. A custom call's fragments
   *  are the `{"input":"..."}` wrapper, not client text, so they are only buffered;
   *  `closeToolCall` emits the unwrapped input once the whole wrapper is known. */
  *pushToolCallArgsDelta(rawChunk: string): Generator<string> {
    this.assertNotTerminal();
    if (
      this.openKind !== "function_call" &&
      this.openKind !== "custom_tool_call"
    ) {
      throw new Error("pushToolCallArgsDelta with no open tool-call item");
    }
    this.argsAccum += rawChunk;
    if (this.openKind === "custom_tool_call") {
      return;
    }
    yield formatSSE("response.function_call_arguments.delta", {
      type: "response.function_call_arguments.delta",
      output_index: this.outputIndex,
      item_id: this.openItemId,
      delta: rawChunk,
    });
  }

  /**
   * Public close for a tool-use block at `content_block_stop`. A no-op when no
   * tool-call item is open, so a driver can call it unconditionally.
   * Validates the accumulated arguments once, here — the one place validity
   * is required. Throws on malformed JSON; the caller must catch and route to
   * `emitFailure` (never swallowed, never retried after this point).
   */
  *closeToolCall(): Generator<string> {
    this.assertNotTerminal();
    if (this.openKind === "custom_tool_call") {
      yield* this.closeCustomToolCall();
      return;
    }
    if (this.openKind !== "function_call") {
      return;
    }
    // A zero-argument call arrives with no input_json_delta at all. The value
    // that was validated is the value emitted, so it becomes "{}" everywhere,
    // and one delta carries it so the client sees the same shape as any call.
    const args = this.argsAccum === "" ? "{}" : this.argsAccum;
    JSON.parse(args); // throws on malformed JSON
    if (this.argsAccum === "") {
      yield formatSSE("response.function_call_arguments.delta", {
        type: "response.function_call_arguments.delta",
        output_index: this.outputIndex,
        item_id: this.openItemId,
        delta: args,
      });
    }
    yield formatSSE("response.function_call_arguments.done", {
      type: "response.function_call_arguments.done",
      output_index: this.outputIndex,
      item_id: this.openItemId,
      arguments: args,
    });
    const item: CodexResponseFunctionCallItem = {
      id: this.openItemId,
      type: "function_call",
      status: "completed",
      call_id: this.toolCallId,
      name: this.toolName,
      arguments: args,
    };
    yield formatSSE("response.output_item.done", {
      type: "response.output_item.done",
      output_index: this.outputIndex,
      item,
    });
    this.closedItems.push(item);
    this.openKind = null;
    this.outputIndex++;
  }

  /**
   * Public close for a text block at `content_block_stop`, mirroring
   * `closeToolCall`'s role for the message item. A no-op when no message item
   * is open, so a driver can call it unconditionally alongside `closeToolCall`
   * without first inspecting which kind is currently open.
   */
  *closeTextBlock(): Generator<string> {
    this.assertNotTerminal();
    if (this.openKind !== "message") {
      return;
    }
    yield* this.closeMessageItem(false);
  }

  *finish(
    stopReason: string | null,
    usage: ClaudeUsage,
  ): Generator<string, CodexResponseEnvelope> {
    this.assertNotTerminal();
    yield* this.closeOpenItem(false);
    const { status, incomplete_details } =
      mapClaudeStopReasonToCodex(stopReason);
    const envelope: CodexResponseEnvelope = {
      id: this.responseId,
      object: "response",
      created_at: Math.floor(Date.now() / 1000),
      status,
      model: this.model,
      output: this.closedItems,
      usage: synthesizeCodexUsage(usage),
      incomplete_details,
      error: null,
    };
    this.state = "done";
    this.terminalEnvelope = envelope;
    yield formatSSE(
      status === "incomplete" ? "response.incomplete" : "response.completed",
      {
        type:
          status === "incomplete"
            ? "response.incomplete"
            : "response.completed",
        response: envelope,
      },
    );
    return envelope;
  }

  /**
   * Post-commit terminal path. Closes any open item as "incomplete" — now
   * representable via `CodexResponseItemStatus` — then emits a single
   * `response.failed`. Idempotent: a second call after this one already ran
   * returns the same envelope without emitting further frames, so a driver
   * that reaches it defensively from more than one place never double-emits.
   */
  // `status` is accepted (not folded into the wire envelope, which has no
  // HTTP-status field) so a caller's classification — e.g. 502 upstream vs.
  // 400 malformed-arguments — is available to whatever logs or maps this
  // failure, mirroring `CodexFallbackStreamError`'s own `status` field on
  // the reverse direction.
  *emitFailure(
    _status: number,
    message: string,
    code?: string,
  ): Generator<string, CodexResponseEnvelope> {
    if (this.terminalEnvelope) {
      return this.terminalEnvelope;
    }
    yield* this.closeOpenItem(true);
    this.state = "error";
    const envelope: CodexResponseEnvelope = {
      id: this.responseId,
      object: "response",
      created_at: Math.floor(Date.now() / 1000),
      status: "failed",
      model: this.model,
      output: this.closedItems,
      incomplete_details: null,
      error: { code: code ?? "upstream_error", message },
    };
    this.terminalEnvelope = envelope;
    yield formatSSE("response.failed", {
      type: "response.failed",
      response: envelope,
    });
    return envelope;
  }

  private assertNotTerminal(): void {
    if (this.state === "done" || this.state === "error") {
      throw new Error(
        "CodexResponsesStreamSerializer: push after terminal event",
      );
    }
  }

  /**
   * The custom-kind close: nothing was streamed live, so one input delta
   * carries the whole unwrapped input, then its done event. Lenient where the
   * function path throws: the wrapper is Claude's own output for the
   * single-field schema `mapCodexCustomToolToClaude` declared, so a parse
   * failure is an internal bug, and the raw accumulated text is emitted rather
   * than failing the turn over it.
   */
  private *closeCustomToolCall(): Generator<string> {
    const input = unwrapCustomToolInputJson(this.argsAccum) ?? this.argsAccum;
    yield formatSSE("response.custom_tool_call_input.delta", {
      type: "response.custom_tool_call_input.delta",
      output_index: this.outputIndex,
      item_id: this.openItemId,
      delta: input,
    });
    yield formatSSE("response.custom_tool_call_input.done", {
      type: "response.custom_tool_call_input.done",
      output_index: this.outputIndex,
      item_id: this.openItemId,
      input,
    });
    const item: CodexResponseCustomToolCallItem = {
      id: this.openItemId,
      type: "custom_tool_call",
      status: "completed",
      call_id: this.toolCallId,
      name: this.toolName,
      input,
    };
    yield formatSSE("response.output_item.done", {
      type: "response.output_item.done",
      output_index: this.outputIndex,
      item,
    });
    this.closedItems.push(item);
    this.openKind = null;
    this.outputIndex++;
  }

  private *openMessage(): Generator<string> {
    this.openKind = "message";
    this.openItemId = generateCodexItemId("message");
    this.textAccum = "";
    yield formatSSE("response.output_item.added", {
      type: "response.output_item.added",
      output_index: this.outputIndex,
      item: {
        id: this.openItemId,
        type: "message",
        role: "assistant",
        status: "in_progress",
        content: [],
      },
    });
    yield formatSSE("response.content_part.added", {
      type: "response.content_part.added",
      output_index: this.outputIndex,
      item_id: this.openItemId,
      content_index: 0,
      part: { type: "output_text", text: "", annotations: [] },
    });
  }

  /** Closes whichever item is currently open, as "incomplete" when `failed`. */
  private *closeOpenItem(failed: boolean): Generator<string> {
    if (this.openKind === "function_call") {
      if (failed) {
        yield* this.closeFailedFunctionCall();
        return;
      }
      yield* this.closeToolCall();
      return;
    }
    if (this.openKind === "custom_tool_call") {
      if (failed) {
        yield* this.closeFailedCustomToolCall();
        return;
      }
      yield* this.closeToolCall();
      return;
    }
    if (this.openKind === "message") {
      yield* this.closeMessageItem(failed);
    }
  }

  /**
   * The failure-close counterpart to `closeToolCall`. Arguments are carried
   * verbatim from `argsAccum` and never re-validated — `JSON.parse` is not
   * called on the failure path, and no `function_call_arguments.done` is
   * emitted, since the arguments never reached a validated, complete state.
   */
  private *closeFailedFunctionCall(): Generator<string> {
    const item: CodexResponseFunctionCallItem = {
      id: this.openItemId,
      type: "function_call",
      status: "incomplete",
      call_id: this.toolCallId,
      name: this.toolName,
      arguments: this.argsAccum,
    };
    yield formatSSE("response.output_item.done", {
      type: "response.output_item.done",
      output_index: this.outputIndex,
      item,
    });
    this.closedItems.push(item);
    this.openKind = null;
    this.outputIndex++;
  }

  /**
   * The failure close for a custom call. Its accumulated bytes are Anthropic's
   * JSON wrapper, not the client's grammar text, so `input` is the unwrapped
   * string when the wrapper already parses and "" otherwise — an incomplete
   * item is never executed. No input done event, as on the function path.
   */
  private *closeFailedCustomToolCall(): Generator<string> {
    const item: CodexResponseCustomToolCallItem = {
      id: this.openItemId,
      type: "custom_tool_call",
      status: "incomplete",
      call_id: this.toolCallId,
      name: this.toolName,
      input: unwrapCustomToolInputJson(this.argsAccum) ?? "",
    };
    yield formatSSE("response.output_item.done", {
      type: "response.output_item.done",
      output_index: this.outputIndex,
      item,
    });
    this.closedItems.push(item);
    this.openKind = null;
    this.outputIndex++;
  }

  private *closeMessageItem(failed: boolean): Generator<string> {
    const text = this.textAccum;
    yield formatSSE("response.output_text.done", {
      type: "response.output_text.done",
      output_index: this.outputIndex,
      item_id: this.openItemId,
      content_index: 0,
      text,
    });
    yield formatSSE("response.content_part.done", {
      type: "response.content_part.done",
      output_index: this.outputIndex,
      item_id: this.openItemId,
      content_index: 0,
      part: { type: "output_text", text, annotations: [] },
    });
    const item: CodexResponseMessageItem = {
      id: this.openItemId,
      type: "message",
      role: "assistant",
      status: failed ? "incomplete" : "completed",
      content: [{ type: "output_text", text, annotations: [] }],
    };
    yield formatSSE("response.output_item.done", {
      type: "response.output_item.done",
      output_index: this.outputIndex,
      item,
    });
    this.closedItems.push(item);
    this.openKind = null;
    this.textAccum = "";
    this.outputIndex++;
  }
}

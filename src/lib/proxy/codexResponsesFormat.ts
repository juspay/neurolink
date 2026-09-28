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
  CodexResponseEnvelope,
  CodexResponseFunctionCallItem,
  CodexResponseItem,
  CodexResponseMessageItem,
  CodexResponseOpenItemKind,
  CodexResponseUsage,
} from "../types/index.js";

/** Same idiom as `generateToolUseId` (`claudeFormat.ts`), Codex's own prefix. */
export function generateCodexResponseId(): string {
  return `resp_${randomBytes(24).toString("base64url")}`;
}

/** Item ids are prefixed by kind so a client can tell message/tool items apart at a glance. */
export function generateCodexItemId(kind: "message" | "function_call"): string {
  const prefix = kind === "message" ? "msg_" : "fc_";
  return `${prefix}${randomBytes(18).toString("base64url").slice(0, 24)}`;
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
): CodexResponseEnvelope {
  const items: CodexResponseItem[] = [];
  for (const block of result.content) {
    const item = buildCodexResponseItem(
      block,
      generateCodexItemId(
        block.type === "tool_use" ? "function_call" : "message",
      ),
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

  constructor(private readonly model: string) {}

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

  /** Opens the function_call item header at content_block_start, before any argument text
   *  is known — mirrors what content_block_start already gives us (id, name). */
  *openToolCall(toolUseId: string, name: string): Generator<string> {
    this.assertNotTerminal();
    yield* this.closeOpenItem(false);
    this.openKind = "function_call";
    this.openItemId = generateCodexItemId("function_call");
    this.toolCallId = codexCallIdFromToolUseId(toolUseId);
    this.toolName = name;
    this.argsAccum = "";
    yield formatSSE("response.output_item.added", {
      type: "response.output_item.added",
      output_index: this.outputIndex,
      item: {
        id: this.openItemId,
        type: "function_call",
        status: "in_progress",
        call_id: this.toolCallId,
        name: this.toolName,
        arguments: "",
      },
    });
  }

  /** Forwards one raw partial_json fragment as-is — no JSON.parse here, because a lone
   *  fragment is not required to be valid JSON on its own. */
  *pushToolCallArgsDelta(rawChunk: string): Generator<string> {
    this.assertNotTerminal();
    if (this.openKind !== "function_call") {
      throw new Error("pushToolCallArgsDelta with no open function_call item");
    }
    this.argsAccum += rawChunk;
    yield formatSSE("response.function_call_arguments.delta", {
      type: "response.function_call_arguments.delta",
      output_index: this.outputIndex,
      item_id: this.openItemId,
      delta: rawChunk,
    });
  }

  /**
   * Public close for a tool-use block at `content_block_stop`. A no-op when no
   * function_call item is open, so a driver can call it unconditionally.
   * Validates the accumulated arguments once, here — the one place validity
   * is required. Throws on malformed JSON; the caller must catch and route to
   * `emitFailure` (never swallowed, never retried after this point).
   */
  *closeToolCall(): Generator<string> {
    this.assertNotTerminal();
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

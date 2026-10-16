/**
 * STT evaluation collector: keeps what two STTs wrote for the same call, side
 * by side, and measures how far apart they are per speaker.
 *
 * A sender (the call agent) posts batches of finalized segments, one STT
 * labelled `primary` (shown to people) and the other `shadow` (run only to be
 * compared). Segment ids are the sender's and stable, so a resent batch
 * replaces what it sent before rather than doubling it.
 *
 * With a directory, every accepted batch is appended to `<dir>/<call>.jsonl`
 * and replayed on start, so comparisons survive a restart; without one, calls
 * live in memory only. With `NEUROLINK_STT_EVAL_LANGFUSE_*` set, every batch
 * and the call's comparison are also exported to that Langfuse project (see
 * sttEvalLangfuse.ts); only the environment decides that, never a request.
 */
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  ServerSTTEvalBatchRequest,
  ServerSTTEvalAlignment,
  ServerSTTEvalBatchResponse,
  ServerSTTEvalCallRecord,
  ServerSTTEvalCallSummary,
  ServerSTTEvalComparison,
  ServerSTTEvalOptions,
  ServerSTTEvalReport,
  ServerSTTEvalSegment,
  ServerSTTEvalSide,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { phoneticKey } from "../codeMix.js";
import {
  STTEvalLangfuseExporter,
  sttEvalLangfuseConfigFromEnv,
} from "./sttEvalLangfuse.js";

const DEFAULT_MAX_CALLS = 1000;
const DEFAULT_MAX_SEGMENTS = 50_000;
/** Words per side above which a speaker is aligned in time windows instead of whole. */
const FULL_ALIGN_MAX_WORDS = 4000;
const WINDOW_S = 300;

export class STTEvalStore {
  private readonly _dir: string | undefined;
  private readonly _maxCalls: number;
  private readonly _maxSegments: number;
  private readonly _calls = new Map<string, ServerSTTEvalCallRecord>();
  /** Per call: the tail of its accept queue, so batches apply and append in arrival order. */
  private readonly _queues = new Map<string, Promise<unknown>>();
  private _ready: Promise<void> | undefined;
  private readonly _langfuse: STTEvalLangfuseExporter | undefined;

  constructor(options: ServerSTTEvalOptions = {}) {
    const dir = options.dir ?? process.env.NEUROLINK_STT_EVAL_DIR?.trim();
    this._dir = dir ? dir : undefined;
    this._maxCalls = Math.max(1, options.maxCalls ?? DEFAULT_MAX_CALLS);
    this._maxSegments = Math.max(
      1,
      options.maxSegmentsPerCall ?? DEFAULT_MAX_SEGMENTS,
    );
    const langfuse = sttEvalLangfuseConfigFromEnv();
    this._langfuse = langfuse
      ? new STTEvalLangfuseExporter(langfuse)
      : undefined;
  }

  async accept(
    batch: ServerSTTEvalBatchRequest,
  ): Promise<ServerSTTEvalBatchResponse> {
    await this._load();
    return this._serial(batch.call_id, async () => {
      const call = (await this._callFor(batch.call_id)) ?? this._create(batch);
      const counts = this._apply(call, batch);
      if (this._dir) {
        try {
          await appendFile(
            this._fileFor(batch.call_id),
            `${JSON.stringify(batch)}\n`,
            "utf8",
          );
        } catch (error) {
          logger.warn("[stt-eval] could not persist batch", {
            callId: batch.call_id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      if (this._langfuse) {
        // Background: Langfuse never delays or fails the sender's batch.
        void this._langfuse.export(batch, this._reportOf(call, false));
      }
      this._evict();
      return {
        call_id: call.callId,
        batch: batch.batch,
        final: call.final,
        ...counts,
        segments: countBySource(call),
      };
    });
  }

  async list(): Promise<ServerSTTEvalCallSummary[]> {
    await this._load();
    return [...this._calls.values()]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(summarize);
  }

  async report(
    callId: string,
    includeSegments = false,
  ): Promise<ServerSTTEvalReport | undefined> {
    await this._load();
    const call = await this._callFor(callId);
    return call ? this._reportOf(call, includeSegments) : undefined;
  }

  private _reportOf(
    call: ServerSTTEvalCallRecord,
    includeSegments: boolean,
  ): ServerSTTEvalReport {
    const ordered = [...call.segments.values()].sort(
      (a, b) => timeOf(a) - timeOf(b),
    );
    const bySpeaker = new Map<string, ServerSTTEvalSegment[]>();
    for (const segment of ordered) {
      const list = bySpeaker.get(segment.participant_identity) ?? [];
      list.push(segment);
      bySpeaker.set(segment.participant_identity, list);
    }
    let distance = 0;
    let refWords = 0;
    let phoneticDistance = 0;
    const speakers: ServerSTTEvalComparison[] = [];
    for (const [identity, segments] of bySpeaker) {
      const compared = compareSpeaker(identity, segments, call.models);
      speakers.push(compared.comparison);
      distance += compared.plain.distance;
      phoneticDistance += compared.phonetic.distance;
      refWords += compared.plain.refWords;
    }
    return {
      ...summarize(call),
      overall: {
        disagreement: refWords ? round(distance / refWords) : null,
        phonetic_disagreement: refWords
          ? round(phoneticDistance / refWords)
          : null,
      },
      speakers_compared: speakers,
      ...(includeSegments ? { segment_list: ordered } : {}),
    };
  }

  /** Runs `task` after every earlier task for the same call has settled. */
  private _serial<T>(callId: string, task: () => Promise<T>): Promise<T> {
    const previous = this._queues.get(callId) ?? Promise.resolve();
    const run = previous.then(task, task);
    const tail = run.catch(() => undefined);
    this._queues.set(callId, tail);
    void tail.then(() => {
      if (this._queues.get(callId) === tail) {
        this._queues.delete(callId);
      }
    });
    return run;
  }

  private _create(batch: ServerSTTEvalBatchRequest): ServerSTTEvalCallRecord {
    const call: ServerSTTEvalCallRecord = {
      callId: batch.call_id,
      room: batch.room ?? null,
      models: { ...batch.models },
      final: false,
      batches: new Set(),
      segments: new Map(),
      updatedAt: Date.now(),
    };
    this._calls.set(batch.call_id, call);
    return call;
  }

  private _apply(
    call: ServerSTTEvalCallRecord,
    batch: ServerSTTEvalBatchRequest,
  ): { inserted: number; updated: number; ignored: number } {
    let inserted = 0;
    let updated = 0;
    let ignored = 0;
    for (const segment of batch.segments) {
      if (call.segments.has(segment.id)) {
        updated++;
      } else if (call.segments.size >= this._maxSegments) {
        ignored++;
        continue;
      } else {
        inserted++;
      }
      call.segments.set(segment.id, { ...segment });
    }
    call.batches.add(batch.batch);
    call.final = call.final || batch.final === true;
    call.room = batch.room ?? call.room;
    call.models = { ...batch.models };
    call.updatedAt = Date.now();
    // Re-insert so Map order tracks recency for eviction.
    this._calls.delete(call.callId);
    this._calls.set(call.callId, call);
    return { inserted, updated, ignored };
  }

  private async _callFor(
    callId: string,
  ): Promise<ServerSTTEvalCallRecord | undefined> {
    const held = this._calls.get(callId);
    if (held || !this._dir) {
      return held;
    }
    // Evicted from memory but still on disk.
    const text = await readFile(this._fileFor(callId), "utf8").catch(
      () => undefined,
    );
    return text === undefined ? undefined : this._replay(text);
  }

  private _evict(): void {
    while (this._calls.size > this._maxCalls) {
      const oldest = this._calls.keys().next().value;
      if (oldest === undefined) {
        return;
      }
      this._calls.delete(oldest);
    }
  }

  private _fileFor(callId: string): string {
    const safe = callId.replace(/[^A-Za-z0-9._-]/gu, "_").slice(0, 80);
    const hash = createHash("sha256").update(callId).digest("hex").slice(0, 10);
    return join(this._dir ?? "", `${safe}-${hash}.jsonl`);
  }

  /** Replays the directory once; every caller awaits the same load. */
  private _load(): Promise<void> {
    this._ready ??= this._loadDir();
    return this._ready;
  }

  private async _loadDir(): Promise<void> {
    const dir = this._dir;
    if (!dir) {
      return;
    }
    try {
      await mkdir(dir, { recursive: true });
      const files = (await readdir(dir)).filter((f) => f.endsWith(".jsonl"));
      for (const file of files) {
        this._replay(await readFile(join(dir, file), "utf8"));
      }
      // Replay order is filesystem order; keep the most recent calls.
      const recent = [...this._calls.values()].sort(
        (a, b) => a.updatedAt - b.updatedAt,
      );
      this._calls.clear();
      for (const call of recent) {
        this._calls.set(call.callId, call);
      }
      this._evict();
    } catch (error) {
      logger.warn("[stt-eval] could not load stored calls", {
        dir,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private _replay(text: string): ServerSTTEvalCallRecord | undefined {
    let call: ServerSTTEvalCallRecord | undefined;
    let lastSeen = 0;
    for (const line of text.split("\n")) {
      if (!line.trim()) {
        continue;
      }
      try {
        const batch = JSON.parse(line) as ServerSTTEvalBatchRequest;
        call = call ?? this._create(batch);
        this._apply(call, batch);
        for (const segment of batch.segments) {
          lastSeen = Math.max(lastSeen, segment.received_at * 1000);
        }
      } catch {
        // A torn last line from a crash mid-write: skip it.
      }
    }
    if (call && lastSeen > 0) {
      call.updatedAt = lastSeen;
    }
    return call;
  }
}

function summarize(call: ServerSTTEvalCallRecord): ServerSTTEvalCallSummary {
  let first: number | null = null;
  let last: number | null = null;
  const speakers = new Set<string>();
  for (const segment of call.segments.values()) {
    speakers.add(segment.participant_identity);
    first =
      first === null
        ? segment.received_at
        : Math.min(first, segment.received_at);
    last =
      last === null ? segment.received_at : Math.max(last, segment.received_at);
  }
  return {
    call_id: call.callId,
    room: call.room,
    models: call.models,
    final: call.final,
    batches: call.batches.size,
    segments: countBySource(call),
    speakers: speakers.size,
    first_received_at: first,
    last_received_at: last,
    updated_at: call.updatedAt,
  };
}

function countBySource(call: ServerSTTEvalCallRecord): {
  primary: number;
  shadow: number;
} {
  let primary = 0;
  let shadow = 0;
  for (const segment of call.segments.values()) {
    if (segment.source === "primary") {
      primary++;
    } else {
      shadow++;
    }
  }
  return { primary, shadow };
}

function timeOf(segment: ServerSTTEvalSegment): number {
  return segment.start_time ?? segment.end_time ?? segment.received_at;
}

function compareSpeaker(
  identity: string,
  segments: ServerSTTEvalSegment[],
  models: { primary: string; shadow: string },
): {
  comparison: ServerSTTEvalComparison;
  plain: ServerSTTEvalAlignment;
  phonetic: ServerSTTEvalAlignment;
} {
  const primary = segments.filter((s) => s.source === "primary");
  const shadow = segments.filter((s) => s.source === "shadow");
  const name =
    segments.find((s) => s.participant_name)?.participant_name ?? identity;
  const words = (list: ServerSTTEvalSegment[]): string[] =>
    list.flatMap((s) => wordsOf(s.text));
  const primaryWords = words(primary);
  const shadowWords = words(shadow);
  const windowed =
    primaryWords.length > FULL_ALIGN_MAX_WORDS ||
    shadowWords.length > FULL_ALIGN_MAX_WORDS;
  const plain = windowed
    ? alignWindows(primary, shadow, (t) => t)
    : align(primaryWords, shadowWords);
  const phonetic = windowed
    ? alignWindows(primary, shadow, phoneticKey)
    : align(primaryWords.map(phoneticKey), shadowWords.map(phoneticKey));
  return {
    comparison: {
      participant_identity: identity,
      participant_name: name,
      primary: sideOf(primary, models.primary, primaryWords.length),
      shadow: sideOf(shadow, models.shadow, shadowWords.length),
      disagreement: plain.refWords
        ? round(plain.distance / plain.refWords)
        : null,
      phonetic_disagreement: phonetic.refWords
        ? round(phonetic.distance / phonetic.refWords)
        : null,
      method: windowed ? "windowed" : "full",
    },
    plain,
    phonetic,
  };
}

function sideOf(
  segments: ServerSTTEvalSegment[],
  fallbackModel: string,
  words: number,
): ServerSTTEvalSide {
  const languages = new Map<string, number>();
  let latencySum = 0;
  let latencyCount = 0;
  for (const segment of segments) {
    if (segment.language) {
      languages.set(
        segment.language,
        (languages.get(segment.language) ?? 0) + 1,
      );
    }
    if (typeof segment.end_time === "number") {
      const latency = segment.received_at - segment.end_time;
      if (latency >= 0 && latency < 600) {
        latencySum += latency;
        latencyCount++;
      }
    }
  }
  return {
    model: segments[0]?.model ?? fallbackModel,
    segments: segments.length,
    words,
    languages: [...languages.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([language]) => language),
    mean_latency_s: latencyCount ? round(latencySum / latencyCount) : null,
  };
}

/** Long speakers: align consecutive 5-minute windows, so cost stays bounded. */
function alignWindows(
  primary: ServerSTTEvalSegment[],
  shadow: ServerSTTEvalSegment[],
  key: (word: string) => string,
): ServerSTTEvalAlignment {
  const bucket = (list: ServerSTTEvalSegment[]): Map<number, string[]> => {
    const out = new Map<number, string[]>();
    for (const segment of list) {
      const w = Math.floor(timeOf(segment) / WINDOW_S);
      const words = out.get(w) ?? [];
      words.push(...wordsOf(segment.text).map(key));
      out.set(w, words);
    }
    return out;
  };
  const p = bucket(primary);
  const s = bucket(shadow);
  let distance = 0;
  let refWords = 0;
  for (const w of new Set([...p.keys(), ...s.keys()])) {
    const result = align(p.get(w) ?? [], s.get(w) ?? []);
    distance += result.distance;
    refWords += result.refWords;
  }
  return { distance, refWords };
}

function align(ref: string[], hyp: string[]): ServerSTTEvalAlignment {
  const row = Array.from({ length: hyp.length + 1 }, (_, j) => j);
  for (let i = 1; i <= ref.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= hyp.length; j++) {
      const above = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (ref[i - 1] === hyp[j - 1] ? 0 : 1),
      );
      previous = above;
    }
  }
  return { distance: row[hyp.length], refWords: ref.length };
}

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{M}\p{N}\s']/gu, " ")
    .split(/\s+/u)
    .filter(Boolean);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

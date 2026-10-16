import { decodeFile, toWav } from "./audio";
import {
  cfg,
  base,
  fmtClock,
  INDIC_RE,
  nlBase,
  NL_DIARIZED,
  NL_PROVIDERS,
  SAMPLE_RATE,
  errMsg,
} from "./config";
import { asrContextPrompt, correctText } from "./corrector";
import {
  indicLang,
  indicRequest,
  lidLabel,
  scribeRequest,
  whistleReady,
  whistleStart,
  whistleTranscribe,
  type ScribeTurn,
} from "./engines";
import { download } from "./feed";
import {
  nlContext,
  nlDictionary,
  nlLangLabel,
  nlLanguage,
  nlSteps,
  nlTranscribe,
  nlFallbackFor,
  nlModelFor,
  nlProviderFor,
  nlTransliterate,
  serverHas,
} from "./neurolink";
import { getState, setState, storage, useServer } from "./store";
import type {
  ColumnState,
  EngineId,
  FileColumn,
  FileJob,
  Segment,
} from "./types";

type Job = FileJob & {
  file: File;
  abort: AbortController;
  // re-run one failed part of a column (set by runViaServer while the job is current)
  retry: Partial<Record<FileColumn, (part: number) => Promise<void>>>;
  cloudTurns?: ScribeTurn[];
  cloudSpeakers?: string[];
};
let job: Job | null = null;
let jobSeq = 0;

function publish() {
  if (!job) return setState({ job: null });
  const columns: FileJob["columns"] = {};
  for (const [k, c] of Object.entries(job.columns) as [
    FileColumn,
    ColumnState,
  ][])
    columns[k] = {
      ...c,
      rows: c.rows.map((r) => ({ ...r })),
      ...(c.parts ? { parts: c.parts.map((p) => ({ ...p })) } : {}),
    };
  setState({
    job: {
      id: job.id,
      fileName: job.fileName,
      sizeMb: job.sizeMb,
      t0: job.t0,
      duration: job.duration,
      columns,
    },
  });
}

const col = (k: FileColumn): ColumnState => job!.columns[k]!;
const newCol = (): ColumnState => ({
  phase: "",
  done: false,
  t1: null,
  progress: 0,
  rows: [],
  showSpeakers: false,
});

export function columnStats(
  j: FileJob,
  k: FileColumn,
  now = performance.now(),
) {
  const S = j.columns[k];
  if (!S) return "";
  if (S.statsOverride) return S.statsOverride;
  const el = ((S.t1 || now) - j.t0) / 1000;
  if (k === "cloud")
    return `${el.toFixed(0)} s` + (S.phase ? ` · ${S.phase}` : "");
  return S.done
    ? `${fmtClock(j.duration)} · ${S.phase}${k === "indic" && S.lang ? " · lang " + S.lang : ""}`
    : `${el.toFixed(0)} s · ${S.phase}`;
}

export function setFileEngines(list: EngineId[]) {
  storage.set("voice-bench-fengines", list);
  setState({ fengines: list });
}

const flags = () => getState().flags;
const runPool = async <T>(
  J: Job,
  items: T[],
  limit: number,
  fn: (x: T) => Promise<void>,
) => {
  let next = 0;
  const worker = async () => {
    while (next < items.length && !J.abort.signal.aborted)
      await fn(items[next++]);
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
};

async function postProcessRows(J: Job, rows: Segment[], S: ColumnState) {
  if (flags().romanize) {
    const todo = rows.filter((r) => r.text && INDIC_RE.test(r.text));
    if (todo.length) {
      S.phase = `romanizing ${todo.length}`;
      publish();
      await runPool(J, todo, 2, async (r) => {
        try {
          const out = (
            await correctText(r.text ?? "", null, { signal: J.abort.signal })
          ).text;
          if (out) {
            r.original = r.text ?? undefined;
            r.text = out;
          }
        } catch {
          /* keep the native text */
        }
      });
      S.t1 = performance.now();
    }
  }
}

// a ticking column refreshes its elapsed time once a second
function ticker(J: Job, S: ColumnState, from: string, to: string, pct: number) {
  return window.setInterval(() => {
    if (S.phase === from && performance.now() - J.t0 > 3000) {
      S.phase = to;
      S.progress = pct;
    }
    publish();
  }, 1000);
}

// Files through the server: one column per engine, segments (with speakers) from the result.
// Large files are sent in parts: the JSON route carries audio as base64 (a third larger than the file),
// the public tunnel refuses bodies over 100 MB and the server caps audio at 64 MB per request. Parts
// are 16 kHz mono WAV of at most PART_SECONDS (~9.6 MB), cut at the quietest moment near each boundary,
// and shown as each one lands. The server's engines share their hardware between concurrent requests,
// so parallel parts finish together: a short FIRST_SECONDS part goes alone so text appears within
// seconds, then the rest run PARALLEL at a time for throughput (measured on a 21-minute file: first
// text at ~140 s with everything parallel).
const DIRECT_MAX_BYTES = 30 * 1024 * 1024;
const FIRST_SECONDS = 45;
const PART_SECONDS = 300;
const PARALLEL = 3;

// `start`/`end` are the part's own stretch of the timeline; the audio sent begins OVERLAP_SECONDS
// earlier (`audioStart`), so a word cut at a boundary is heard whole by one side and deduped at the seam.
type Part = { start: number; end: number; audioStart: number; blob: Blob };
const OVERLAP_SECONDS = 2;

function splitAtQuiet(pcm: Float32Array): Part[] {
  const sr = SAMPLE_RATE,
    block = Math.round(0.02 * sr),
    search = 5 * sr;
  const parts: Part[] = [];
  let from = 0;
  while (from < pcm.length) {
    let to = Math.min(
      pcm.length,
      from + (parts.length ? PART_SECONDS : FIRST_SECONDS) * sr,
    );
    if (to < pcm.length) {
      // the quietest 20 ms block in the last 5 s before the boundary
      let best = to,
        bestE = Infinity;
      for (
        let i = Math.max(from + block, to - Math.min(search, (to - from) >> 2));
        i + block <= to;
        i += block
      ) {
        let e = 0;
        for (let k = i; k < i + block; k++) e += pcm[k] * pcm[k];
        if (e < bestE) {
          bestE = e;
          best = i + (block >> 1);
        }
      }
      to = best;
    }
    const audioFrom = parts.length
      ? Math.max(0, from - OVERLAP_SECONDS * sr)
      : from;
    parts.push({
      start: from / sr,
      end: to / sr,
      audioStart: audioFrom / sr,
      blob: toWav(pcm.subarray(audioFrom, to)),
    });
    from = to;
  }
  return parts;
}

// Decoding is the expensive step; every column of a job shares it.
const decoded = new WeakMap<File, Promise<Float32Array>>();
function pcmOf(file: File): Promise<Float32Array> {
  let p = decoded.get(file);
  if (!p) {
    p = decodeFile(file);
    decoded.set(file, p);
  }
  return p;
}

const splits = new WeakMap<File, Promise<Part[]>>();
function partsOf(file: File): Promise<Part[]> {
  if (file.size <= DIRECT_MAX_BYTES)
    return Promise.resolve([{ start: 0, end: 0, audioStart: 0, blob: file }]);
  let p = splits.get(file);
  if (!p) {
    p = pcmOf(file).then(splitAtQuiet);
    splits.set(file, p);
  }
  return p;
}

// Words both sides of a seam heard: drop the leading words of `cur` that repeat the tail of `prev`.
const norm = (w: string) =>
  w.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
function trimSeam(prev: string, cur: string) {
  const a = prev.split(/\s+/).filter(Boolean),
    b = cur.split(/\s+/).filter(Boolean);
  for (let k = Math.min(12, a.length, b.length); k > 0; k--) {
    let same = true;
    for (let j = 0; j < k && same; j++)
      same = norm(a[a.length - k + j]) === norm(b[j]) && norm(b[j]) !== "";
    if (same) return b.slice(k).join(" ");
  }
  return cur;
}
const stepLine = (steps: string[]) =>
  steps
    .filter((x) => x !== "via NeuroLink")
    .map((x) => x.replace(/\s*\(?\d+\s?ms\)?/g, "").trim())
    .filter(
      (x) => x && !/^(transcribe|2nd opinion|decide|rewrite)(,|$)/.test(x),
    )
    .join(" · ");

type PartResult = {
  rows: Segment[];
  speakers: string[];
  segs: number;
  steps: string[];
  end: number;
  lang: string | null;
};

async function transcribePart(
  J: Job,
  kind: "local" | "indic" | "whistle",
  part: Part,
  index: number,
  multi: boolean,
): Promise<PartResult> {
  // Files are corrected segment by segment on the server, with the same memory pass as live captions.
  // Spark diarizes into speaker turns; the others split on utterances, each with its own language.
  const d = await nlTranscribe(part.blob, {
    eng: kind,
    model: kind === "local" ? NL_DIARIZED : null,
    diarize: kind === "local",
    correct: flags().correct,
    fallback: kind === "indic" ? NL_PROVIDERS.local : null,
    ...(kind !== "local" ? { chunking: "utterances" as const } : {}),
    signal: J.abort.signal,
  });
  const at = part.audioStart;
  const partDur = d.duration || part.end - at;
  const segs = d.segments?.length
    ? d.segments
    : d.text
      ? [
          {
            start: 0,
            end: partDur,
            text: d.text,
            speaker: undefined,
            language: d.language,
          },
        ]
      : [];
  // speakers are told apart within a part, so a multi-part label names its part
  const label = (id: string) => (multi ? `Part ${index + 1} · ${id}` : id);
  const ids = [
    ...new Set(segs.map((x) => x.speaker).filter(Boolean)),
  ] as string[];
  const names = Object.fromEntries(
    ids.map((id, k) => [id, label(`Speaker ${k + 1}`)]),
  );
  const rows: Segment[] = segs.map((x) => {
    const st = x.start ?? x.startTime ?? 0;
    return {
      start: at + st,
      end: at + (x.end ?? x.endTime ?? st),
      text: x.text,
      speaker: x.speaker ? names[x.speaker] : null,
      language: x.language,
    };
  });
  // Utterance chunks come back corrected one by one; a diarized transcript is corrected as a whole,
  // so that correction gets its own row.
  if (kind === "local" && d.corrected && d.corrected !== d.text)
    rows.push({
      start: at,
      end: at + partDur,
      text: d.corrected,
      raw: d.raw,
      speaker: label("corrected"),
    });
  return {
    rows,
    speakers: ids.map((id) => names[id]),
    segs: segs.length,
    steps: nlSteps(d),
    end: at + partDur,
    lang: nlLangLabel(d.language, d.languageDetected),
  };
}

const RETRY_DELAY_MS = 2000;

async function runViaServer(kind: "local" | "indic" | "whistle", file: File) {
  const S = col(kind);
  const thisJob = job!;
  S.rows = [];
  S.progress = 5;
  const big = file.size > DIRECT_MAX_BYTES;
  S.phase = big ? "preparing parts" : "uploading to NeuroLink";
  publish();
  const tick = big
    ? window.setInterval(publish, 1000)
    : ticker(
        thisJob,
        S,
        "uploading to NeuroLink",
        kind === "local" ? "diarizing + transcribing" : "transcribing",
        55,
      );
  try {
    const parts = await partsOf(file);
    const multi = parts.length > 1;
    const results: (PartResult | null)[] = parts.map(() => null);
    if (multi)
      S.parts = parts.map((p) => ({
        start: p.start,
        end: p.end,
        state: "queued",
      }));
    const working =
      kind === "local" ? "diarizing + transcribing" : "transcribing";

    // A part's rows minus what the previous part already said in the overlap, under a step line.
    const withSeam = (r: PartResult, i: number): Segment[] => {
      let rows = r.rows;
      if (i > 0) {
        const seam = parts[i].start;
        rows = rows.filter(
          (x) => x.speaker?.endsWith("corrected") || x.end > seam + 0.25,
        );
        const prev = results[i - 1]?.rows
          .filter((x) => !x.speaker?.endsWith("corrected"))
          .at(-1);
        const first = rows[0];
        if (prev?.text && first?.text && first.start < seam) {
          const text = trimSeam(prev.text, first.text);
          rows = text
            ? [
                { ...first, start: Math.max(first.start, seam), text },
                ...rows.slice(1),
              ]
            : rows.slice(1);
        }
      }
      const steps = stepLine(r.steps);
      return multi
        ? [
            {
              start: parts[i].start,
              end: parts[i].end,
              divider: `Part ${i + 1}${steps ? " · " + steps : ""}`,
            },
            ...rows,
          ]
        : rows;
    };
    // rows in timeline order, whatever order the parts finish in; a failed part leaves a retryable gap
    const refresh = () => {
      const settled =
        S.parts?.filter((p) => p.state === "done" || p.state === "failed")
          .length ?? 0;
      S.rows = results.flatMap((r, i): Segment[] =>
        r
          ? withSeam(r, i)
          : S.parts?.[i].state === "failed"
            ? [
                {
                  start: parts[i].start,
                  end: parts[i].end,
                  error: `Part ${i + 1} failed: ${S.parts[i].error}`,
                  part: i,
                },
              ]
            : S.parts?.[i].state === "working" &&
                results.slice(i + 1).some(Boolean)
              ? // a part being retried (or still running behind later ones) keeps its place
                [
                  {
                    start: parts[i].start,
                    end: parts[i].end,
                    text: null,
                    part: i,
                  },
                ]
              : [],
      );
      S.showSpeakers = results.some(
        (r) =>
          r &&
          (r.speakers.length > 1 ||
            r.rows.some((x) => x.speaker?.endsWith("corrected"))),
      );
      if (multi && !S.done) {
        S.progress = 5 + Math.round((95 * settled) / parts.length);
        S.phase = `${settled} of ${parts.length} parts · ${settled < parts.length ? working : "finishing"}`;
      }
      if (job === thisJob) publish();
    };

    // the column summary; re-run after a manual retry so counts and "failed" stay true
    const finalize = () => {
      const ok = results.filter(Boolean) as PartResult[];
      S.t1 = performance.now();
      S.done = true;
      if (!ok.length) {
        S.phase =
          "failed: " +
          (S.parts?.find((p) => p.error)?.error ??
            "no part could be transcribed");
        S.progress = 100;
        return;
      }
      const dur = Math.max(...ok.map((r) => r.end));
      thisJob.duration = Math.max(thisJob.duration, dur);
      if (kind === "indic") S.lang = ok[0].lang;
      const speakers = new Set(ok.flatMap((r) => r.speakers));
      const segs = ok.reduce((n, r) => n + r.segs, 0);
      const failed = S.parts?.filter((p) => p.state === "failed").length ?? 0;
      const secs = (S.t1 - thisJob.t0) / 1000;
      S.phase = [
        kind === "local"
          ? `${speakers.size || 1} speaker${speakers.size > 1 ? "s" : ""}`
          : `${segs} piece${segs === 1 ? "" : "s"}`,
        multi
          ? `${parts.length} parts${failed ? `, ${failed} failed — retry below` : ""}`
          : null,
        ok[ok.length - 1].steps.join(" · "),
        `${secs.toFixed(0)} s total`,
        dur ? `${(dur / secs).toFixed(0)}× realtime` : null,
        "done",
      ]
        .filter(Boolean)
        .join(" · ");
      S.progress = 100;
    };

    // one part: a transient failure (server restart, timeout, 5xx) gets one automatic retry
    const run = async (i: number) => {
      if (S.parts)
        Object.assign(S.parts[i], { state: "working", error: undefined });
      refresh();
      for (let attempt = 0; ; attempt++) {
        try {
          results[i] = await transcribePart(thisJob, kind, parts[i], i, multi);
          if (S.parts) S.parts[i].state = "done";
          break;
        } catch (e) {
          if (!multi) throw e;
          if (attempt === 0 && !thisJob.abort.signal.aborted) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            continue;
          }
          if (S.parts)
            Object.assign(S.parts[i], { state: "failed", error: errMsg(e) });
          break;
        }
      }
      refresh();
    };

    // the short first part alone, then the rest PARALLEL at a time
    await run(0);
    let next = 1;
    const worker = async () => {
      while (next < parts.length && !thisJob.abort.signal.aborted)
        await run(next++);
    };
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL, parts.length - 1) }, worker),
    );
    if (thisJob.abort.signal.aborted) throw new Error("cancelled");
    if (multi)
      thisJob.retry[kind] = async (i: number) => {
        if (thisJob.abort.signal.aborted || S.parts?.[i].state !== "failed")
          return;
        S.done = false;
        await run(i);
        refresh();
        finalize();
        if (job === thisJob) publish();
      };
    refresh();
    finalize();
  } catch (e) {
    S.t1 = performance.now();
    S.phase = thisJob.abort.signal.aborted
      ? "cancelled"
      : /decod|Unable/i.test(errMsg(e))
        ? "failed: the browser cannot decode this file's audio"
        : "failed: " + errMsg(e);
  } finally {
    clearInterval(tick);
  }
  if (job === thisJob) publish();
}

export function retryPart(k: FileColumn, part: number) {
  return job?.retry[k]?.(part);
}

// ------------------------------------------------------------------ file mode over the WebSocket
// One session per column: the file's 16 kHz PCM goes up as fast as the socket takes it, the server
// endpoints, transcribes (three utterances in flight, one retry each) and corrects, and each utterance
// is shown as its `final` lands and replaced when `corrected` arrives. Same events as live captions.
type WsEvent = {
  type: string;
  utterance?: number;
  text?: string;
  raw?: string;
  segment?: { start?: number; end?: number };
  language?: string;
  languageDetected?: boolean;
  steps?: string[];
  seconds?: number;
  message?: string;
  recoverable?: boolean;
};

const FRAME = 1600; // 100 ms of 16 kHz
const MAX_BUFFERED = 4 * 1024 * 1024; // pause sending while the socket holds this much

class SocketFailure extends Error {
  constructor(
    message: string,
    readonly gotText: boolean,
  ) {
    super(message);
  }
}

function socketConfig(kind: "indic" | "whistle") {
  const c: Record<string, unknown> = {
    mode: "file",
    provider: nlProviderFor(kind),
    ...(nlModelFor(kind) ? { model: nlModelFor(kind) } : {}),
    streaming: { sampleRate: SAMPLE_RATE },
  };
  const fb = nlFallbackFor(kind);
  if (fb) Object.assign(c, fb);
  const lang = nlLanguage(kind);
  if (lang) c.language = lang;
  const ctx = nlContext();
  if (flags().correct) {
    if (ctx) c.prompt = ctx;
    if (getState().dictionary.length) c.dictionary = nlDictionary();
    c.correction = {
      transliterate: nlTransliterate(),
      ...(getState().flags.clean ? { cleanup: "clean" } : {}),
      ...(ctx ? { context: ctx } : {}),
    };
  } else {
    const p = asrContextPrompt();
    if (p) c.prompt = p;
  }
  return c;
}

// Streams pcm[from..] and fills `rows` (times offset by from/16000). Resolves when the server closes the
// session after `end`; throws SocketFailure otherwise.
function streamFile(
  J: Job,
  kind: "indic" | "whistle",
  pcm: Float32Array,
  fromSample: number,
  onRows: (rows: Map<number, Segment>, sentSec: number) => void,
): Promise<Map<number, Segment>> {
  const offset = fromSample / SAMPLE_RATE;
  const rows = new Map<number, Segment>();
  let lastEnd = offset;
  return new Promise((resolve, reject) => {
    const url = new URL(
      nlBase.replace(/^http/, "ws") + "/v1/audio/transcriptions/stream",
    );
    if (cfg.neurolinkToken) url.searchParams.set("token", cfg.neurolinkToken);
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    let ended = false,
      sent = fromSample,
      fatal: string | null = null;
    const abort = () => ws.close(1000, "cancelled");
    J.abort.signal.addEventListener("abort", abort);
    const report = () => onRows(rows, (sent - fromSample) / SAMPLE_RATE);
    const pump = () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      while (sent < pcm.length && ws.bufferedAmount < MAX_BUFFERED) {
        const n = Math.min(FRAME, pcm.length - sent),
          out = new Int16Array(n);
        for (let i = 0; i < n; i++) {
          const v = Math.max(-1, Math.min(1, pcm[sent + i]));
          out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
        }
        ws.send(out.buffer);
        sent += n;
      }
      if (sent < pcm.length) {
        if (sent % (FRAME * 300) < FRAME) report();
        setTimeout(pump, 15);
      } else if (!ended) {
        ended = true;
        ws.send(JSON.stringify({ type: "end" }));
        report();
      }
    };
    ws.onopen = () => {
      ws.send(JSON.stringify(socketConfig(kind)));
      pump();
    };
    ws.onmessage = (m) => {
      if (typeof m.data !== "string") return;
      let ev: WsEvent;
      try {
        ev = JSON.parse(m.data) as WsEvent;
      } catch {
        return;
      }
      if (ev.type === "error") {
        if (!ev.recoverable) fatal = ev.message || "stream error";
        return;
      }
      if (ev.utterance == null) return;
      const id = ev.utterance;
      if (ev.type === "final") {
        const start = offset + (ev.segment?.start ?? lastEnd - offset),
          end =
            offset + (ev.segment?.end ?? ev.segment?.start ?? lastEnd - offset);
        lastEnd = Math.max(lastEnd, end);
        // an unsure probe's language is its starting guess, not what was heard: show only detected ones
        const language =
          ev.languageDetected === false ? undefined : ev.language;
        rows.set(id, {
          start,
          end,
          text: ev.text || "",
          language,
          pending: flags().correct && !!ev.text,
        });
      } else if (ev.type === "corrected") {
        const r = rows.get(id);
        if (!r) return;
        const note = stepLine(ev.steps ?? []);
        rows.set(id, {
          ...r,
          text: ev.text || r.text,
          raw: ev.raw && ev.raw !== ev.text ? ev.raw : undefined,
          note: note || undefined,
          pending: false,
        });
      } else if (ev.type === "silence") {
        // nothing readable: keep a trace of the audio, placed after what came before it
        const secs = ev.seconds ?? 0;
        if (!rows.has(id))
          rows.set(id, {
            start: lastEnd,
            end: lastEnd + secs,
            text: "",
            note: `no speech recognised · ${secs.toFixed(1)} s`,
          });
      } else return;
      report();
    };
    ws.onclose = (ev) => {
      J.abort.signal.removeEventListener("abort", abort);
      if (J.abort.signal.aborted)
        return reject(new SocketFailure("cancelled", rows.size > 0));
      if (fatal) return reject(new SocketFailure(fatal, rows.size > 0));
      if (ended && (ev.code === 1000 || ev.code === 1005)) return resolve(rows);
      reject(
        new SocketFailure(
          `connection closed (${ev.code}${ev.reason ? " " + ev.reason : ""})`,
          rows.size > 0,
        ),
      );
    };
    ws.onerror = () => {
      /* onclose follows with the code */
    };
  });
}

async function runViaSocket(kind: "indic" | "whistle", file: File) {
  const S = col(kind);
  const thisJob = job!;
  S.rows = [];
  S.progress = 3;
  S.phase = "decoding";
  publish();
  const tick = window.setInterval(() => job === thisJob && publish(), 1000);
  const ordered = (m: Map<number, Segment>) =>
    [...m.values()].sort((a, b) => a.start - b.start);
  try {
    const pcm = await pcmOf(file);
    const total = pcm.length / SAMPLE_RATE;
    thisJob.duration = Math.max(thisJob.duration, total);
    let kept: Segment[] = [];
    const show = (
      rows: Map<number, Segment>,
      sentSec: number,
      from: number,
    ) => {
      const got = ordered(rows);
      const heard = got.length ? Math.max(...got.map((r) => r.end)) : from;
      S.rows = [...kept, ...got];
      const upload = Math.min(1, (from + sentSec) / total);
      S.progress = Math.max(
        3,
        Math.round(30 * upload + 70 * Math.min(1, heard / total)),
      );
      S.phase = `${got.length + kept.length} utterances · ${upload < 1 ? `sending audio ${Math.round(upload * 100)}%` : `transcribed to ${fmtClock(heard)} of ${fmtClock(total)}`}`;
      if (job === thisJob) publish();
    };
    // a session from `from` seconds; on a mid-file drop the rest becomes one retryable gap
    const session = async (from: number) => {
      S.phase = "connecting";
      publish();
      try {
        const rows = await streamFile(
          thisJob,
          kind,
          pcm,
          Math.round(from * SAMPLE_RATE),
          (m, sent) => show(m, sent, from),
        );
        kept = [...kept, ...ordered(rows)];
        S.rows = kept;
        return null;
      } catch (e) {
        if (!(e instanceof SocketFailure)) throw e;
        const partial = S.rows.filter((r) => !r.error);
        kept = partial;
        if (thisJob.abort.signal.aborted) throw e;
        const resumeAt = partial.length
          ? Math.max(...partial.map((r) => r.end))
          : from;
        if (!e.gotText && !partial.length) throw e; // nothing came back at all: the caller falls back
        S.rows = [
          ...kept,
          {
            start: resumeAt,
            end: total,
            error: `Not transcribed from here: ${e.message}`,
            part: 0,
          },
        ];
        return resumeAt;
      }
    };
    const summary = () => {
      const n = S.rows.filter((r) => !r.error).length;
      const gap = S.rows.some((r) => r.error);
      const secs = ((S.t1 ?? performance.now()) - thisJob.t0) / 1000;
      S.phase = [
        `${n} utterances`,
        gap ? "stopped early — retry below" : null,
        "one session",
        `${secs.toFixed(0)} s total`,
        `${(total / secs).toFixed(0)}× realtime`,
        "done",
      ]
        .filter(Boolean)
        .join(" · ");
      S.progress = 100;
    };
    const resumeAt = await session(0);
    S.t1 = performance.now();
    S.done = true;
    summary();
    if (resumeAt != null)
      thisJob.retry[kind] = async () => {
        const gap = S.rows.find((r) => r.error);
        if (!gap || thisJob.abort.signal.aborted) return;
        S.done = false;
        S.rows = S.rows.filter((r) => !r.error);
        try {
          await session(gap.start);
        } catch (e) {
          // nothing came back this time either: the gap returns with the new reason, retry stays
          S.rows = [
            ...S.rows.filter((r) => !r.error),
            { ...gap, error: `Not transcribed from here: ${errMsg(e)}` },
          ];
        } finally {
          S.t1 = performance.now();
          S.done = true;
          summary();
          if (job === thisJob) publish();
        }
      };
  } catch (e) {
    if (
      e instanceof SocketFailure &&
      !e.gotText &&
      !thisJob.abort.signal.aborted
    ) {
      // the socket path is unavailable here (old server, proxy without WebSockets): use HTTP parts
      clearInterval(tick);
      S.parts = undefined;
      return runViaServer(kind, file);
    }
    S.t1 = performance.now();
    S.phase = thisJob.abort.signal.aborted
      ? "cancelled"
      : /decod|Unable/i.test(errMsg(e))
        ? "failed: the browser cannot decode this file's audio"
        : "failed: " + errMsg(e);
  } finally {
    clearInterval(tick);
  }
  if (job === thisJob) publish();
}

async function runLocal(file: File) {
  const J = job!;
  if (useServer()) return runViaServer("local", file);
  const L = col("local");
  L.rows = [];
  L.progress = 15;
  L.phase = "uploading";
  publish();
  const tick = ticker(J, L, "uploading", "diarizing + transcribing", 55);
  try {
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("model", cfg.diarizedModel || "qwen3-asr-diarized");
    form.append("response_format", "verbose_json");
    const lang = getState().lang;
    if (lang) form.append("language", lang);
    const n = Number(getState().maxSpeakers);
    if (n >= 1) form.append("max_speakers", String(n));
    const c = asrContextPrompt();
    if (c) form.append("prompt", c);
    const r = await fetch(base + "/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + cfg.apiKey },
      body: form,
      signal: J.abort.signal,
    });
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try {
        msg +=
          " · " +
          (
            ((await r.json()) as { error?: { message?: string } }).error
              ?.message || ""
          ).slice(0, 160);
      } catch {
        /* no JSON body */
      }
      throw new Error(msg);
    }
    const d = (await r.json()) as {
      duration?: number;
      segments?: {
        start: number;
        end: number;
        text: string;
        speaker: string;
        error?: string;
      }[];
    };
    L.t1 = performance.now();
    L.done = true;
    const segs = d.segments || [];
    J.duration = d.duration || J.duration;
    const ids = [...new Set(segs.map((x) => x.speaker))],
      names = Object.fromEntries(ids.map((id, i) => [id, `Speaker ${i + 1}`]));
    const rows: Segment[] = segs.map((x) => ({
      start: x.start,
      end: x.end,
      text: x.text,
      speaker: names[x.speaker],
      error: x.error,
    }));
    await postProcessRows(J, rows, L);
    L.rows = rows;
    L.showSpeakers = ids.length > 1;
    const secs = (L.t1 - J.t0) / 1000;
    L.phase = `${ids.length} speaker${ids.length === 1 ? "" : "s"} · ${secs.toFixed(0)} s · ${(J.duration / secs).toFixed(0)}× realtime · done`;
    L.progress = 100;
  } catch (e) {
    L.t1 = performance.now();
    L.phase = J.abort.signal.aborted
      ? "cancelled"
      : /decod|Unable/i.test(errMsg(e))
        ? "failed: the browser cannot decode this file's audio"
        : "failed: " + errMsg(e);
  } finally {
    clearInterval(tick);
  }
  publish();
}

async function runCloud(file: File) {
  const J = job!;
  const C = col("cloud");
  C.rows = [];
  C.phase = "uploading";
  C.progress = 15;
  publish();
  const tick = ticker(J, C, "uploading", "transcribing", 55);
  try {
    const res = await scribeRequest(file, file.name, {
      diarize: true,
      signal: J.abort.signal,
    });
    C.t1 = performance.now();
    C.done = true;
    const secs = (C.t1 - J.t0) / 1000,
      dur = res.turns.length ? res.turns[res.turns.length - 1].end : J.duration;
    J.cloudTurns = res.turns;
    J.cloudSpeakers = res.speakers;
    const names = Object.fromEntries(
      res.speakers.map((id, i) => [id, `Speaker ${i + 1}`]),
    );
    C.rows = res.turns.map((t) => ({
      ...t,
      speaker: res.speakers.length > 1 ? names[t.speaker] : null,
    }));
    C.showSpeakers = res.speakers.length > 1;
    C.progress = 100;
    C.statsOverride = `${fmtClock(dur)} · ${res.speakers.length} speaker${res.speakers.length === 1 ? "" : "s"} · lang ${res.lang || "?"} · ${secs.toFixed(0)} s · ${(dur / secs).toFixed(0)}× realtime · done`;
  } catch (e) {
    C.t1 = performance.now();
    C.statsOverride = J.abort.signal.aborted
      ? "cancelled"
      : "failed: " + errMsg(e);
  } finally {
    clearInterval(tick);
  }
  publish();
}

async function runWhistle(file: File) {
  const J = job!;
  if (useServer())
    return getState().serverFileMode
      ? runViaSocket("whistle", file)
      : runViaServer("whistle", file);
  const W = col("whistle");
  W.rows = [];
  W.progress = 10;
  W.phase = "decoding";
  publish();
  const tick = window.setInterval(publish, 1000);
  try {
    whistleStart();
    const pcm = await decodeFile(file);
    if (J.abort.signal.aborted) return;
    J.duration = J.duration || pcm.length / SAMPLE_RATE;
    W.phase = whistleReady() ? "transcribing" : "loading model";
    W.progress = 40;
    publish();
    const res = await whistleTranscribe(pcm);
    W.t1 = performance.now();
    W.done = true;
    const rows: Segment[] = [];
    let cur: Segment | null = null;
    for (const w of res.words || []) {
      if (!cur || w.start - cur.end > 0.8 || (cur.text ?? "").length > 220) {
        cur = { start: w.start, end: w.end, text: w.word };
        rows.push(cur);
      } else {
        cur.text += " " + w.word;
        cur.end = w.end;
      }
    }
    if (!rows.length && res.text)
      rows.push({ start: 0, end: J.duration, text: res.text });
    await postProcessRows(J, rows, W);
    W.rows = rows;
    const secs = (W.t1 - J.t0) / 1000,
      engineSecs = res.ms / 1000;
    W.phase = `${res.chunks} passes · engine ${engineSecs.toFixed(1)} s (${(J.duration / engineSecs).toFixed(0)}× realtime) · ${secs.toFixed(0)} s total · done`;
    W.progress = 100;
  } catch (e) {
    W.t1 = performance.now();
    W.phase = "failed: " + errMsg(e);
  } finally {
    clearInterval(tick);
  }
  publish();
}

async function runIndic(file: File) {
  const J = job!;
  if (useServer())
    return getState().serverFileMode
      ? runViaSocket("indic", file)
      : runViaServer("indic", file);
  const I = col("indic");
  I.rows = [];
  I.progress = 10;
  I.phase = "decoding";
  publish();
  const tick = window.setInterval(publish, 1000);
  try {
    const pcm = await decodeFile(file);
    if (J.abort.signal.aborted) return;
    J.duration = J.duration || pcm.length / SAMPLE_RATE;
    I.phase = `transcribing (${indicLang()})`;
    I.progress = 40;
    publish();
    const res = await indicRequest(toWav(pcm), "file.wav", J.abort.signal);
    I.t1 = performance.now();
    I.done = true;
    I.lang = lidLabel(res);
    const rows: Segment[] = (res.segments || []).map((x) => ({
      start: x.start,
      end: x.end,
      text: x.text,
    }));
    await postProcessRows(J, rows, I);
    I.rows = rows;
    const secs = (I.t1 - J.t0) / 1000,
      eng = res.timings?.total_s ?? secs;
    I.phase = `${rows.length} pieces · engine ${eng.toFixed(1)} s (${(J.duration / eng).toFixed(0)}× realtime) · ${secs.toFixed(0)} s total · done`;
    I.progress = 100;
  } catch (e) {
    I.t1 = performance.now();
    I.phase = "failed: " + errMsg(e);
  } finally {
    clearInterval(tick);
  }
  publish();
}

export async function processFile(file: File) {
  if (job) job.abort.abort();
  // only engines that exist here: Scribe needs a key in config.js, the rest must be on the server
  const engines = getState().fengines.filter((e) =>
    e === "scribe" ? !!cfg.elevenlabsKey : !useServer() || serverHas(e),
  );
  if (!engines.length) return false;
  job = {
    id: ++jobSeq,
    file,
    fileName: file.name,
    sizeMb: file.size / 1048576,
    t0: performance.now(),
    abort: new AbortController(),
    duration: 0,
    columns: {},
    retry: {},
  };
  if (engines.includes("local")) job.columns.local = newCol();
  if (engines.includes("scribe")) job.columns.cloud = newCol();
  if (engines.includes("whistle")) job.columns.whistle = newCol();
  if (engines.includes("indic")) job.columns.indic = newCol();
  publish();
  const tasks: Promise<void>[] = [];
  if (job.columns.indic) tasks.push(runIndic(file));
  if (job.columns.whistle) tasks.push(runWhistle(file));
  if (job.columns.cloud) tasks.push(runCloud(file));
  if (job.columns.local) tasks.push(runLocal(file));
  await Promise.all(tasks);
  return true;
}

export function cancelJob() {
  if (!job) return;
  job.abort.abort();
  for (const k of Object.keys(job.columns) as FileColumn[]) {
    const c = col(k);
    if (k === "cloud") c.statsOverride = "cancelled";
    else c.phase = "cancelled";
  }
  publish();
}

const COL_TITLE: Record<FileColumn, string> = {
  local: "Spark · Qwen3-ASR + Nemotron-3 diarization",
  indic: "Indic-Transcribe-Flex",
  whistle: "Whistle",
  cloud: "ElevenLabs Scribe v2",
};

export function transcriptText(which: FileColumn | "all" = "all") {
  if (!job) return "";
  const snap = getState().job!;
  const out = [
    `# ${job.fileName} — transcribed ${new Date().toLocaleString()}`,
  ];
  for (const k of ["local", "indic", "whistle", "cloud"] as FileColumn[]) {
    const c = job.columns[k];
    if (!c || !(which === k || which === "all")) continue;
    out.push("", `## ${COL_TITLE[k]} (${columnStats(snap, k)})`, "");
    out.push(
      ...c.rows
        .filter((r) => !r.divider)
        .map((r) =>
          r.part != null && r.error
            ? `[${fmtClock(r.start)} – ${fmtClock(r.end)}] (not transcribed — ${r.error}; retry it in Voice Bench)`
            : `[${fmtClock(r.start)}] ${r.speaker && c.showSpeakers ? r.speaker + ": " : ""}${r.error ? `(error: ${r.error})` : r.text || ""}`,
        ),
    );
  }
  return out.join("\n");
}

export function downloadTranscript(which: FileColumn | "all") {
  const stem = (job?.fileName || "transcript").replace(/\.[^.]+$/, ""),
    tag =
      (
        {
          local: "spark-qwen3asr-nemotron",
          cloud: "cloud-scribe",
          whistle: "browser-whistle",
          indic: "indic-conformer",
        } as Record<string, string>
      )[which] || "all";
  download(
    `${stem}.${tag}.txt`,
    new Blob([transcriptText(which)], { type: "text/plain" }),
  );
}

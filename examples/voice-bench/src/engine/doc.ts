// The live document: committed words type in, a grey tail follows, and each sentence is replaced in
// place when corrected. The text lives in a contenteditable the user may edit, so it is driven
// imperatively through a handle the TranscriptDoc component registers — React never re-renders it.
import { INDIC_RE } from "./config";
import { setState } from "./store";
import type { BadgeTone, Entry, RawRow, SentenceStage } from "./types";

export type DocHandle = {
  text: HTMLElement;
  tail: HTMLElement;
  body: HTMLElement;
  setEmpty: (empty: boolean) => void;
  // re-creates text/tail/caret inside body after an edit removed them
  rebuild: () => void;
};
let current: DocHandle | null = null;
export function registerDoc(h: DocHandle | null) {
  current = h;
  sentences.clear();
}
// The user may edit the document (select all + delete, paste, …), which can delete the nodes the
// engine writes into. Rebuild them before every write instead of writing into detached nodes.
function live(): DocHandle | null {
  const h = current;
  if (h && !(h.body.contains(h.text) && h.body.contains(h.tail))) {
    h.rebuild();
    sentences.clear();
  }
  return h;
}

const sentences = new Map<number, HTMLSpanElement>();
const typer = { target: "", shown: "", timer: 0 as number | 0 };
let rawSeq = 0;

const scrollEnd = () => {
  if (current) current.body.scrollTop = current.body.scrollHeight;
};

export function docSetInterim(entry: Entry) {
  const next = [entry.committed, entry.tail].filter(Boolean).join(" ");
  let common = 0;
  while (
    common < typer.shown.length &&
    common < next.length &&
    typer.shown[common] === next[common]
  )
    common++;
  if (common < typer.shown.length) typer.shown = next.slice(0, common);
  typer.target = next;
  live()?.setEmpty(false);
  if (!typer.timer) typeTick();
}

function typeTick() {
  typer.timer = 0;
  const handle = live();
  if (!handle) return;
  if (typer.shown.length < typer.target.length) {
    const step = Math.max(
      1,
      Math.ceil((typer.target.length - typer.shown.length) / 12),
    );
    typer.shown = typer.target.slice(0, typer.shown.length + step);
    handle.tail.textContent = typer.shown;
    scrollEnd();
    typer.timer = window.setTimeout(typeTick, 28);
  } else if (typer.shown !== typer.target) {
    typer.shown = typer.target;
    handle.tail.textContent = typer.shown;
  }
}

function sentenceFor(entry: Entry) {
  const handle = live();
  let span = sentences.get(entry.id);
  if (span && handle && !handle.text.contains(span)) span = undefined;
  if (!span && handle) {
    span = document.createElement("span");
    span.className = "sent";
    handle.text.appendChild(span);
    handle.text.appendChild(document.createTextNode(" "));
    sentences.set(entry.id, span);
  }
  return span;
}

// streamed correction: the sentence is rewritten word by word as the model answers
export function docSetText(entry: Entry, text: string) {
  live();
  const span = sentences.get(entry.id);
  if (!span || !text) return;
  span.textContent = text;
  scrollEnd();
}

export function clearTail() {
  typer.target = typer.shown = "";
  const handle = live();
  if (handle) handle.tail.textContent = "";
  clearTimeout(typer.timer);
  typer.timer = 0;
}

export function docSetFinal(entry: Entry, text: string, stage: SentenceStage) {
  const span = sentenceFor(entry);
  if (span) {
    span.textContent = text;
    span.classList.toggle("fixing", stage === "fixing");
    span.classList.toggle("corrected", stage === "corrected");
  }
  clearTail();
  live()?.setEmpty(false);
  scrollEnd();
  docRawRow(entry, `e${entry.id}`, stage);
}

// Step text minus transport and millisecond timings: the strip tells what changed, not how long it took.
export const storySteps = (steps?: string) =>
  (steps ?? "")
    .split(" · ")
    .map((s) => s.replace(/\s*\(?\d+\s?ms\)?/g, "").trim())
    .filter(
      (s) =>
        s &&
        s !== "via NeuroLink" &&
        !/^(transcribe|2nd opinion|decide|rewrite)(,|$)/.test(s),
    )
    .join(" · ");

export function docRawSilent(entry: Entry) {
  docRawRow(entry, `s${++rawSeq}`, "silent");
}

function docRawRow(entry: Entry, key: string, stage: SentenceStage | "silent") {
  const raw = entry.raw || entry.text || (entry.silent ? "(silence)" : "");
  const badges: [BadgeTone, string][] = [];
  if (entry.lid)
    badges.push([
      entry.lid.detected ? "ok" : "warn",
      `lang ${entry.lid.language}${entry.lid.detected ? " (auto)" : " · unsure"}`,
    ]);
  if (stage === "fixing") badges.push(["busy", "correcting…"]);
  else if (stage === "corrected") {
    badges.push([
      "ok",
      entry.raw && entry.raw !== entry.text ? "corrected" : "unchanged",
    ]);
    const punct = /[.,!?;:]/.test(entry.text || ""),
      hadPunct = /[.,!?;:।]/.test(raw);
    badges.push([
      punct ? "ok" : "warn",
      punct
        ? hadPunct
          ? "punctuation kept"
          : "punctuation added"
        : "no punctuation",
    ]);
    if (INDIC_RE.test(raw) && !INDIC_RE.test(entry.text || ""))
      badges.push(["ok", "romanized"]);
    const nRaw = raw.split(/\s+/).filter(Boolean).length,
      nOut = (entry.text || "").split(/\s+/).filter(Boolean).length;
    if (nRaw >= 4 && nOut < nRaw * 0.75)
      badges.push(["warn", `dropped ~${nRaw - nOut} words`]);
    for (const d of entry.decisions || [])
      badges.push([
        d.choice === "term" ? "ok" : "",
        d.choice === "term" ? `${d.heard} → ${d.term}` : `kept “${d.heard}”`,
      ]);
    if (storySteps(entry.correctSteps))
      badges.push(["", storySteps(entry.correctSteps)]);
  } else if (stage === "skipped") badges.push(["", "correction off"]);
  else if (stage === "failed")
    badges.push(["warn", "correction failed · raw text kept"]);
  else if (stage === "silent")
    badges.push([
      "",
      `nothing recognized by any engine · ${(entry.seconds || 0).toFixed(1)} s kept on the card`,
    ]);
  if (storySteps(entry.correctSteps) && stage !== "corrected")
    badges.push(["", storySteps(entry.correctSteps)]);
  const row: RawRow = { key, raw, badges };
  setState((s) => {
    const i = s.rawRows.findIndex((r) => r.key === key);
    if (i < 0) return { rawRows: [...s.rawRows, row] };
    const rawRows = s.rawRows.slice();
    rawRows[i] = row;
    return { rawRows };
  });
}

export function docClear() {
  const handle = live();
  if (handle) {
    handle.text.textContent = "";
    handle.tail.textContent = "";
    handle.setEmpty(true);
  }
  sentences.clear();
  setState({ rawRows: [] });
}

export const docPlainText = () => current?.body.textContent?.trim() ?? "";

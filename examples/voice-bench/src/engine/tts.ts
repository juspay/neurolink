import { wavSeconds } from "./audio";
import { cfg, errMsg, ttsBase, ttsHeaders } from "./config";
import { addEntry, playBlob, updateEntry } from "./feed";
import { lastRecording } from "./live";
import { getState, setState } from "./store";

// The voice list doubles as the TTS health check: Speak is available once it answers.
export async function loadVoices() {
  if (!ttsBase) return setState({ ttsOk: false });
  try {
    const r = await fetch(ttsBase + "/s2pro/voices", { headers: ttsHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = (await r.json()) as { voices?: string[] };
    const voices = d.voices?.length ? d.voices : ["default"];
    setState((s) => ({
      ttsOk: true,
      voices,
      voice: voices.includes(s.voice) ? s.voice : voices[0],
    }));
  } catch {
    setState({ ttsOk: false });
  }
}

// A clone reference is a finished recording of 3–30 s with its transcript: the newest one that fits.
export const CLONE_MIN_S = 3,
  CLONE_MAX_S = 30;
export const cloneReference = (entries = getState().entries) =>
  [...entries]
    .reverse()
    .find(
      (e) =>
        e.kind !== "tts" &&
        e.audio &&
        e.text &&
        !e.error &&
        (e.seconds ?? 0) >= CLONE_MIN_S &&
        (e.seconds ?? 0) <= CLONE_MAX_S,
    );

export async function speak(text: string, voice: string) {
  setState({ speaking: true });
  const entry = addEntry({ kind: "tts", voice, pending: true, text });
  const t0 = performance.now();
  try {
    const r = await fetch(ttsBase + "/v1/audio/speech", {
      method: "POST",
      headers: { ...ttsHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.ttsModel || "s2-pro",
        input: text,
        voice,
        response_format: "wav",
      }),
    });
    const latency = Math.round(performance.now() - t0);
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try {
        msg +=
          " · " +
          (
            ((await r.json()) as { error?: { message?: string } }).error
              ?.message || ""
          ).slice(0, 200);
      } catch {
        /* no JSON body */
      }
      updateEntry(entry, { error: msg, latency });
      return;
    }
    const buf = await r.arrayBuffer();
    const audio = new Blob([buf], { type: "audio/wav" });
    updateEntry(entry, { audio, seconds: wavSeconds(buf), latency, text });
    playBlob(audio);
  } catch (e) {
    updateEntry(entry, { error: "Request failed: " + errMsg(e) });
  } finally {
    setState({ speaking: false });
  }
}

// Returns an error to show next to the name field, or null when the clone request was made.
export async function cloneVoice(rawName: string): Promise<string | null> {
  const last = cloneReference();
  const name = rawName.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
  if (!last || !last.audio) {
    const newest = lastRecording();
    addEntry({
      kind: "tts",
      error: newest
        ? `No recording of ${CLONE_MIN_S}–${CLONE_MAX_S} s yet (the last one is ${(newest.seconds ?? 0).toFixed(1)} s). Hold to talk for about 10 s, then clone.`
        : "Record something first: hold to talk for about 10 s with a clear sentence, then clone.",
    });
    return null;
  }
  if (!name) return "name required";
  const secs = last.seconds ?? 0;
  const form = new FormData();
  form.append("name", name);
  form.append("consent", "true");
  form.append("audio_sample", last.audio, "reference.wav");
  form.append("ref_text", last.text ?? "");
  const entry = addEntry({
    kind: "tts",
    voice: name,
    pending: true,
    text: `cloning voice "${name}" from your ${secs.toFixed(1)} s recording…`,
  });
  try {
    const r = await fetch(ttsBase + "/s2pro/voices", {
      method: "POST",
      headers: ttsHeaders(),
      body: form,
    });
    if (!r.ok) {
      updateEntry(entry, { error: `clone failed · HTTP ${r.status}` });
      return null;
    }
    await loadVoices();
    if (getState().voices.includes(name)) {
      setState({ voice: name });
      updateEntry(entry, {
        text: `voice "${name}" ready — selected. Press Speak to hear yourself.`,
      });
    } else
      updateEntry(entry, {
        text: `voice "${name}" was created but is not listed yet; reload the voices or try again shortly.`,
      });
  } catch (e) {
    updateEntry(entry, { error: "clone failed: " + errMsg(e) });
  }
  return null;
}

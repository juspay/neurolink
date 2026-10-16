"""OpenAI-compatible wrapper around ai4bharat/indic-conformer-600m-multilingual, on this Mac.

POST /v1/audio/transcriptions   multipart: file, language (22 Indic codes, or "auto" — the default), decoder? (ctc | rnnt,
                                default rnnt), response_format?, candidates? (comma list for auto)
GET  /v1/models, /health

The model is a hybrid CTC+RNNT Conformer: one shared encoder, per-language decoders, native-script
output only. It takes 16 kHz mono and was trained on short clips, so long audio is cut at silences
into <=25 s pieces and the texts are joined; timestamps are per piece.

Language ID: the model has none, so "auto" is done here from the shared CTC head. The encoder runs
once; for each candidate language the CTC log-probs are re-normalized under that language's vocab
mask and scored by the mean greedy confidence on non-blank frames. The right language wins by a
wide margin (Tamil -0.09 vs Malayalam -0.25 on a 2 s clip); English or far-field audio scores low
for every language (< -0.35), which is reported as `language_detected: false` so a caller can
prefer another engine. Frames of digital silence do not vote (a zero pad would lift every score). Hindi and Urdu are the same spoken language, so Urdu is only a candidate
when asked for.
"""

import io
import logging
import os
import time

import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8007"))
MODEL_ID = os.environ.get("MODEL_ID", "ai4bharat/indic-conformer-600m-multilingual")
SERVED_NAME = os.environ.get("SERVED_NAME", "indic-conformer")
SR = 16000
CHUNK_S = float(os.environ.get("CHUNK_S", "25"))
LANGS = ["as", "bn", "brx", "doi", "gu", "hi", "kn", "kok", "ks", "mai", "ml", "mni", "mr", "ne", "or", "pa", "sa", "sat", "sd", "ta", "te", "ur"]
LID_CANDIDATES = os.environ.get("LID_LANGS", "hi,ta,te,kn,ml,bn,mr,gu,pa,or,as,ne").split(",")
LID_MIN_SCORE = float(os.environ.get("LID_MIN_SCORE", "-0.18"))   # best score below this: not confidently an Indic language (measured: ta/hi -0.03..-0.16, English -0.20..-0.42)
LID_PRIOR_BONUS = float(os.environ.get("LID_PRIOR_BONUS", "0.04"))   # stickiness for the caller's previous language (hi/pa, ta/ml are close)
LID_FALLBACK = os.environ.get("LID_FALLBACK", "hi")
LID_SILENCE_RMS = float(os.environ.get("LID_SILENCE_RMS", "0.0005"))   # frames quieter than this (-66 dBFS: digital silence, not room tone) do not vote in the LID

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("indic-conformer")

app = FastAPI(title="IndicConformer-600M")
# The Voice Bench page on localhost:8765 calls this origin directly.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
state = {"model": None, "load_s": None}


@app.on_event("startup")
def load():
    from transformers import AutoModel

    t = time.time()
    state["model"] = AutoModel.from_pretrained(MODEL_ID, trust_remote_code=True)
    state["load_s"] = round(time.time() - t, 1)
    log.info("model ready in %ss", state["load_s"])


def decode_to_16k_mono(data: bytes) -> torch.Tensor:
    import soundfile as sf
    import torchaudio

    try:
        wav, sr = sf.read(io.BytesIO(data), dtype="float32", always_2d=True)
        wav = torch.from_numpy(wav.T)
    except Exception as e:
        # libsndfile covers wav/flac/ogg/mp3; the browser sends 16 kHz wav, so this is the rare path
        raise HTTPException(400, f"could not decode audio ({type(e).__name__}); send wav/flac/mp3") from e
    wav = wav.mean(dim=0, keepdim=True)
    if sr != SR:
        wav = torchaudio.transforms.Resample(orig_freq=sr, new_freq=SR)(wav)
    return wav


def silence_cuts(wav: torch.Tensor) -> list[tuple[int, int]]:
    x = wav[0].numpy()
    n = len(x)
    cap = int(30 * SR)
    if n <= cap:
        return [(0, n)]
    fr = SR // 50
    frames = n // fr
    energy = np.array([float(np.sum(x[i * fr:(i + 1) * fr] ** 2)) for i in range(frames)])
    target, search = int(CHUNK_S * SR), 3 * SR
    cuts = [0]
    while n - cuts[-1] > cap:
        t = cuts[-1] + target
        lo, hi = (t - search) // fr, min(frames, (t + search) // fr)
        best = lo + int(np.argmin(energy[lo:hi]))
        cuts.append(best * fr)
    cuts.append(n)
    return [(cuts[i], cuts[i + 1]) for i in range(len(cuts) - 1)]


def voiced_frames(wav: torch.Tensor, frames: int) -> np.ndarray:
    """One flag per encoder frame: whether the audio under it carries any energy at all. A caller's
    digital-silence padding (NeuroLink ends every engine chunk in 400 ms of zeros) makes the CTC head
    emit confident nothing-in-particular, which would lift every language's score and turn English
    into a "confident" Indic verdict on a short probe chunk; those frames are left out of the mean."""
    x = wav[0].detach().cpu().numpy() if hasattr(wav, "detach") else np.asarray(wav)[0]
    n = x.shape[0]
    hop = max(1, n // max(frames, 1))
    keep = np.ones(frames, dtype=bool)
    for k in range(frames):
        seg = x[k * hop:(k + 1) * hop]
        keep[k] = seg.size > 0 and float(np.sqrt(np.mean(seg * seg))) >= LID_SILENCE_RMS
    return keep


def strip_digital_silence(wav: torch.Tensor, guard_ms: int = 40) -> torch.Tensor:
    """Drops runs of digital silence at either end of a piece before it is encoded, keeping `guard_ms`
    of them. The encoder attends over the whole piece, so a caller's zero padding (NeuroLink ends every
    engine chunk in 400 ms of zeros) changes how the speech frames themselves are encoded and lifts
    every language's LID score; masking the silent frames afterwards is not enough. Room tone is above
    the floor and is left alone."""
    x = wav[0].abs()
    loud = (x >= LID_SILENCE_RMS).nonzero()
    if loud.numel() == 0:
        return wav
    guard = int(SR * guard_ms / 1000)
    a = max(0, int(loud[0]) - guard)
    b = min(wav.shape[1], int(loud[-1]) + 1 + guard)
    return wav[:, a:b] if (a > 0 or b < wav.shape[1]) else wav


def lid_scores(lp_full: np.ndarray, langs: list[str], keep: np.ndarray | None = None) -> dict[str, float]:
    m = state["model"]
    out = {}
    voiced = torch.from_numpy(keep) if keep is not None and keep.any() else None
    for lang in langs:
        lp = torch.from_numpy(lp_full[:, :, m.language_masks[lang]]).log_softmax(dim=-1)[0]
        mx, idx = lp.max(dim=-1)
        nb = idx != m.config.BLANK_ID
        if voiced is not None and voiced.shape[0] == nb.shape[0] and (nb & voiced).any():
            nb = nb & voiced
        out[lang] = float(mx[nb].mean()) if nb.any() else -99.0
    return out


def transcribe_piece(wav: torch.Tensor, lang: str | None, decoder: str, candidates: list[str], prior: str | None = None,
                     lid_only: bool = False):
    """One encoder pass; language ID from the CTC head when lang is None; then the chosen decoder.
    With lid_only, the decoder is skipped and the text is empty: the caller wanted the verdict, fast."""
    m = state["model"]
    wav = strip_digital_silence(wav)
    enc, lens = m.encode(wav)
    detected = None
    if lang is None:
        lp_full = m.models["ctc_decoder"].run(["logprobs"], {"encoder_output": enc})[0]
        keep = voiced_frames(wav, lp_full.shape[1])
        log.debug("lid: %d samples, %d frames, %d voiced", wav.shape[1], lp_full.shape[1], int(keep.sum()))
        scores = lid_scores(lp_full, candidates, keep)
        # The prior only breaks near-ties between Indian languages (hi/pa, ta/ml). It must not
        # lift the score over LID_MIN_SCORE: English after a Hindi sentence scored -0.20, the
        # bonus made it -0.16, and English was reported as confident Hindi.
        ranked = dict(scores)
        if prior in ranked:
            ranked[prior] += LID_PRIOR_BONUS
        best = max(ranked, key=ranked.get)
        # A prior that wins the ranking with a raw score under the threshold must not turn a
        # confident detection of another language into "not detected": fall back to the raw best.
        if scores[best] < LID_MIN_SCORE:
            best = max(scores, key=scores.get)
        ok = scores[best] >= LID_MIN_SCORE
        detected = {"language": best if ok else LID_FALLBACK, "detected": ok, "score": round(scores[best], 3),
                    "top": [{"language": k, "score": round(v, 3)} for k, v in sorted(scores.items(), key=lambda kv: -kv[1])[:3]]}
        lang = detected["language"]
    if lid_only:
        return "", lang, detected
    text = m._ctc_decode(enc, lens, lang) if decoder == "ctc" else m._rnnt_decode(enc, lens, lang)
    text = text if isinstance(text, str) else (text[0] if isinstance(text, (list, tuple)) and text else str(text))
    return str(text).strip(), lang, detected


@app.post("/v1/audio/transcriptions")
async def transcriptions(
    file: UploadFile = File(...),
    model: str | None = Form(default=None),
    language: str = Form(default="auto"),
    decoder: str = Form(default="rnnt"),
    response_format: str = Form(default="json"),
    prompt: str | None = Form(default=None),  # accepted and ignored: the model has no context input
    candidates: str | None = Form(default=None),  # auto only: comma list of languages to choose between
    prior: str | None = Form(default=None),  # auto only: the language detected last time, kept unless clearly beaten
):
    if state["model"] is None:
        raise HTTPException(503, "model loading", headers={"Retry-After": "20"})
    # `language` forms: a code ("ta"), "auto", or "auto-<code>" / "auto:<code>" = auto with that
    # code as the prior (what NeuroLink sends through a gateway that forwards only `language`).
    lang = language.strip().lower()
    if lang.startswith("auto-") or lang.startswith("auto:"):
        prior = prior or lang[5:].split("-")[0] or None
        lang = "auto"
    else:
        lang = lang.split("-")[0]
    auto = lang in ("", "auto", "und")
    # `<served name>-lid` (or any model ending in "-lid"): language verdict only, from the first
    # piece, no decoding. About the encoder's cost alone.
    lid_only = bool(model) and model.strip().lower().endswith("-lid")
    if not auto and lang not in LANGS:
        raise HTTPException(400, f"language must be one of {LANGS} or auto")
    cands = [c.strip() for c in (candidates or "").split(",") if c.strip()] or LID_CANDIDATES
    bad = [c for c in cands if c not in LANGS]
    if bad:
        raise HTTPException(400, f"unknown candidate language(s) {bad}")
    if decoder not in ("ctc", "rnnt"):
        raise HTTPException(400, "decoder must be ctc or rnnt")
    data = await file.read()
    t0 = time.time()
    wav = decode_to_16k_mono(data)
    total = wav.shape[1] / SR
    segments = []
    lid = None
    with torch.inference_mode():
        piece_prior = prior
        verdicts = []
        for i, (a, b) in enumerate(silence_cuts(wav)):
            # auto: every piece is detected on its own (a recording may switch language), with
            # the previous piece's confident language as the tie-breaking prior
            text, used, det = transcribe_piece(wav[:, a:b], None if auto else lang, decoder, cands, piece_prior,
                                               lid_only=lid_only)
            seg = {"id": i, "start": round(a / SR, 2), "end": round(b / SR, 2), "text": text, "language": used}
            if det is not None:
                verdicts.append((b - a, det))
                seg["language_detected"] = det["detected"]
                seg["language_scores"] = det["top"]
                if det["detected"]:
                    piece_prior = det["language"]
            segments.append(seg)
            if lid_only:
                break  # the verdict comes from the first piece; nothing else is needed
        if verdicts:
            # The file's verdict: the language holding the most confidently detected audio,
            # else the longest piece's (unsure) verdict.
            sure = {}
            for n, d in verdicts:
                if d["detected"]:
                    sure[d["language"]] = sure.get(d["language"], 0) + n
            if sure:
                top = max(sure, key=sure.get)
                lid = next(d for _, d in verdicts if d["detected"] and d["language"] == top)
            else:
                lid = max(verdicts, key=lambda v: v[0])[1]
            lang = lid["language"]
    text = " ".join(s["text"] for s in segments if s["text"])
    # Repeat the detection verdict inside each segment: a gateway that rewrites the
    # top level to OpenAI's schema (LiteLLM) keeps extra keys in segments, so the
    # caller's fallback logic still learns that this file was not an Indic language.
    if lid:
        for s in segments:
            s.setdefault("language_detected", lid["detected"])
            s.setdefault("language_scores", lid["top"])
    secs = time.time() - t0
    log.info("%.0fs audio, %d pieces, lang=%s%s %s, %.1fs (%.0fx realtime)", total, len(segments), lang,
             f" (auto {lid['score']})" if lid else "", decoder, secs, total / max(secs, 1e-6))
    extra = {"language": lang, "language_detected": lid["detected"] if lid else None, "language_scores": lid["top"] if lid else None}
    if response_format == "text":
        return PlainTextResponse(text)  # a bare str would be JSON-encoded (quoted) by FastAPI
    if response_format == "verbose_json":
        return {"task": "transcribe", **extra, "duration": round(total, 2), "text": text, "segments": segments,
                "usage": {"type": "duration", "seconds": round(total, 1)}, "timings": {"total_s": round(secs, 2), "realtime_factor": round(total / max(secs, 1e-6), 1)}}
    return {"text": text, **extra, "usage": {"type": "duration", "seconds": round(total, 1)}}


@app.get("/v1/models")
def models():
    return {"object": "list", "data": [{"id": SERVED_NAME, "object": "model", "owned_by": "local"},
                                       {"id": f"{SERVED_NAME}-lid", "object": "model", "owned_by": "local"}]}


@app.get("/health")
def health():
    return {"ready": state["model"] is not None, "model": MODEL_ID, "load_s": state["load_s"], "languages": LANGS, "auto_candidates": LID_CANDIDATES}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT, log_level="info")

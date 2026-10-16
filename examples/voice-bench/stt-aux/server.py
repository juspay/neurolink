"""Speech engines, language identification and forced alignment for NeuroLink's transcribe pipeline.

POST /v1/audio/transcriptions   OpenAI shape. The `model` field picks what answers:
                                  indic-transcribe-{core,flex}[-{native,mixed,romanized,latin}][@en,hi,…]
                                    Bodhan AI's Indic-Transcribe (22 Indian languages, Indian English,
                                    code-mixed speech); `@…` restricts its language identification.
                                  qwen3-asr: proxied to QWEN_URL, keeping Qwen's own language tag.
                                  mms-lid-256: MMS language verdict only.
                                  anything else: the VoxLingua107 verdict below.
                                Language verdict only (text is empty) for the LID models:
                                multipart file; candidates? (comma list: restrict and renormalize);
                                windows? (1: also sliding-window verdicts in segments[]).
                                verbose_json adds language_detected, language_confidence,
                                language_scores, and repeats them in segments[] (LiteLLM keeps
                                extra keys there).
POST /v1/audio/alignments       multipart file + texts (JSON list of transcripts of the same audio):
                                each text force-aligned to the audio; per word start/end and an
                                acoustic score (mean frame log-probability), so two engines'
                                readings of the same moment can be compared on the same scale.
GET  /health

Language ID: SpeechBrain VoxLingua107 ECAPA (107 languages). Unlike the IndicConformer wrapper's
detector, which can only say "which Indian language, and how sure", this one scores English and
every Indian language on one calibrated scale, so "English with an Indian accent" and "Hindi" are
separate answers.

Alignment: an MMS CTC model over romanized characters (uroman), so text in any script, English or
Devanagari alike, is aligned with one acoustic model and its scores are comparable.
"""

import base64
import io
import json
import logging
import os
import re
import time
import urllib.error
import urllib.request

import numpy as np
import soundfile as sf
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# Local by default: the endpoints are unauthenticated. A remote GPU box sets HOST=0.0.0.0 (see
# stt-aux.service) and keeps the port on a private network.
HOST = os.environ.get("HOST", "127.0.0.1")
# Browser origins allowed to call the sidecar directly; none by default (NeuroLink calls it
# server-side, so no browser needs to).
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
MAX_UPLOAD_BYTES = int(float(os.environ.get("MAX_UPLOAD_MB", "100")) * 1024 * 1024)
PORT = int(os.environ.get("PORT", "8010"))
DEVICE = os.environ.get("DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
LID_MODEL = os.environ.get("LID_MODEL", "speechbrain/lang-id-voxlingua107-ecapa")
ALIGN_MODEL = os.environ.get("ALIGN_MODEL", "MahmoudAshraf/mms-300m-1130-forced-aligner")
LID_MIN_PROB = float(os.environ.get("LID_MIN_PROB", "0.5"))
WINDOW_S = float(os.environ.get("LID_WINDOW_S", "1.5"))
HOP_S = float(os.environ.get("LID_HOP_S", "0.5"))
CACHE = os.environ.get("MODEL_CACHE", os.path.expanduser("~/stt-aux/models"))
SR = 16000

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("stt-aux")
app = FastAPI(title="stt-aux")
if CORS_ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


def read_upload(file: UploadFile) -> bytes:
    """The upload's bytes, refused with 413 past MAX_UPLOAD_BYTES (never read whole into memory first)."""
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"upload larger than {MAX_UPLOAD_BYTES // (1024 * 1024)} MB")
    return data
state: dict = {"lid": None, "labels": None, "align": None}


def decode(data: bytes) -> np.ndarray:
    try:
        wav, sr = sf.read(io.BytesIO(data), dtype="float32", always_2d=True)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, f"unreadable audio: {e}")
    wav = wav.mean(axis=1)
    if sr != SR:
        n = int(round(len(wav) * SR / sr))
        wav = np.interp(np.linspace(0, len(wav) - 1, n), np.arange(len(wav)), wav).astype("float32")
    return wav


def lid_model():
    if state["lid"] is None:
        from speechbrain.inference.classifiers import EncoderClassifier

        t0 = time.time()
        clf = EncoderClassifier.from_hparams(
            source=LID_MODEL, savedir=os.path.join(CACHE, "voxlingua107"), run_opts={"device": DEVICE}
        )
        enc = clf.hparams.label_encoder
        labels = [enc.ind2lab[i].split(":")[0].strip() for i in range(len(enc.ind2lab))]
        state["lid"], state["labels"] = clf, labels
        log.info("LID model loaded in %.1fs on %s (%d languages)", time.time() - t0, DEVICE, len(labels))
    return state["lid"], state["labels"]


def lid_probs(wav: np.ndarray, candidates: list[str] | None) -> list[tuple[str, float]]:
    clf, labels = lid_model()
    with torch.inference_mode():
        out = clf.classify_batch(torch.from_numpy(wav).unsqueeze(0).to(DEVICE))[0][0]
    logp = out.float().cpu().numpy()
    if candidates:
        idx = [i for i, l in enumerate(labels) if l in candidates]
        if not idx:
            raise HTTPException(400, f"no candidate is a VoxLingua107 language: {candidates}")
    else:
        idx = list(range(len(labels)))
    sub = logp[idx]
    p = np.exp(sub - sub.max())
    p /= p.sum()
    order = np.argsort(-p)
    return [(labels[idx[k]], float(p[k])) for k in order]


def verdict(wav: np.ndarray, candidates: list[str] | None) -> dict:
    ranked = lid_probs(wav, candidates)
    best, prob = ranked[0]
    return {
        "language": best,
        "language_detected": prob >= LID_MIN_PROB,
        "language_confidence": round(prob, 4),
        "language_scores": [{"language": l, "score": round(s, 4)} for l, s in ranked[:5]],
    }


# ----------------------------------------------------------------------------- Indic-Transcribe (Bodhan AI)
# Canary-1B-v2 fine-tunes for 22 Indian languages + Indian English + code-mixed
# speech. Model names: indic-transcribe-{core,flex}[-{native,mixed,romanized}].
# `language` pins the language ("auto"/empty: the model's own identification,
# restricted to `candidates` when given; "auto-xx" names a prior that wins a
# close call). Audio over LONG_S seconds goes through the repository's
# pause-cutting long-form helper.

import importlib.util
import sys
import threading

IT_ROOT = os.environ.get("INDIC_TRANSCRIBE_DIR", os.path.join(CACHE))
IT_DEVICE = os.environ.get("INDIC_TRANSCRIBE_DEVICE", DEVICE)
IT_LONG_S = float(os.environ.get("INDIC_TRANSCRIBE_LONG_S", "40"))
IT_PRIOR_MARGIN = float(os.environ.get("INDIC_TRANSCRIBE_PRIOR_MARGIN", "0.15"))
IT_MIN_PROB = float(os.environ.get("INDIC_TRANSCRIBE_MIN_PROB", "0.5"))
# Candidates when a request names none: Indian English and the 22 scheduled
# languages. The dialect classes (bho, bhb, hne, bgc) only ever absorb Hindi
# and Punjabi speech, so they are left out unless a request asks for them.
IT_DEFAULT_CANDIDATES = [c for c in os.environ.get(
    "INDIC_TRANSCRIBE_CANDIDATES",
    "en,hi,bn,mr,gu,pa,or,as,ur,ta,te,kn,ml,ne,sa,kok,mai,doi,ks,sd,brx,mni,sat",
).split(",") if c]
# Hindi is this model's weakest identification class: Hindi and Hinglish come
# back as Punjabi, Urdu or Maithili. Unless confident (or asked for by the
# request's candidates), those are read as Hindi.
IT_HINDI_FAMILY = {"pa", "ur", "mai", "bho", "hne", "bgc", "doi"}
# Urdu and Hindi are one spoken language; Hindi speech is routinely called
# Urdu with high confidence. Urdu is kept only when a request expects it.
IT_ALWAYS_HINDI = {"ur"}
IT_HINDI_FOLD_BELOW = float(os.environ.get("INDIC_TRANSCRIBE_HINDI_FOLD_BELOW", "0.8"))
_it_models: dict = {}
_it_locks: dict = {"core": threading.Lock(), "flex": threading.Lock()}
_it_load_lock = threading.Lock()


def _import_from(path: str, name: str):
    spec = importlib.util.spec_from_file_location(f"{name}_{abs(hash(path))}", os.path.join(path, f"{name}.py"))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


_INDIC_LETTER = re.compile(r"[\u0900-\u0DFF\u0600-\u06FF\u1C50-\u1C7F\uABC0-\uABFF]")
_LATIN_WORD = re.compile(r"[A-Za-z]{2,}")
_REDACTED = re.compile(r"\[?\bREDACTED\b\]?")


def _all_latin(text: str) -> bool:
    """At least two Latin words and no Indic-script letter."""
    return not _INDIC_LETTER.search(text) and len(_LATIN_WORD.findall(text)) >= 2


IT_HINGLISH_SHARE = float(os.environ.get("INDIC_TRANSCRIBE_HINGLISH_SHARE", "0.12"))
# Romanized Hindi function words that are not English words.
_HINGLISH = set("""
hai hain ka ki ke ko se mein mai main kya kyun kyon nahi nahin toh bhi aur tha thi the' kar karo karna
karenge karega raha rahi rahe wala wali yeh ye woh wo ab hum tum aap kal kaise kuch bahut sab liye diya
gaya jayega jaayega hoga chalo batao dekhte dekhenge accha acha achha theek thik haan bhai yaar matlab
abhi phir hua hui kiya lekin agar jab tab yahan wahan kaun kab jaise
""".split())


def _hinglish_share(text: str) -> float:
    words = re.findall(r"[a-z']+", text.lower())
    return sum(w in _HINGLISH for w in words) / len(words) if words else 0.0


def _decode_en(asr, tensor, seconds: float, long_form) -> str:
    if seconds > IT_LONG_S:
        return _collapse_loops(str(long_form.transcribe_long(asr, tensor, "en", mode="mixed")))
    return _collapse_loops(str(asr.transcribe(tensor, "en", mode="mixed", max_new_tokens=_token_budget(seconds))))


def _token_budget(seconds: float) -> int:
    """Tokens a pass may generate: ~10 per second of audio (speech needs 3–6), so a
    decoding loop ends early instead of filling the model's 512-token default."""
    return max(24, min(512, int(10 * seconds) + 24))


def _collapse_loops(text: str) -> str:
    """A phrase of 1–12 words repeated three or more times in a row, kept once: the
    decoder's loop ("and we will be working on the stuff" ×50), never real speech."""
    words = text.split()
    changed = True
    while changed:
        changed = False
        for n in range(12, 0, -1):
            i = 0
            out = []
            while i < len(words):
                k = 1
                while words[i + k * n : i + (k + 1) * n] == words[i : i + n] and i + (k + 1) * n <= len(words):
                    k += 1
                if k >= 3:
                    out.extend(words[i : i + n])
                    i += k * n
                    changed = True
                else:
                    out.append(words[i])
                    i += 1
            words = out
    return " ".join(words)


def it_model(variant: str):
    with _it_load_lock:
        if variant not in _it_models:
            path = os.path.join(IT_ROOT, f"indic-transcribe-{variant}")
            # The repository's modules import each other by bare name.
            inserted = path not in sys.path
            if inserted:
                sys.path.insert(0, path)
            t0 = time.time()
            try:
                mod = _import_from(path, "indic_transcribe")
                long_form = _import_from(path, "long_form")
                asr = mod.IndicTranscribe.from_pretrained(path, device=IT_DEVICE)
            finally:
                if inserted and path in sys.path:
                    sys.path.remove(path)
            _it_models[variant] = (asr, mod, long_form)
            log.info("indic-transcribe-%s loaded in %.1fs on %s", variant, time.time() - t0, IT_DEVICE)
        return _it_models[variant]


def it_transcribe(data: bytes, model: str, language: str | None, candidates: list[str] | None) -> dict:
    # "model@en,hi" carries the expected languages for clients that can only
    # set `model` (NeuroLink's OpenAI-compatible handler sends no candidates).
    model, _, at = model.partition("@")
    if at:
        candidates = [c.strip() for c in at.split(",") if c.strip()] + list(candidates or [])
    rest = model[len("indic-transcribe-"):]
    variant, _, mode = rest.partition("-")
    if variant not in ("core", "flex"):
        raise HTTPException(400, f"unknown Indic-Transcribe variant {variant!r}")
    mode = mode or "native"
    # "latin": Indian-language speech romanized (Hinglish, Tanglish …), English
    # in mixed mode. Romanized mode on English speech loops (a 254-word
    # repetition on the meeting benchmark), so it is never used for English.
    latin = mode == "latin"
    asr, mod, long_form = it_model(variant)
    wav = decode(data)
    seconds = len(wav) / SR
    lang_in = (language or "").strip().lower()
    prior = None
    if lang_in.startswith("auto-") or lang_in.startswith("auto:"):
        prior = lang_in[5:].split("-")[0] or None
        lang_in = "auto"
    pinned = lang_in if lang_in and lang_in != "auto" else None
    if pinned and pinned not in mod.LANGUAGES:
        raise HTTPException(400, f"language must be one of {mod.LANGUAGES} or auto")
    asked = [c for c in (candidates or []) if c in mod.LANGUAGES]
    allowed = asked or [c for c in IT_DEFAULT_CANDIDATES if c in mod.LANGUAGES]
    tensor = torch.from_numpy(wav)
    with _it_locks[variant]:
        top: list = []
        lang = pinned
        if not pinned:
            # Identify on at most the first 30 s (the model's training length).
            top = asr.identify(tensor[: 30 * SR], topk=5, allowed_langs=allowed)
            lang = top[0][0]
            if prior and prior != lang and prior in mod.LANGUAGES:
                p = dict(top).get(prior)
                if p is not None and top[0][1] - p <= IT_PRIOR_MARGIN:
                    lang = prior
            if lang in IT_HINDI_FAMILY and lang not in asked and "hi" in allowed and (
                    lang in IT_ALWAYS_HINDI or float(top[0][1]) < IT_HINDI_FOLD_BELOW):
                lang = "hi"
        out_mode = ("mixed" if lang == "en" else "romanized") if latin else mode
        if pinned:
            out_mode = ("mixed" if lang == "en" else "romanized") if latin else mode

        def decode_as(m: str) -> str:
            if seconds > IT_LONG_S:
                return _collapse_loops(str(long_form.transcribe_long(asr, tensor, lang, mode=m)))
            return _collapse_loops(str(asr.transcribe(tensor, lang, mode=m, max_new_tokens=_token_budget(seconds))))

        relabelled = False
        if not pinned and lang in ("en", "hi") and "en" in allowed and "hi" in allowed:
            # English or Hindi: identification leans to English on Hinglish that
            # opens with an English word, and to Hindi on Indian-accented
            # English. The English decode settles it: Hindi speech decoded as
            # English comes out as romanized Hindi, full of words English speech
            # never yields (hai, ki, ko, kya, nahi …).
            as_en = decode_as("mixed") if lang == "en" else _decode_en(asr, tensor, seconds, long_form)
            if _hinglish_share(as_en) >= IT_HINGLISH_SHARE:
                lang = "hi"
                text = decode_as("romanized" if latin else mode)
            else:
                relabelled = lang != "en"
                lang = "en"
                text = as_en
        elif not pinned and lang != "en" and (latin or out_mode == "mixed"):
            # Mixed mode writes Indian-language words in their own script, so a
            # mixed transcript without a single Indic letter is English speech,
            # whatever identification said (it calls Indian-accented English
            # Telugu, Konkani or Urdu). Latin mode decodes mixed first for the
            # same check and romanizes only Indian-language speech.
            mixed = decode_as("mixed")
            if _all_latin(mixed):
                text, lang, relabelled = mixed, "en", True
            elif latin:
                text = decode_as("romanized")
            else:
                text = mixed
        else:
            text = decode_as(out_mode)
    # identify() returns the model's own distribution over all its languages;
    # with candidates the shares among them are what a confidence means.
    total = sum(float(p) for _, p in top) or 1.0
    top = [(l, float(p) / total) for l, p in top]
    best_prob = 1.0 if relabelled else (top[0][1] if top else None)
    # The checkpoint was trained on redacted transcripts and writes the bare
    # token for unintelligible or background speech; it is never speech.
    text = _REDACTED.sub(" ", str(text)).strip()
    text = re.sub(r"\s{2,}", " ", text)
    return {
        "text": text,
        "language": lang,
        "language_detected": True if pinned else (best_prob is not None and best_prob >= IT_MIN_PROB),
        "language_confidence": best_prob,
        "language_scores": [{"language": l, "score": round(float(p), 4)} for l, p in top],
        "language_pinned": pinned is not None,
        "duration": round(seconds, 2),
    }


# ----------------------------------------------------------------------------- MMS-LID (Meta, 256 languages)

MMS_LID_MODEL = os.environ.get("MMS_LID_MODEL", "facebook/mms-lid-256")
MMS_DEVICE = os.environ.get("MMS_DEVICE", "cpu")
MMS_MIN_PROB = float(os.environ.get("MMS_MIN_PROB", "0.5"))
# MMS labels are ISO 639-3; the pipeline speaks 639-1 where one exists.
ISO3_TO_1 = {
    "eng": "en", "hin": "hi", "ben": "bn", "mar": "mr", "guj": "gu", "pan": "pa", "ory": "or", "ori": "or",
    "asm": "as", "urd": "ur", "tam": "ta", "tel": "te", "kan": "kn", "mal": "ml", "npi": "ne", "nep": "ne",
    "san": "sa", "snd": "sd", "kas": "ks", "spa": "es", "fra": "fr", "deu": "de", "ita": "it", "por": "pt",
    "rus": "ru", "jpn": "ja", "kor": "ko", "cmn": "zh", "zho": "zh", "arb": "ar", "ara": "ar", "pes": "fa",
    "fas": "fa", "tur": "tr", "nld": "nl", "ind": "id", "vie": "vi", "tha": "th", "zlm": "ms", "msa": "ms",
    "sin": "si", "pol": "pl", "ukr": "uk", "ell": "el", "heb": "he", "swe": "sv", "ces": "cs", "ron": "ro",
    "hun": "hu", "fin": "fi", "dan": "da", "tgl": "tl", "fil": "fil", "mai": "mai", "kok": "kok", "doi": "doi",
    "sat": "sat", "mni": "mni", "brx": "brx",
}


_mms_load_lock = threading.Lock()
_align_load_lock = threading.Lock()


def mms_model():
    # Sync endpoints run on a thread pool: two first requests must not both load the model.
    with _mms_load_lock:
        return _mms_model_locked()


def _mms_model_locked():
    if state.get("mms") is None:
        from transformers import AutoFeatureExtractor, Wav2Vec2ForSequenceClassification

        t0 = time.time()
        fe = AutoFeatureExtractor.from_pretrained(MMS_LID_MODEL, cache_dir=CACHE)
        mdl = Wav2Vec2ForSequenceClassification.from_pretrained(MMS_LID_MODEL, cache_dir=CACHE).to(MMS_DEVICE)
        if MMS_DEVICE.startswith("cuda"):
            mdl = mdl.half()
        mdl.eval()
        labels = [mdl.config.id2label[i] for i in range(len(mdl.config.id2label))]
        state["mms"] = (fe, mdl, labels)
        log.info("MMS-LID loaded in %.1fs on %s (%d languages)", time.time() - t0, MMS_DEVICE, len(labels))
    return state["mms"]


def mms_verdict(wav: np.ndarray, candidates: list[str] | None) -> dict:
    fe, mdl, labels = mms_model()
    inputs = fe(wav, sampling_rate=SR, return_tensors="pt")
    x = inputs["input_values"].to(MMS_DEVICE)
    if MMS_DEVICE.startswith("cuda"):
        x = x.half()
    with torch.inference_mode():
        logits = mdl(x).logits[0].float().cpu().numpy()
    codes = [ISO3_TO_1.get(l, l) for l in labels]
    if candidates:
        idx = [i for i, c in enumerate(codes) if c in candidates or labels[i] in candidates]
        if not idx:
            raise HTTPException(400, f"no candidate is an MMS-LID language: {candidates}")
    else:
        idx = list(range(len(codes)))
    sub = logits[idx]
    p = np.exp(sub - sub.max())
    p /= p.sum()
    order = np.argsort(-p)
    best, prob = codes[idx[order[0]]], float(p[order[0]])
    return {
        "language": best,
        "language_detected": prob >= MMS_MIN_PROB,
        "language_confidence": round(prob, 4),
        "language_scores": [{"language": codes[idx[k]], "score": round(float(p[k]), 4)} for k in order[:5]],
    }


# ----------------------------------------------------------------------------- Qwen3-ASR with its language

QWEN_URL = os.environ.get("QWEN_URL", "http://127.0.0.1:8004")
QWEN_MODEL = os.environ.get("QWEN_MODEL", "qwen3-asr")
# Qwen3-ASR names the language it heard ("language English<asr_text>…"); vLLM's
# transcription route drops that, its chat route keeps it.
QWEN_LANGS = {
    "english": "en", "hindi": "hi", "chinese": "zh", "cantonese": "yue", "arabic": "ar", "german": "de",
    "french": "fr", "spanish": "es", "portuguese": "pt", "indonesian": "id", "italian": "it", "korean": "ko",
    "russian": "ru", "thai": "th", "vietnamese": "vi", "japanese": "ja", "turkish": "tr", "malay": "ms",
    "dutch": "nl", "swedish": "sv", "danish": "da", "finnish": "fi", "polish": "pl", "czech": "cs",
    "filipino": "fil", "persian": "fa", "greek": "el", "romanian": "ro", "hungarian": "hu", "macedonian": "mk",
}
QWEN_TAG = re.compile(r"^\s*language\s+([A-Za-z]+)\s*<asr_text>(.*)$", re.S)


# Endpoints are plain functions: FastAPI runs them on its thread pool, so a slow
# upstream call or a model pass never stalls the other requests (an async handler
# doing blocking work serialised a burst of live passes behind one slow call).
UPSTREAM_TIMEOUT_S = float(os.environ.get("UPSTREAM_TIMEOUT_S", "60"))


def http_json(url: str, body: bytes, headers: dict, timeout: float = UPSTREAM_TIMEOUT_S) -> dict:
    req = urllib.request.Request(url, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise HTTPException(e.code, e.read()[:500].decode("utf-8", "replace"))


def qwen_transcribe(data: bytes, language: str | None, prompt: str | None) -> tuple[str, str | None]:
    """(text, ISO language). A pinned language goes through the transcription route; auto through chat."""
    if language:
        boundary = "----sttaux" + str(time.time_ns())
        parts = [("model", QWEN_MODEL), ("language", language), ("response_format", "json")]
        if prompt:
            parts.append(("prompt", prompt))
        body = b"".join(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode() for k, v in parts
        )
        body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.wav\"\r\n"
                 "Content-Type: audio/wav\r\n\r\n").encode() + data + f"\r\n--{boundary}--\r\n".encode()
        out = http_json(f"{QWEN_URL}/v1/audio/transcriptions", body,
                        {"content-type": f"multipart/form-data; boundary={boundary}"})
        return str(out.get("text", "")).strip(), language
    msgs = []
    if prompt:
        msgs.append({"role": "system", "content": prompt})
    msgs.append({"role": "user", "content": [
        {"type": "input_audio", "input_audio": {"data": base64.b64encode(data).decode(), "format": "wav"}}]})
    out = http_json(f"{QWEN_URL}/v1/chat/completions",
                    json.dumps({"model": QWEN_MODEL, "messages": msgs, "max_tokens": 1500, "temperature": 0}).encode(),
                    {"content-type": "application/json"})
    content = out["choices"][0]["message"]["content"] or ""
    m = QWEN_TAG.match(content)
    if not m:
        return content.strip(), None
    name = m.group(1).lower()
    return m.group(2).strip(), (None if name == "none" else QWEN_LANGS.get(name, name))


def as_wav(data: bytes) -> bytes:
    """The upload as 16 kHz mono WAV, which both Qwen routes accept."""
    wav = decode(data)
    buf = io.BytesIO()
    sf.write(buf, wav, SR, format="WAV", subtype="PCM_16")
    return buf.getvalue()


@app.post("/v1/audio/transcriptions")
def transcriptions(
    file: UploadFile = File(...),
    model: str | None = Form(default=None),
    language: str | None = Form(default=None),
    prompt: str | None = Form(default=None),
    candidates: str | None = Form(default=None),
    windows: str | None = Form(default=None),
    response_format: str = Form(default="json"),
):
    data = read_upload(file)
    if model and model.startswith("indic-transcribe-"):
        t0 = time.time()
        cands = [c.strip() for c in (candidates or "").split(",") if c.strip()] or None
        body = it_transcribe(data, model, language, cands)
        log.info("%s %.1fs %s → %s (%s) in %.0f ms", model, body["duration"],
                 "pinned" if body["language_pinned"] else "auto", body["language"],
                 body["language_confidence"], (time.time() - t0) * 1000)
        if response_format == "verbose_json":
            body["task"] = "transcribe"
            body["segments"] = [{"id": 0, "start": 0.0, "end": body["duration"], "text": body["text"],
                                 "language": body["language"], "language_detected": body["language_detected"],
                                 "language_scores": body["language_scores"]}]
        return body
    if model and model.startswith("mms-lid"):
        wav = decode(data)
        if len(wav) < SR * 0.3:
            raise HTTPException(400, "need at least 0.3 s of audio")
        cands = [c.strip() for c in (candidates or "").split(",") if c.strip()] or None
        t0 = time.time()
        v = mms_verdict(wav, cands)
        log.info("mms-lid %.1fs → %s %.2f in %.0f ms", len(wav) / SR, v["language"], v["language_confidence"],
                 (time.time() - t0) * 1000)
        body = {"text": "", **v, "duration": round(len(wav) / SR, 2)}
        if response_format == "verbose_json":
            body["task"] = "transcribe"
            body["segments"] = [{"id": 0, "start": 0.0, "end": round(len(wav) / SR, 2), "text": "",
                                 "language": v["language"], "language_detected": v["language_detected"],
                                 "language_scores": v["language_scores"]}]
        return body
    if model and model.startswith("qwen3-asr"):
        t0 = time.time()
        pinned = language.strip().lower() if language and language.strip().lower() != "auto" else None
        # The caller's prompt (dictionary terms and their meanings) is NOT
        # forwarded: Qwen3-ASR treats a system message as text to reproduce and
        # wrote "NeuroLink (the AI SDK …), kal (Hindi: tomorrow …)" into transcripts.
        text, lang = qwen_transcribe(as_wav(data), pinned, None)
        dur = len(decode(data)) / SR
        log.info("qwen %.1fs %s → %s in %.0f ms", dur, f"pinned {pinned}" if pinned else "auto", lang,
                 (time.time() - t0) * 1000)
        scores = [{"language": lang, "score": 1.0}] if lang else []
        body = {"text": text, "language": lang, "language_detected": lang is not None,
                "language_scores": scores, "language_pinned": pinned is not None, "duration": round(dur, 2)}
        if response_format == "verbose_json":
            body["task"] = "transcribe"
            body["segments"] = [{"id": 0, "start": 0.0, "end": round(dur, 2), "text": text, "language": lang,
                                 "language_detected": lang is not None, "language_scores": scores}]
        return body
    wav = decode(data)
    if len(wav) < SR * 0.3:
        raise HTTPException(400, "need at least 0.3 s of audio")
    cands = [c.strip() for c in (candidates or "").split(",") if c.strip()] or None
    t0 = time.time()
    v = verdict(wav, cands)
    segments = [{"id": 0, "start": 0.0, "end": round(len(wav) / SR, 2), "text": "",
                 "language": v["language"], "language_detected": v["language_detected"],
                 "language_scores": v["language_scores"]}]
    if windows in ("1", "true", "yes"):
        w, h = int(WINDOW_S * SR), int(HOP_S * SR)
        for k, a in enumerate(range(0, max(1, len(wav) - w + 1), h)):
            wv = verdict(wav[a:a + w], cands)
            segments.append({"id": k + 1, "start": round(a / SR, 2), "end": round((a + w) / SR, 2), "text": "",
                             "language": wv["language"], "language_detected": wv["language_detected"],
                             "language_scores": wv["language_scores"][:3]})
    log.info("lid %.1fs → %s %.2f%s in %.0f ms", len(wav) / SR, v["language"], v["language_confidence"],
             f" ({len(segments) - 1} windows)" if len(segments) > 1 else "", (time.time() - t0) * 1000)
    body = {"text": "", **v, "duration": round(len(wav) / SR, 2)}
    if response_format == "verbose_json":
        body["segments"] = segments
        body["task"] = "transcribe"
    return body


# ----------------------------------------------------------------------------- alignment

def align_model():
    with _align_load_lock:
        return _align_model_locked()


def _align_model_locked():
    if state["align"] is None:
        from transformers import AutoModelForCTC, AutoTokenizer

        t0 = time.time()
        tok = AutoTokenizer.from_pretrained(ALIGN_MODEL, cache_dir=CACHE)
        mdl = AutoModelForCTC.from_pretrained(ALIGN_MODEL, cache_dir=CACHE).to(DEVICE)
        if DEVICE == "cuda":
            mdl = mdl.half()
        mdl.eval()
        from uroman import Uroman

        state["align"] = (tok, mdl, Uroman())
        log.info("aligner loaded in %.1fs on %s", time.time() - t0, DEVICE)
    return state["align"]


def emissions(wav: np.ndarray) -> torch.Tensor:
    tok, mdl, _ = align_model()
    x = torch.from_numpy((wav - wav.mean()) / (wav.std() + 1e-7)).unsqueeze(0).to(DEVICE)
    if DEVICE == "cuda":
        x = x.half()
    with torch.inference_mode():
        logits = mdl(x).logits[0].float()
    return logits.log_softmax(dim=-1).cpu()


def romanize(word: str) -> str:
    _, _, ur = align_model()
    r = ur.romanize_string(word).lower()
    return "".join(ch for ch in r if "a" <= ch <= "z" or ch == "'")


def ctc_align(lp: torch.Tensor, tokens: list[int], blank: int) -> list[int] | None:
    """Viterbi CTC alignment: frame index of each token's best path, or None if it cannot fit."""
    T, S = lp.shape[0], len(tokens)
    if S == 0 or T < S:
        return None
    ext = [blank]
    for t in tokens:
        ext += [t, blank]
    L = len(ext)
    neg = -1e9
    dp = np.full((T, L), neg, dtype=np.float32)
    bp = np.zeros((T, L), dtype=np.int8)
    lpn = lp.numpy()
    dp[0, 0] = lpn[0, ext[0]]
    dp[0, 1] = lpn[0, ext[1]]
    # A skip over a blank is allowed only onto a symbol that differs from the one two back; that
    # depends on `ext` alone, so it is computed once rather than per frame.
    ext_arr = np.asarray(ext)
    allow_skip = np.zeros(L, dtype=bool)
    allow_skip[2:] = (ext_arr[2:] != blank) & (ext_arr[2:] != ext_arr[:-2])
    for t in range(1, T):
        prev = dp[t - 1]
        stay = prev
        step = np.concatenate([[neg], prev[:-1]])
        skip = np.concatenate([[neg, neg], prev[:-2]])
        skip = np.where(allow_skip, skip, neg)
        stack = np.stack([stay, step, skip])
        choice = stack.argmax(axis=0)
        dp[t] = stack.max(axis=0) + lpn[t, ext]
        bp[t] = choice
    end = L - 1 if dp[T - 1, L - 1] >= dp[T - 1, L - 2] else L - 2
    path = np.zeros(T, dtype=np.int64)
    s = end
    for t in range(T - 1, -1, -1):
        path[t] = s
        s -= int(bp[t, s])
    frames = [-1] * S
    for t in range(T):
        st = path[t]
        if st % 2 == 1:
            k = st // 2
            if frames[k] < 0:
                frames[k] = t
    return frames if all(f >= 0 for f in frames) else None


def align_text(lp: torch.Tensor, text: str, frame_s: float) -> dict:
    tok, _, _ = align_model()
    vocab = tok.get_vocab()
    blank = vocab.get("<blank>", vocab.get("<pad>", 0))
    words = [w for w in text.split() if w.strip()]
    toks: list[int] = []
    spans: list[tuple[int, int]] = []
    for w in words:
        r = romanize(w)
        ids = [vocab[c] for c in r if c in vocab]
        spans.append((len(toks), len(toks) + len(ids)))
        toks += ids
    frames = ctc_align(lp, toks, blank)
    if frames is None:
        return {"text": text, "score": None, "words": []}
    lpn = lp.numpy()
    out = []
    for w, (a, b) in zip(words, spans):
        if a == b:
            out.append({"word": w, "start": None, "end": None, "score": None})
            continue
        f0, f1 = frames[a], frames[b - 1]
        sc = float(np.mean([lpn[frames[k], toks[k]] for k in range(a, b)]))
        out.append({"word": w, "start": round(f0 * frame_s, 3), "end": round((f1 + 1) * frame_s, 3),
                    "score": round(sc, 3)})
    scored = [x["score"] for x in out if x["score"] is not None]
    return {"text": text, "score": round(float(np.mean(scored)), 3) if scored else None, "words": out}


@app.post("/v1/audio/alignments")
def alignments(file: UploadFile = File(...), texts: str = Form(...)):
    wav = decode(read_upload(file))
    try:
        items = json.loads(texts)
        assert isinstance(items, list) and all(isinstance(t, str) for t in items)
    except Exception:  # noqa: BLE001
        raise HTTPException(400, "texts must be a JSON list of strings")
    t0 = time.time()
    lp = emissions(wav)
    frame_s = (len(wav) / SR) / max(1, lp.shape[0])
    out = [align_text(lp, t, frame_s) for t in items]
    log.info("align %.1fs × %d texts in %.0f ms", len(wav) / SR, len(items), (time.time() - t0) * 1000)
    return {"duration": round(len(wav) / SR, 2), "alignments": out}


@app.get("/health")
def health():
    return {"ready": True, "device": DEVICE, "lid": LID_MODEL, "align": ALIGN_MODEL,
            "lid_loaded": state["lid"] is not None, "align_loaded": state["align"] is not None}


@app.get("/v1/models")
def models():
    return {"object": "list", "data": [{"id": "voxlingua107", "object": "model", "owned_by": "local"}]}


if __name__ == "__main__":
    import uvicorn

    lid_model()
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")

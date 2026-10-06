// Voice Bench — speech-to-text playground for self-hosted engines (Qwen3-ASR on a DGX Spark through
// LiteLLM, AI4Bharat IndicConformer on this machine, Cactus Whistle in the browser) next to a cloud
// reference (ElevenLabs Scribe), with a correction pipeline on top: dictionary → decision model
// (System One API) → LLM rewrite (any OpenAI-compatible chat model). Everything here is plain browser JS.
// With the NeuroLink transport on (Settings), the same features go through a NeuroLink server instead.
(() => {
  const cfg = window.ASR_CONFIG || {};
  const base = (cfg.baseUrl || "").replace(/\/$/, "");
  // NeuroLink server transport (see "NeuroLink transport" below); engine → server STT provider name.
  const nlBase = (cfg.neurolinkBaseUrl || "").replace(/\/$/, "");
  const NL_PROVIDERS = {
    local: "spark",
    indic: "indic",
    whistle: "whistle",
    scribe: "elevenlabs-stt",
    ...(cfg.neurolinkProviders || {}),
  };
  const NL_DIARIZED = cfg.neurolinkDiarizedModel || "qwen3-asr-diarized";
  const SAMPLE_RATE = 16000;
  const MIN_SECONDS = 0.3;
  const $ = (id) => document.getElementById(id);
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem(k);
        return v == null ? d : JSON.parse(v);
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {}
    },
  };

  // ================================================================ views + theme
  const views = ["live", "files", "dictionary", "speak", "settings"];
  function showView(name) {
    for (const v of views)
      $("view" + v[0].toUpperCase() + v.slice(1)).hidden = v !== name;
    document
      .querySelectorAll(".nav button")
      .forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    if (name === "live") empty.hidden = history.some((e) => e.kind !== "tts");
    store.set("voice-bench-view", name);
  }
  document
    .querySelectorAll(".nav button")
    .forEach((b) =>
      b.addEventListener("click", () => showView(b.dataset.view)),
    );
  $("theme").onclick = () => {
    const cur =
      document.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("voice-bench-theme", next);
  };
  {
    const t = store.get("voice-bench-theme", null);
    if (t) document.documentElement.dataset.theme = t;
  }

  // ================================================================ health
  function conn(id, state, detail) {
    const el = $(id);
    el.className = "conn " + state;
    if (detail != null) $(id + "Detail").textContent = detail;
  }
  async function checkBackend() {
    if (!base || !cfg.apiKey) {
      conn("connSpark", "bad", "config.js missing");
      return false;
    }
    try {
      const r = await fetch(base + "/v1/models", {
        headers: { Authorization: "Bearer " + cfg.apiKey },
      });
      if (!r.ok) {
        conn("connSpark", "bad", `HTTP ${r.status}`);
        return false;
      }
      const ids = (await r.json()).data.map((m) => m.id);
      if (!ids.includes(cfg.model)) {
        conn("connSpark", "bad", `no ${cfg.model}`);
        return false;
      }
      conn("connSpark", "ok", new URL(base).host);
      return true;
    } catch {
      conn("connSpark", "bad", "unreachable");
      return false;
    }
  }
  async function checkIndic() {
    try {
      const r = await fetch(
        (cfg.indicBaseUrl || "http://127.0.0.1:8007") + "/health",
      );
      const d = await r.json();
      conn(
        "connIndic",
        d.ready ? "ok" : "bad",
        d.ready ? `${d.languages.length} langs · auto` : "loading",
      );
    } catch {
      conn("connIndic", "bad", "not running");
    }
  }
  async function checkGateway() {
    if (!cfg.decisionBaseUrl || !cfg.decisionKey) {
      conn("connGateway", "bad", "no decision config");
      return;
    }
    try {
      const r = await fetch(cfg.decisionBaseUrl + "/v1/models", {
        headers: { Authorization: "Bearer " + cfg.decisionKey },
      });
      conn(
        "connGateway",
        r.ok ? "ok" : "bad",
        r.ok
          ? `${cfg.correctorModel || "?"} · ${cfg.decisionModel || "?"}`
          : `HTTP ${r.status}`,
      );
    } catch {
      conn("connGateway", "bad", "unreachable");
    }
  }
  conn(
    "connScribe",
    cfg.elevenlabsKey ? "ok" : "bad",
    cfg.elevenlabsKey ? "key set" : "no key",
  );
  $("decisionModel").textContent = cfg.decisionModel || "decision model";

  // ================================================================ tuning (Settings)
  const TUNE_DEFAULTS = {
    silence: 750,
    intervalLocal: 1100,
    intervalIndic: 600,
    intervalWhistle: 700,
    softCut: 16,
    onset: 0.006,
  };
  let tune = { ...TUNE_DEFAULTS, ...store.get("voice-bench-tuning", {}) };
  const tuneInputs = {
    silence: "setSilence",
    intervalLocal: "setIntervalLocal",
    intervalIndic: "setIntervalIndic",
    intervalWhistle: "setIntervalWhistle",
    softCut: "setSoftCut",
    onset: "setOnset",
  };
  function tuneToForm() {
    for (const [k, id] of Object.entries(tuneInputs)) $(id).value = tune[k];
  }
  for (const [k, id] of Object.entries(tuneInputs))
    $(id).addEventListener("change", () => {
      const v = Number($(id).value);
      if (Number.isFinite(v) && v > 0) {
        tune[k] = v;
        store.set("voice-bench-tuning", tune);
      }
    });
  $("resetTuning").onclick = () => {
    tune = { ...TUNE_DEFAULTS };
    store.set("voice-bench-tuning", tune);
    tuneToForm();
  };
  tuneToForm();
  {
    const mask = (k) => (k ? k.slice(0, 5) + "…" + k.slice(-4) : "—");
    const rows = [
      ["LiteLLM (Spark, S2-Pro)", base || "—"],
      ["LiteLLM key", mask(cfg.apiKey)],
      ["ASR model", cfg.model],
      ["Diarized model", cfg.diarizedModel],
      ["TTS model", cfg.ttsModel],
      [
        "IndicConformer",
        (cfg.indicBaseUrl || "http://127.0.0.1:8007") +
          ` · ${cfg.indicDecoder || "rnnt"}`,
      ],
      [
        "Corrector",
        `${cfg.correctorBaseUrl || base} · ${cfg.correctorModel || cfg.romanizeModel || "—"}`,
      ],
      [
        "Decision model",
        `${cfg.decisionBaseUrl || "—"} · ${cfg.decisionModel || "—"}`,
      ],
      ["Gateway key", mask(cfg.decisionKey || cfg.correctorKey)],
      [
        "NeuroLink server",
        nlBase
          ? `${nlBase} · ${Object.entries(NL_PROVIDERS)
              .map(([k, v]) => k + "→" + v)
              .join(", ")} · diarized ${NL_DIARIZED}`
          : "not configured",
      ],
      [
        "NeuroLink token",
        cfg.neurolinkToken ? mask(cfg.neurolinkToken) : "none",
      ],
      [
        "ElevenLabs",
        cfg.elevenlabsKey
          ? `${cfg.scribeModel || "scribe_v2"} · key ${mask(cfg.elevenlabsKey)}`
          : "no key",
      ],
    ];
    $("endpoints").innerHTML = rows
      .map(([k, v]) => `<dt></dt><dd></dd>`)
      .join("");
    const dts = $("endpoints").querySelectorAll("dt"),
      dds = $("endpoints").querySelectorAll("dd");
    rows.forEach(([k, v], i) => {
      dts[i].textContent = k;
      dds[i].textContent = v || "—";
    });
  }

  // ================================================================ dictionary
  // A neutral starter set; replace it with your team's names and jargon (Dictionary tab, or import JSON).
  const SAMPLE_DICT = [
    {
      term: "NeuroLink",
      heard: ["nurellink", "neural link", "न्यूरोलिंक"],
      meaning: "the AI SDK this demo ships with",
    },
    {
      term: "kal",
      heard: ["call", "khaal", "खाल"],
      meaning: "Hindi: tomorrow / yesterday",
    },
    {
      term: "deployment",
      heard: ["deployement", "डिप्लॉयमेंट"],
      meaning: "releasing software to production",
    },
    {
      term: "DGX Spark",
      heard: ["DGX park", "DJ's park"],
      meaning: "NVIDIA desktop GPU box",
    },
    { term: "Jira", heard: ["jeera"], meaning: "the ticketing tool" },
    {
      term: "self-hosted",
      heard: ["self posted"],
      meaning: "running on our own servers",
    },
  ];
  // Older builds kept the glossary as text lines; read those once so nothing typed there is lost.
  function migrateLegacyDictionary() {
    let text = null;
    try {
      text = localStorage.getItem("asr-bench-glossary");
    } catch {}
    if (!text) return null;
    const out = [];
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      if (line.includes("|")) {
        const [term, heard = "", meaning = ""] = line
          .split("|")
          .map((x) => x.trim());
        if (term)
          out.push({
            term,
            heard: heard
              .replace(/^(also )?heard as:?/i, "")
              .split(/[,;]/)
              .map((x) => x.trim())
              .filter(Boolean),
            meaning,
          });
      } else if (line.includes("->")) {
        const [wrong, right] = line.split("->").map((x) => x.trim());
        if (right) out.push({ term: right, heard: [wrong], meaning: "" });
      } else out.push({ term: line, heard: [], meaning: "" });
    }
    return out;
  }
  let dictionary =
    store.get("voice-bench-dictionary", null) ||
    migrateLegacyDictionary() ||
    SAMPLE_DICT.map((e) => ({ ...e, heard: [...e.heard] }));
  function saveDictionary() {
    store.set("voice-bench-dictionary", dictionary);
    renderDictionary();
  }
  function dictionaryEntries() {
    return dictionary;
  }
  function dictionaryBlock() {
    if (!dictionary.length) return "";
    return (
      "Dictionary (term | also heard as | meaning):\n" +
      dictionary
        .map(
          (e) =>
            `${e.term} | ${e.heard.join(", ") || "-"} | ${e.meaning || "-"}`,
        )
        .join("\n")
    );
  }
  try {
    $("meetingContext").value = localStorage.getItem("asr-bench-context") ?? "";
  } catch {}
  $("meetingContext").addEventListener("input", (e) => {
    try {
      localStorage.setItem("asr-bench-context", e.target.value);
    } catch {}
  });

  // chip input for "also heard as"
  const chips = $("dictChips"),
    heardInput = $("dictHeardInput");
  let editIndex = -1;
  function chipValues() {
    return [...chips.querySelectorAll(".chip")].map((c) => c.dataset.v);
  }
  function addChip(v) {
    v = v.trim().replace(/,$/, "").trim();
    if (!v || chipValues().includes(v)) return;
    const c = document.createElement("span");
    c.className = "chip";
    c.dataset.v = v;
    c.append(document.createTextNode(v));
    const x = document.createElement("button");
    x.type = "button";
    x.textContent = "×";
    x.setAttribute("aria-label", "remove");
    x.onclick = () => c.remove();
    c.append(x);
    chips.insertBefore(c, heardInput);
  }
  chips.addEventListener("click", (e) => {
    if (e.target === chips) heardInput.focus();
  });
  heardInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addChip(heardInput.value);
      heardInput.value = "";
    } else if (e.key === "Backspace" && !heardInput.value) {
      const last = chips.querySelector(".chip:last-of-type");
      if (last) last.remove();
    }
  });
  heardInput.addEventListener("blur", () => {
    if (heardInput.value.trim()) {
      addChip(heardInput.value);
      heardInput.value = "";
    }
  });
  function resetDictForm() {
    editIndex = -1;
    $("dictForm").reset();
    chips.querySelectorAll(".chip").forEach((c) => c.remove());
    $("dictFormTitle").textContent = "Add a term";
    $("dictSave").textContent = "Add";
    $("dictCancel").hidden = true;
    document
      .querySelectorAll(".dict-row.editing")
      .forEach((r) => r.classList.remove("editing"));
  }
  $("dictForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (heardInput.value.trim()) {
      addChip(heardInput.value);
      heardInput.value = "";
    }
    const entry = {
      term: $("dictTerm").value.trim(),
      heard: chipValues(),
      meaning: $("dictMeaning").value.trim(),
    };
    if (!entry.term) return;
    if (editIndex >= 0) dictionary[editIndex] = entry;
    else dictionary.unshift(entry);
    saveDictionary();
    resetDictForm();
    $("dictTerm").focus();
  });
  $("dictCancel").onclick = resetDictForm;
  function editDict(i) {
    resetDictForm();
    editIndex = i;
    const e = dictionary[i];
    $("dictTerm").value = e.term;
    $("dictMeaning").value = e.meaning || "";
    e.heard.forEach(addChip);
    $("dictFormTitle").textContent = `Edit “${e.term}”`;
    $("dictSave").textContent = "Save";
    $("dictCancel").hidden = false;
    $("dictList").children[i]?.classList.add("editing");
    $("dictTerm").focus();
    $("dictForm").scrollIntoView({ block: "nearest" });
  }
  function renderDictionary() {
    const q = ($("dictSearch").value || "").trim().toLowerCase();
    const list = $("dictList");
    list.innerHTML = "";
    const shown = dictionary
      .map((e, i) => [e, i])
      .filter(
        ([e]) =>
          !q ||
          [e.term, e.meaning, ...e.heard].join(" ").toLowerCase().includes(q),
      );
    for (const [e, i] of shown) {
      const row = document.createElement("div");
      row.className = "dict-row";
      row.innerHTML = `<div class="term"></div><div class="heard"></div><div class="meaning"></div><div class="actions"><button class="btn sm quiet" type="button" data-edit>Edit</button><button class="btn sm quiet danger" type="button" data-del>Delete</button></div>`;
      row.querySelector(".term").textContent = e.term;
      row.querySelector(".meaning").textContent = e.meaning || "";
      const heardEl = row.querySelector(".heard");
      if (e.heard.length)
        e.heard.forEach((v) => {
          const c = document.createElement("span");
          c.className = "chip";
          c.textContent = v;
          heardEl.appendChild(c);
        });
      else {
        const none = document.createElement("span");
        none.className = "muted";
        none.style.fontSize = "13px";
        none.textContent = "—";
        heardEl.replaceChildren(none);
      }
      row.querySelector("[data-edit]").onclick = () => editDict(i);
      row.querySelector("[data-del]").onclick = () => {
        dictionary.splice(i, 1);
        saveDictionary();
        if (editIndex === i) resetDictForm();
      };
      list.appendChild(row);
    }
    if (!shown.length)
      list.innerHTML = `<div class="dict-empty">${q ? "No terms match." : "No terms yet. Add the names and jargon the engines keep getting wrong."}</div>`;
    $("dictCount").textContent = dictionary.length;
    $("dictTotal").textContent = dictionary.length;
  }
  $("dictSearch").addEventListener("input", renderDictionary);
  $("dictExport").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(dictionary, null, 2)], {
        type: "application/json",
      }),
    );
    a.download = "voice-bench-dictionary.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $("dictImport").onclick = () => $("dictImportFile").click();
  $("dictImportFile").onchange = async () => {
    const f = $("dictImportFile").files[0];
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (Array.isArray(d)) {
        dictionary = d
          .filter((e) => e && e.term)
          .map((e) => ({
            term: String(e.term),
            heard: Array.isArray(e.heard) ? e.heard.map(String) : [],
            meaning: String(e.meaning || ""),
          }));
        saveDictionary();
      }
    } catch {}
    $("dictImportFile").value = "";
  };
  $("dictReset").onclick = () => {
    dictionary = SAMPLE_DICT.map((e) => ({ ...e, heard: [...e.heard] }));
    saveDictionary();
  };
  renderDictionary();

  // The dictionary doubles as the ASR's context prompt (Qwen3-ASR's contextual biasing).
  function asrContextPrompt() {
    const terms = dictionary.map((e) =>
      e.meaning ? `${e.term} (${e.meaning})` : e.term,
    );
    const ctx = ($("meetingContext").value || "").trim();
    return [
      ctx,
      terms.length ? "Names and terms used: " + terms.join(", ") + "." : "",
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 1800);
  }

  // ================================================================ corrector
  // dictionary candidates → one System One call (per candidate: term or literal?) → LLM rewrite.
  const CORRECT_SYSTEM = () =>
    "You are a post-editor for speech transcripts of speakers who mix an Indian language (Hindi, Tamil, Telugu, " +
    "Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, …) with English, or speak only one of them.\n" +
    "Input: an ASR transcript, possibly in an Indic script (that ASR writes English words phonetically in the " +
    "Indic script), and possibly a second transcript of the same audio from an English-oriented ASR.\n" +
    "Output the sentence as the speaker said it, written the way Indians type on phones:\n" +
    "- Indian-language words stay in that language but are ALWAYS written in Latin letters the way people type on " +
    "phones (Hinglish / Tanglish / Kanglish style): मेरा नाम → mera naam; भेज देना → bhej dena; நாளைக்கு மீட்டிங் " +
    "இருக்கு → naalaikku meeting irukku; ಇವತ್ತು → ivattu. No Devanagari, Tamil, Telugu, Kannada or other Indic " +
    "script may remain in the output. NEVER translate them into English.\n" +
    "- English words get their correct English spelling (before, please, client, deployment, meeting, PM). Never " +
    "leave an English word phonetic.\n" +
    "- Use the dictionary: a word that sounds like an entry's 'also heard as' is written as the term exactly.\n" +
    "- Add natural punctuation and capitalization; numbers as digits; keep fillers.\n" +
    "- Keep every word; never summarize, add, reorder or translate. With two transcripts, take Indian-language " +
    "words from the Indic-script one and English words from the English one.\n" +
    "Output only the corrected sentence, nothing else.\n\n" +
    dictionaryBlock();
  const INDIC_RE = /[ऀ-෿]/;
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function dictionaryCandidates(text) {
    const out = [];
    for (const e of dictionary)
      for (const h of e.heard) {
        if (!h || (INDIC_RE.test(h) && !INDIC_RE.test(text))) continue;
        const re = new RegExp(
          `(^|[^\\p{L}])${escapeRe(h)}(?=$|[^\\p{L}])`,
          "iu",
        );
        if (
          re.test(text) &&
          !new RegExp(
            `(^|[^\\p{L}])${escapeRe(e.term)}(?=$|[^\\p{L}])`,
            "iu",
          ).test(text)
        )
          out.push({ entry: e, heard: h, re });
      }
    return out;
  }
  // Returns one record per candidate: { heard, term, choice, pTerm, confidence } — shown in the Decisions panel.
  async function decideCandidates(text, cands) {
    const asIs = (why) =>
      cands.map((c) => ({
        heard: c.heard,
        term: c.entry.term,
        choice: "term",
        pTerm: null,
        confidence: null,
        note: why,
      }));
    if (!cands.length) return [];
    if (!cfg.decisionBaseUrl || !cfg.decisionModel)
      return asIs("no decision model configured");
    const questions = {};
    cands.forEach((c, i) => {
      questions["c" + i] = {
        type: "choice",
        instructions: `The speech recognizer wrote "${c.heard}". Which did the speaker mean?`,
        criteria: {
          term: `the term "${c.entry.term}"${c.entry.meaning ? ": " + c.entry.meaning : ""}`,
          literal: `"${c.heard}" as an ordinary word or other name, meant literally`,
        },
      };
    });
    try {
      const r = await fetch(cfg.decisionBaseUrl + "/v1/systemone", {
        method: "POST",
        signal: AbortSignal.timeout(DECIDE_TIMEOUT_MS),
        headers: {
          Authorization: "Bearer " + cfg.decisionKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: cfg.decisionModel,
          state: {
            transcript: text,
            context:
              $("meetingContext").value ||
              "Speech transcript; names and product terms are often misheard",
          },
          questions,
        }),
      });
      if (!r.ok) throw new Error(`systemone ${r.status}`);
      const d = await r.json();
      return cands.map((c, i) => {
        const a = d.answers?.["c" + i] || {};
        return {
          heard: c.heard,
          term: c.entry.term,
          choice: a.choice || "term",
          pTerm: a.probabilities?.term ?? null,
          confidence: a.confidence ?? null,
        };
      });
    } catch (e) {
      console.warn(
        "decision guard unavailable, applying dictionary as-is:",
        e.message,
      );
      return asIs(
        e.name === "TimeoutError"
          ? "decision model timed out"
          : "decision model unavailable",
      );
    }
  }
  let warmedAt = 0;
  function warmCorrector() {
    // a hosted corrector may cold-start (~10 s seen), then answer in <1 s
    if (!$("correct").checked || Date.now() - warmedAt < 120000) return;
    warmedAt = Date.now();
    fetch((cfg.correctorBaseUrl || base) + "/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + (cfg.correctorKey || cfg.apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.correctorModel || cfg.romanizeModel,
        max_tokens: 1,
        messages: [{ role: "user", content: "ok" }],
      }),
    }).catch(() => {});
  }
  const REWRITE_TIMEOUT_MS = 12000,
    DECIDE_TIMEOUT_MS = 4000;
  // Streams the rewrite so the sentence can be replaced as tokens arrive; a timeout or error keeps the
  // dictionary-applied text — the corrector may be slow or down, it may never cost words.
  async function rewriteStream(system, user, { signal, onPartial, maxTokens }) {
    const base_ = cfg.correctorBaseUrl || base,
      key_ = cfg.correctorKey || cfg.apiKey,
      model_ =
        cfg.correctorModel || cfg.romanizeModel || "deepseek-v4-flash-fast";
    const r = await fetch(base_ + "/v1/chat/completions", {
      method: "POST",
      signal,
      headers: {
        Authorization: "Bearer " + key_,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model_,
        temperature: 0,
        max_tokens: maxTokens,
        stream: true,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) throw new Error(`corrector HTTP ${r.status}`);
    const reader = r.body.getReader(),
      dec = new TextDecoder();
    let buf = "",
      content = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content;
          if (delta) {
            content += delta;
            onPartial?.(content);
          }
        } catch {}
      }
    }
    return { content, model: model_ };
  }
  async function correctText(text, altText, opts = {}) {
    const { signal, onPartial } = opts;
    const t0 = performance.now();
    const steps = [];
    let out = text;
    const cands = dictionaryCandidates(out);
    const decisions = await decideCandidates(out, cands);
    if (cands.length) {
      cands.forEach((c, i) => {
        if (decisions[i].choice === "term")
          out = out.replace(c.re, (m, pre) => pre + c.entry.term);
      });
      steps.push(
        `dictionary ${decisions.filter((d) => d.choice === "term").length}/${cands.length} (${Math.round(performance.now() - t0)} ms)`,
      );
    }
    const t1 = performance.now();
    const user = altText
      ? `Transcript 1 (Indic-script ASR): ${out}\nTranscript 2 (English ASR): ${altText}`
      : `Transcript: ${out}`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), REWRITE_TIMEOUT_MS);
    signal?.addEventListener("abort", () => ctl.abort());
    try {
      const maxTokens = Math.round(
        Math.min(1200, 60 + 1.5 * (out.length + (altText || "").length)),
      );
      const { content, model } = await rewriteStream(CORRECT_SYSTEM(), user, {
        signal: ctl.signal,
        onPartial,
        maxTokens,
      });
      const fixed = content.trim().split("\n").filter(Boolean).pop() || out;
      steps.push(`${model} ${Math.round(performance.now() - t1)} ms`);
      return { text: fixed, steps, decisions };
    } catch (e) {
      steps.push(
        ctl.signal.aborted && !signal?.aborted
          ? `rewrite timed out after ${REWRITE_TIMEOUT_MS / 1000} s · kept text`
          : `rewrite failed (${e.message}) · kept text`,
      );
      return { text: out, steps, decisions };
    } finally {
      clearTimeout(timer);
    }
  }

  // batched glossary pass for long file transcripts (one request per 25 lines)
  function cleanupSystemPrompt() {
    return (
      "You post-edit automatic speech-recognition (ASR) output from an engineering team's meeting. ASR systems mangle names and jargon into similar-sounding ordinary words; your job is to put the intended words back.\n\n" +
      "Rules:\n1. The dictionary is the ground truth. Whenever a word or phrase in a line SOUNDS like a dictionary term or one of its 'also heard as' forms, write the term exactly.\n2. Also fix near-homophones that make no sense in context when the intended word is obvious.\n3. Keep everything else exactly: meaning, word order, fillers, repetitions, Hindi/Devanagari text, sentence count. Never summarize, never translate, never add commentary.\n4. A line that needs no change is returned verbatim.\n\n" +
      dictionaryBlock() +
      "\n\nInput: a numbered list of lines. Output: the same numbered lines, one per input line, nothing else."
    );
  }
  async function cleanupLines(lines, signal) {
    const out = lines.slice();
    const BATCH = 25;
    for (let i = 0; i < lines.length; i += BATCH) {
      const batch = lines.slice(i, i + BATCH);
      const numbered = batch.map((l, k) => `${k + 1}. ${l}`).join("\n");
      const r = await fetch(
        (cfg.correctorBaseUrl || base) + "/v1/chat/completions",
        {
          method: "POST",
          signal,
          headers: {
            Authorization: "Bearer " + (cfg.correctorKey || cfg.apiKey),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model:
              cfg.correctorModel ||
              cfg.romanizeModel ||
              "deepseek-v4-flash-fast",
            temperature: 0,
            max_tokens: 4000,
            messages: [
              { role: "system", content: cleanupSystemPrompt() },
              { role: "user", content: numbered },
            ],
          }),
        },
      );
      if (!r.ok) continue;
      const text = (await r.json()).choices?.[0]?.message?.content || "";
      for (const m of text.matchAll(/^\s*(\d+)\.\s?(.*)$/gm)) {
        const k = Number(m[1]) - 1;
        if (k >= 0 && k < batch.length && m[2].trim()) out[i + k] = m[2].trim();
      }
    }
    return out;
  }

  // ================================================================ decisions panel
  const decisionsEl = $("decisions");
  function fmtTime(d) {
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  // DOM builder: `h("span.cls", child, …)` — children are nodes or text, and
  // text is always set through textContent, never parsed as HTML.
  function h(spec, ...children) {
    const [tag, ...classes] = spec.split(".");
    const el = document.createElement(tag || "span");
    if (classes.length) el.className = classes.join(" ");
    for (const c of children) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  // The live status line: a bold engine label followed by plain text.
  function setDocStatus(engine, rest) {
    const tail = (rest || "").replace(/^[\s·]+/, "").trim();
    docStatus.replaceChildren(h("b", engine), tail ? " · " + tail : "");
  }
  function renderDecision(entry) {
    $("decisionsEmpty").hidden = true;
    const card = entry.decisionEl || document.createElement("div");
    card.className = "decision";
    const head = h(
      "div.d-head",
      h("span", fmtTime(entry.at)),
      h(
        "span.tag." + engineClass(entry.engine),
        ENGINE_LABEL[entry.engine] || entry.engine || "",
      ),
      h("span.t", entry.decisionMs != null ? entry.decisionMs + " ms" : ""),
    );
    const rows = [];
    if (entry.lid) {
      const unsure = entry.lid.detected === false;
      rows.push(
        h(
          "div.d-row",
          h(
            "span.q",
            "language ",
            h("b", entry.lid.language),
            unsure ? h("span.muted", " · unsure, Spark text led") : null,
          ),
          h(
            "span.r." + (unsure ? "literal" : "term"),
            (entry.lid.scores || [])
              .slice(0, 3)
              .map((x) => `${x.language} ${x.score}`)
              .join(" · "),
          ),
        ),
      );
    }
    for (const d of entry.decisions || []) {
      const isTerm = d.choice === "term";
      const p =
        d.pTerm == null
          ? null
          : Math.round((isTerm ? d.pTerm : 1 - d.pTerm) * 100);
      const row = h(
        "div.d-row",
        h(
          "span.q",
          `“${d.heard}”`,
          h("span.arrow", "→"),
          isTerm ? h("b", d.term) : `kept as “${d.heard}”`,
        ),
        h(
          "span.r." + (isTerm ? "term" : "literal"),
          (isTerm ? "term" : "literal") +
            (p != null ? ` ${p}%` : "") +
            (d.note ? ` · ${d.note}` : ""),
        ),
      );
      if (p != null) {
        const bar = h("i" + (isTerm ? "" : ".literal"));
        bar.style.width = `${p}%`;
        row.append(h("span.meter", bar));
      }
      rows.push(row);
    }
    if (!rows.length)
      rows.push(h("div.none", "no dictionary candidates in this sentence"));
    card.replaceChildren(head, ...rows);
    if (!entry.decisionEl) {
      decisionsEl.prepend(card);
      entry.decisionEl = card;
      while (decisionsEl.children.length > 40) decisionsEl.lastChild.remove();
    }
  }
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  $("panelToggle").onclick = () => {
    const g = $("liveGrid");
    const closed = g.classList.toggle("panel-closed");
    g.classList.toggle("panel-open-mobile", !closed);
    $("panelToggle").setAttribute("aria-pressed", String(!closed));
    $("panelToggle").textContent = closed ? "Correction ◂" : "Correction ▸";
  };

  // ================================================================ engines
  const ENGINE_LABEL = {
    local: "qwen3-asr",
    scribe: "scribe v2",
    whistle: "whistle",
    indic: "indic-conformer",
  };
  const engineClass = (e) =>
    e === "scribe"
      ? "cloud"
      : e === "whistle"
        ? "browser"
        : e === "indic"
          ? "indic"
          : "local";
  let engine = store.get("voice-bench-engine", "local");
  function setEngine(e) {
    engine = e;
    store.set("voice-bench-engine", e);
    document
      .querySelectorAll("#engineSeg button")
      .forEach((b) => b.classList.toggle("active", b.dataset.engine === e));
    if (e === "whistle") whistleStart();
    if (e === "scribe" && live.mode === "live") setMode("ptt");
    updateModeNote();
  }
  document
    .querySelectorAll("#engineSeg button")
    .forEach((b) =>
      b.addEventListener("click", () => setEngine(b.dataset.engine)),
    );
  function filesEngines() {
    return [...document.querySelectorAll("[data-fengine]")]
      .filter((c) => c.checked)
      .map((c) => c.dataset.fengine);
  }
  document.querySelectorAll("[data-fengine]").forEach((c) => {
    c.checked = store
      .get("voice-bench-fengines", ["local", "scribe"])
      .includes(c.dataset.fengine);
    c.addEventListener("change", () =>
      store.set("voice-bench-fengines", filesEngines()),
    );
  });
  $("lang").value = store.get("voice-bench-lang", "");
  $("lang").addEventListener("change", () =>
    store.set("voice-bench-lang", $("lang").value),
  );
  for (const id of ["correct", "dual", "romanize", "cleanup"]) {
    const d = id === "cleanup" ? false : true;
    $(id).checked = store.get("voice-bench-" + id, d);
    $(id).addEventListener("change", () =>
      store.set("voice-bench-" + id, $(id).checked),
    );
  }

  const INDIC_LANGS = [
    "as",
    "bn",
    "brx",
    "doi",
    "gu",
    "hi",
    "kn",
    "kok",
    "ks",
    "mai",
    "ml",
    "mni",
    "mr",
    "ne",
    "or",
    "pa",
    "sa",
    "sat",
    "sd",
    "ta",
    "te",
    "ur",
  ];
  function indicLang() {
    const l = $("lang").value;
    return INDIC_LANGS.includes(l) ? l : "auto";
  }
  async function indicRequest(blob, filename, signal) {
    const form = new FormData();
    form.append("file", blob, filename);
    form.append("model", "indic-conformer");
    form.append("language", indicLang());
    if (indicLang() === "auto" && live.lastLid?.detected)
      form.append("prior", live.lastLid.language);
    form.append("decoder", cfg.indicDecoder || "rnnt");
    form.append("response_format", "verbose_json");
    const r = await fetch(
      (cfg.indicBaseUrl || "http://127.0.0.1:8007") +
        "/v1/audio/transcriptions",
      { method: "POST", body: form, signal },
    );
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try {
        msg += " · " + ((await r.json()).detail || "").toString().slice(0, 160);
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  }
  const lidOf = (res) =>
    res.language
      ? {
          language: res.language,
          detected: res.language_detected,
          scores: res.language_scores,
        }
      : null;
  const lidLabel = (res) =>
    res.language +
    (res.language_detected === true
      ? " (auto)"
      : res.language_detected === false
        ? " (unsure)"
        : "");

  const whistle = { worker: null, ready: false, pending: new Map(), seq: 0 };
  function whistleLang() {
    const l = $("lang").value;
    return ["en", "de", "fr", "es", "it", "nl", "pl"].includes(l) ? l : null;
  }
  function whistleStart() {
    if (whistle.worker) return;
    conn("connWhistle", "", "loading…");
    whistle.worker = new Worker("whistle/whistle-worker.js");
    whistle.worker.onmessage = (e) => {
      const m = e.data;
      if ("ready" in m) {
        whistle.ready = !!m.ready;
        conn(
          "connWhistle",
          m.ready ? "ok" : "bad",
          m.ready ? `ready · ${m.loadMs} ms` : "failed",
        );
        return;
      }
      const p = whistle.pending.get(m.id);
      if (!p) return;
      whistle.pending.delete(m.id);
      m.ok ? p.resolve(m) : p.reject(new Error(m.error));
    };
    // The worker script itself failing (needle.js missing or not evaluating)
    // throws before onmessage exists, so no `ready: false` ever arrives: fail
    // every waiting request, drop the worker so the next start retries, and
    // release the mic / live loop that is awaiting a result.
    whistle.worker.onerror = (e) => {
      const message = e.message || "worker failed";
      conn("connWhistle", "bad", message);
      const err = new Error("whistle worker failed: " + message);
      for (const p of whistle.pending.values()) p.reject(err);
      whistle.pending.clear();
      whistle.worker.terminate();
      whistle.worker = null;
      whistle.ready = false;
    };
  }
  function whistleTranscribe(pcm) {
    whistleStart();
    const id = ++whistle.seq;
    const keywords = cfg.whistleKeywords
      ? dictionary.map((e) => e.term).join("\n")
      : "";
    return new Promise((resolve, reject) => {
      whistle.pending.set(id, { resolve, reject });
      whistle.worker.postMessage(
        { id, pcm, language: whistleLang(), keywords, timestamps: true },
        [pcm.buffer],
      );
    });
  }

  async function scribeRequest(
    blob,
    filename,
    { diarize = true, signal } = {},
  ) {
    if (!cfg.elevenlabsKey) throw new Error("no elevenlabsKey in config.js");
    const form = new FormData();
    form.append("model_id", cfg.scribeModel || "scribe_v2");
    form.append("file", blob, filename);
    form.append("diarize", String(diarize));
    form.append("tag_audio_events", "false");
    const lang = $("lang").value;
    if (lang) form.append("language_code", lang);
    const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": cfg.elevenlabsKey },
      body: form,
      signal,
    });
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try {
        msg +=
          " · " + (((await r.json()).detail || {}).message || "").slice(0, 160);
      } catch {}
      throw new Error(msg);
    }
    const d = await r.json();
    const words = (d.words || []).filter(
      (w) => w.type === "word" || w.type === "spacing",
    );
    const turns = [];
    for (const w of words) {
      const spk = w.speaker_id || "speaker_0";
      const last = turns[turns.length - 1];
      if (last && last.speaker === spk) {
        last.text += w.text;
        last.end = w.end ?? last.end;
      } else if (w.type === "word")
        turns.push({
          speaker: spk,
          start: w.start ?? 0,
          end: w.end ?? 0,
          text: w.text,
        });
    }
    return {
      text: (d.text || "").trim(),
      lang: d.language_code,
      turns: turns.map((t) => ({ ...t, text: t.text.trim() })),
      speakers: [...new Set(turns.map((t) => t.speaker))],
    };
  }

  // ================================================================ audio capture
  const feed = $("feed"),
    empty = $("empty"),
    mic = $("mic"),
    ring = $("ring"),
    timer = $("timer"),
    hint = $("hint");
  let ctx,
    stream,
    source,
    node,
    chunks = [],
    recording = false,
    startedAt = 0,
    timerHandle,
    inputRate = SAMPLE_RATE;
  const workletSrc = `class Tap extends AudioWorkletProcessor { process(inputs) { const ch = inputs[0] && inputs[0][0]; if (ch) this.port.postMessage(ch.slice(0)); return true; } } registerProcessor("tap", Tap);`;
  async function ensureAudio() {
    if (ctx) return;
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    try {
      ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    } catch {
      ctx = new AudioContext();
    }
    inputRate = ctx.sampleRate;
    source = ctx.createMediaStreamSource(stream);
    if (ctx.audioWorklet) {
      await ctx.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob([workletSrc], { type: "application/javascript" }),
        ),
      );
      node = new AudioWorkletNode(ctx, "tap", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
      });
      node.port.onmessage = (e) => onSamples(e.data);
    } else {
      node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) =>
        onSamples(e.inputBuffer.getChannelData(0).slice(0));
    }
    source.connect(node);
    node.connect(ctx.destination);
  }
  function onSamples(buf) {
    if (live.on) {
      live.nl ? nlFeed(buf) : liveFeed(buf);
      return;
    }
    if (!recording) return;
    chunks.push(buf);
    ring.style.transform = `scale(${1 + Math.min(rmsOf(buf) * 6, 0.45)})`;
  }
  function rmsOf(buf) {
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }
  function resampleTo16k(samples) {
    if (inputRate === SAMPLE_RATE) return samples;
    const ratio = inputRate / SAMPLE_RATE,
      out = new Float32Array(Math.floor(samples.length / ratio));
    for (let i = 0; i < out.length; i++) {
      const pos = i * ratio,
        i0 = Math.floor(pos),
        i1 = Math.min(i0 + 1, samples.length - 1);
      out[i] = samples[i0] + (samples[i1] - samples[i0]) * (pos - i0);
    }
    return out;
  }
  function toWav(float32) {
    const pcm = new DataView(new ArrayBuffer(44 + float32.length * 2));
    const w = (o, s) => {
      for (let i = 0; i < s.length; i++) pcm.setUint8(o + i, s.charCodeAt(i));
    };
    w(0, "RIFF");
    pcm.setUint32(4, 36 + float32.length * 2, true);
    w(8, "WAVE");
    w(12, "fmt ");
    pcm.setUint32(16, 16, true);
    pcm.setUint16(20, 1, true);
    pcm.setUint16(22, 1, true);
    pcm.setUint32(24, SAMPLE_RATE, true);
    pcm.setUint32(28, SAMPLE_RATE * 2, true);
    pcm.setUint16(32, 2, true);
    pcm.setUint16(34, 16, true);
    w(36, "data");
    pcm.setUint32(40, float32.length * 2, true);
    for (let i = 0, o = 44; i < float32.length; i++, o += 2) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([pcm], { type: "audio/wav" });
  }

  // ================================================================ push-to-talk recording
  async function startRecording() {
    if (recording || document.body.classList.contains("transcribing")) return;
    try {
      await ensureAudio();
    } catch {
      addEntry({
        error: "Microphone blocked. Allow mic access for this page and reload.",
      });
      return;
    }
    if (ctx.state === "suspended") await ctx.resume();
    chunks = [];
    recording = true;
    startedAt = performance.now();
    document.body.classList.add("listening");
    hint.innerHTML =
      "<strong>Listening</strong> · release or press Space to stop";
    timerHandle = setInterval(() => {
      timer.textContent =
        ((performance.now() - startedAt) / 1000).toFixed(1) + " s";
    }, 100);
  }
  async function stopRecording() {
    if (!recording) return;
    recording = false;
    clearInterval(timerHandle);
    ring.style.transform = "";
    document.body.classList.remove("listening");
    hint.innerHTML =
      "<strong>Hold to talk</strong> · or hold <strong>Space</strong>";
    const total = chunks.reduce((n, c) => n + c.length, 0),
      all = new Float32Array(total);
    for (let i = 0, o = 0; i < chunks.length; o += chunks[i].length, i++)
      all.set(chunks[i], o);
    const pcm16k = resampleTo16k(all),
      seconds = pcm16k.length / SAMPLE_RATE;
    if (seconds < MIN_SECONDS) return;
    document.body.classList.add("transcribing");
    mic.disabled = true;
    try {
      await transcribeOne(engine, toWav(pcm16k), seconds, pcm16k);
    } finally {
      document.body.classList.remove("transcribing");
      mic.disabled = false;
    }
  }
  async function transcribeOne(eng, wav, seconds, pcm) {
    if (useServer() && eng !== "scribe")
      return transcribeViaServer(eng, wav, seconds); // Scribe stays direct
    const entry = addEntry({ pending: true, seconds, audio: wav, engine: eng });
    const t0 = performance.now();
    try {
      let text,
        extra = {};
      if (eng === "indic") {
        const res = await indicRequest(wav, "turn.wav");
        text = res.text;
        extra = { lang: lidLabel(res), lid: lidOf(res) };
      } else if (eng === "whistle") {
        const res = await whistleTranscribe(pcm.slice());
        text = res.text;
        extra = { lang: res.language, ttft: res.ttft_ms };
      } else if (eng === "scribe") {
        const res = await scribeRequest(wav, "turn.wav", { diarize: false });
        text = res.text;
        extra = { lang: res.lang };
      } else {
        const form = new FormData();
        form.append("file", wav, "turn.wav");
        form.append("model", cfg.model);
        form.append("response_format", "json");
        const lang = $("lang").value;
        if (lang) form.append("language", lang);
        const c = asrContextPrompt();
        if (c) form.append("prompt", c);
        const r = await fetch(base + "/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: "Bearer " + cfg.apiKey },
          body: form,
        });
        if (!r.ok) {
          let msg = `HTTP ${r.status}`;
          try {
            msg +=
              " · " + ((await r.json()).error?.message || "").slice(0, 200);
          } catch {}
          throw new Error(msg);
        }
        text = (await r.json()).text;
      }
      text = (text || "").trim();
      updateEntry(entry, {
        text: text || "(no speech recognized)",
        latency: Math.round(performance.now() - t0),
        ...extra,
      });
      if (
        text &&
        ($("correct").checked || ($("romanize").checked && INDIC_RE.test(text)))
      )
        await correctEntry(entry);
    } catch (e) {
      updateEntry(entry, {
        error: e.message || String(e),
        latency: Math.round(performance.now() - t0),
      });
    }
  }
  async function correctEntry(entry) {
    Object.assign(entry, { correcting: true });
    render(entry);
    const t0 = performance.now();
    try {
      const { text, steps, decisions } = await correctText(entry.text, null);
      const ms = Math.round(performance.now() - t0);
      updateEntry(entry, {
        correcting: false,
        raw: entry.text,
        text: text || entry.text,
        cleanupMs: ms,
        correctSteps: steps.join(" · "),
        decisions,
        decisionMs: ms,
      });
      renderDecision(entry);
    } catch (e) {
      updateEntry(entry, { correcting: false, correctError: e.message });
    }
  }

  // ================================================================ feed (cards)
  const history = [];
  function render(entry) {
    const el = entry.el || document.createElement("article");
    el.className =
      "entry" +
      (entry.error ? " error" : "") +
      (entry.pending ? " pending" : "") +
      (entry.kind === "tts" ? " tts" : "");
    // Every value on the meta line comes from an engine, a server or the user,
    // so the line is built from nodes; nothing here is parsed as HTML.
    const bits = [
      entry.kind === "tts"
        ? h("span.who", `TTS · ${entry.voice || "default"}`)
        : h("span.you", "You"),
      h("span", fmtTime(entry.at)),
    ];
    if (entry.engine)
      bits.push(
        h("span.tag." + engineClass(entry.engine), ENGINE_LABEL[entry.engine]),
      );
    if (entry.ttft != null)
      bits.push(h("span", `${Math.round(entry.ttft)} ms to first token`));
    if (entry.lang) bits.push(h("span", `lang ${entry.lang}`));
    if (entry.seconds != null)
      bits.push(h("span", `${entry.seconds.toFixed(1)} s audio`));
    if (entry.latency != null) {
      const rtf = entry.seconds ? entry.latency / 1000 / entry.seconds : null;
      bits.push(
        h(
          "span",
          entry.kind === "tts"
            ? `${entry.latency} ms${rtf ? ` · RTF ${rtf.toFixed(2)}` : ""}`
            : `${entry.latency} ms${rtf ? ` · ${(1 / rtf).toFixed(0)}× realtime` : ""}`,
        ),
      );
    }
    let play = null;
    if (entry.audio) {
      play = h("button.play", "▶ play");
      play.type = "button";
      bits.push(play);
    }
    if (entry.live)
      bits.push(
        h("span.live-badge", entry.liveFinal ? "live" : "live · listening"),
      );
    if (entry.cleanupMs != null)
      bits.push(
        h(
          "span.fix",
          `+${entry.cleanupMs} ms correct${entry.correctSteps ? " · " + entry.correctSteps : ""}${entry.raw && entry.raw !== entry.text ? " · edited" : ""}`,
        ),
      );
    if (entry.correctError) {
      const f = h("span.fix", `correction failed · ${entry.correctError}`);
      f.style.color = "var(--rec)";
      bits.push(f);
    }
    const text = entry.pending
      ? entry.kind === "tts"
        ? "speaking…"
        : "transcribing…"
      : entry.correcting
        ? `${entry.text}\n(correcting…)`
        : entry.error ||
          entry.text ||
          (entry.silent ? "(nothing recognized — audio kept, press play)" : "");
    const textEl = h("div.text");
    if (entry.live && !entry.liveFinal && !entry.error) {
      textEl.textContent = entry.committed || "";
      textEl.append(
        h(
          "span.tail",
          (entry.committed ? " " : "") +
            (entry.tail || (entry.committed ? "" : "listening…")),
        ),
      );
    } else textEl.textContent = text;
    el.replaceChildren(h("div.meta", ...bits), textEl);
    if (entry.raw && entry.raw !== entry.text)
      el.append(h("div.orig", h("b", "before correction"), " ", entry.raw));
    if (play)
      play.onclick = () => {
        const a = new Audio(URL.createObjectURL(entry.audio));
        a.onended = () => URL.revokeObjectURL(a.src);
        a.play();
      };
    return el;
  }
  function addEntry(fields) {
    const entry = { at: new Date(), ...fields };
    entry.el = render(entry);
    history.push(entry);
    if (entry.kind === "tts") $("ttsFeed").appendChild(entry.el);
    else {
      empty.hidden = true;
      feed.appendChild(entry.el);
      feed.scrollTop = feed.scrollHeight;
    }
    persist();
    return entry;
  }
  function updateEntry(entry, fields) {
    Object.assign(entry, fields, { pending: false });
    render(entry);
    persist();
  }
  function persist() {
    store.set(
      "voice-bench-history",
      history
        .filter((e) => !e.pending && !(e.live && !e.liveFinal))
        .slice(-200)
        .map((e) => ({
          at: e.at.toISOString(),
          seconds: e.seconds,
          latency: e.latency,
          text: e.text,
          error: e.error,
          kind: e.kind,
          voice: e.voice,
          engine: e.engine,
          lang: e.lang,
          raw: e.raw,
          cleanupMs: e.cleanupMs,
          correctSteps: e.correctSteps,
          live: e.live,
          liveFinal: e.liveFinal,
        })),
    );
  }
  function restore() {
    for (const s of store.get("voice-bench-history", [])) {
      const entry = { ...s, at: new Date(s.at) };
      entry.el = render(entry);
      history.push(entry);
      (entry.kind === "tts" ? $("ttsFeed") : feed).appendChild(entry.el);
    }
    empty.hidden = history.some((e) => e.kind !== "tts");
  }
  function clearCards() {
    history.length = 0;
    feed.querySelectorAll(".entry").forEach((n) => n.remove());
    $("ttsFeed").innerHTML = "";
    empty.hidden = false;
    persist();
  }
  $("clearLive").onclick = () => {
    clearCards();
    docClear();
    decisionsEl.innerHTML = "";
    $("decisionsEmpty").hidden = false;
  };
  $("clearHistory").onclick = clearCards;
  $("copyAllLive").onclick = async () => {
    const txt =
      live.mode === "live"
        ? docText.textContent.trim()
        : history
            .filter((e) => e.text && e.kind !== "tts")
            .map((e) => `[${fmtTime(e.at)}] ${e.text}`)
            .join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      $("copyAllLive").textContent = "Copied";
    } catch {
      $("copyAllLive").textContent = "Copy failed";
    }
    setTimeout(() => {
      $("copyAllLive").textContent = "Copy transcript";
    }, 1500);
  };

  // ================================================================ live captions
  // Batch engines streamed on the client: continuous mic → energy-gated utterances → re-transcribe the
  // current utterance every few hundred ms → LocalAgreement commits the stable prefix → final pass on
  // a pause → corrector. Endpointing works on 20 ms blocks; the noise floor is a minimum statistic
  // (quietest block in 1.5 s, rising at most ~2x/s) so a louder talker can never push a quieter one
  // below the gate, and speech has onset/sustain hysteresis so soft word endings are kept.
  const LIVE_LABEL = {
    local: "Spark · Qwen3-ASR",
    indic: "IndicConformer",
    whistle: "Whistle",
  };
  const liveInterval = () =>
    ({
      local: tune.intervalLocal,
      indic: tune.intervalIndic,
      whistle: tune.intervalWhistle,
    })[live.engine] || 1000;
  const live = {
    on: false,
    engine: "local",
    mode: "live",
    pre: [],
    preLen: 0,
    utt: null,
    inflight: false,
    timer: null,
    noise: 0.004,
    noiseWin: [],
    block: null,
    blockFill: 0,
    seq: 0,
    lastLid: null,
    nl: null,
  };
  const BLOCK_S = 0.02,
    PREROLL_S = 0.35,
    MIN_SPEECH_MS = 250,
    MIN_SEND_S = 0.8,
    SOFT_GAP_MS = 320,
    MAX_UTT_S = 28;
  const ABS_SUSTAIN_RATIO = 0.58,
    ONSET_RATIO = 3,
    SUSTAIN_RATIO = 1.8;

  function liveFeed(buf) {
    const blockLen = Math.round(BLOCK_S * inputRate);
    if (!live.block || live.block.length !== blockLen) {
      live.block = new Float32Array(blockLen);
      live.blockFill = 0;
    }
    let i = 0;
    while (i < buf.length) {
      const n = Math.min(buf.length - i, blockLen - live.blockFill);
      live.block.set(buf.subarray(i, i + n), live.blockFill);
      live.blockFill += n;
      i += n;
      if (live.blockFill === blockLen) {
        liveBlock(live.block);
        live.block = new Float32Array(blockLen);
        live.blockFill = 0;
      }
    }
  }
  function newUtterance(chunks, rms) {
    return {
      id: ++live.seq,
      chunks,
      rms,
      len: chunks.reduce((a, c) => a + c.length, 0),
      speechMs: 0,
      silenceMs: 0,
      sentLen: 0,
      lastReq: 0,
      prevWords: [],
      committedN: 0,
      entry: null,
      final: false,
      engine: live.engine,
      lid: null,
      switched: null,
    };
  }
  function liveBlock(block) {
    const rms = rmsOf(block);
    ring.style.transform = `scale(${1 + Math.min(rms * 6, 0.45)})`;
    live.noiseWin.push(rms);
    if (live.noiseWin.length > 75) live.noiseWin.shift();
    let winMin = Infinity;
    for (const v of live.noiseWin) if (v < winMin) winMin = v;
    live.noise = Math.max(
      0.0005,
      winMin > live.noise ? Math.min(winMin, live.noise * 1.014) : winMin,
    );
    const onset = rms > Math.max(tune.onset, live.noise * ONSET_RATIO);
    const sustain =
      rms >
      Math.max(tune.onset * ABS_SUSTAIN_RATIO, live.noise * SUSTAIN_RATIO);
    const u = live.utt;
    if (!u) {
      live.pre.push({ block, rms });
      live.preLen += block.length;
      while (live.preLen > PREROLL_S * inputRate && live.pre.length > 1)
        live.preLen -= live.pre.shift().block.length;
      if (onset) {
        live.utt = newUtterance(
          live.pre.map((p) => p.block),
          live.pre.map((p) => p.rms),
        );
        live.utt.speechMs = BLOCK_S * 1000;
        live.pre = [];
        live.preLen = 0;
      }
      return;
    }
    u.chunks.push(block);
    u.rms.push(rms);
    u.len += block.length;
    if (sustain) {
      u.speechMs += BLOCK_S * 1000;
      u.silenceMs = 0;
    } else u.silenceMs += BLOCK_S * 1000;
    if (u.silenceMs >= tune.silence) {
      // a cough is dropped — unless a pass already heard words in it, which must never be lost
      if (u.speechMs >= MIN_SPEECH_MS || u.entry) finalizeUtterance(u);
      else live.utt = null;
    } else if (u.len >= tune.softCut * inputRate && u.silenceMs >= SOFT_GAP_MS)
      finalizeUtterance(u); // long turn: end at this pause
    else if (u.len >= MAX_UTT_S * inputRate) hardCut(u); // no pause at all: split at the quietest recent block
  }
  function hardCut(u) {
    const n = u.chunks.length,
      from = Math.max(1, n - Math.round(3 / BLOCK_S));
    let best = from;
    for (let k = from; k < n; k++) if (u.rms[k] < u.rms[best]) best = k;
    const restChunks = u.chunks.splice(best),
      restRms = u.rms.splice(best);
    u.len = u.chunks.reduce((a, c) => a + c.length, 0);
    const next = newUtterance(restChunks, restRms);
    next.speechMs =
      restRms.filter(
        (r) =>
          r >
          Math.max(tune.onset * ABS_SUSTAIN_RATIO, live.noise * SUSTAIN_RATIO),
      ).length *
      BLOCK_S *
      1000;
    finalizeUtterance(u); // clears live.utt synchronously before its first await
    live.utt = next;
  }
  function uttPcm(u) {
    const out = new Float32Array(u.len);
    let o = 0;
    for (const c of u.chunks) {
      out.set(c, o);
      o += c.length;
    }
    return resampleTo16k(out);
  }

  async function engineOnce(eng, pcm) {
    const wav = toWav(pcm);
    if (eng === "indic") {
      const res = await indicRequest(wav, "live.wav");
      const lid = lidOf(res);
      if (lid?.detected) live.lastLid = lid;
      return { text: (res.text || "").trim(), lid };
    }
    if (eng === "whistle")
      return {
        text: ((await whistleTranscribe(pcm.slice())).text || "").trim(),
        lid: null,
      };
    const form = new FormData();
    form.append("file", wav, "live.wav");
    form.append("model", cfg.model);
    form.append("response_format", "json");
    const lang = $("lang").value;
    if (lang) form.append("language", lang);
    const c = asrContextPrompt();
    if (c) form.append("prompt", c);
    const r = await fetch(base + "/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + cfg.apiKey },
      body: form,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { text: ((await r.json()).text || "").trim(), lid: null };
  }
  const commonPrefix = (a, b) => {
    let n = 0;
    while (n < a.length && n < b.length && a[n] === b[n]) n++;
    return n;
  };
  async function liveTick() {
    const u = live.utt;
    if (!u || live.inflight || u.final) return;
    if (performance.now() - u.lastReq < liveInterval()) return;
    if (u.len - u.sentLen < MIN_SEND_S * inputRate) return;
    await runPass(u, false);
  }
  const interimText = (u) =>
    [u.entry?.committed, u.entry?.tail].filter(Boolean).join(" ");
  async function runPass(u, isFinal) {
    live.inflight = true;
    u.lastReq = performance.now();
    u.sentLen = u.len;
    const t0 = performance.now();
    try {
      const pcm = uttPcm(u);
      let { text, lid } = await engineOnce(u.engine, pcm);
      if (lid) u.lid = lid;
      // IndicConformer cannot read this audio (English, far-field: it answers "unsure" or nothing at all).
      // Hand the rest of this utterance to the Spark right now, so the user never sees it go blank.
      // Not on the first second, though: the language score is unreliable under ~2.5 s of audio even for
      // clean Hindi or Tamil (measured −0.32 at 1 s, −0.05 at 2 s on the same clip).
      // Code-mixed speech hovers around the threshold as English words come and go, so one unsure pass
      // means nothing; a pass that was confident once settles the matter for the whole utterance.
      const secs = u.len / inputRate;
      if (lid?.detected) u.lidOk = true;
      u.unsureN = lid?.detected === false || !text ? (u.unsureN || 0) + 1 : 0;
      if (
        u.engine === "indic" &&
        !u.switched &&
        !u.lidOk &&
        secs >= 3 &&
        u.speechMs >= 1500 &&
        u.unsureN >= 2
      ) {
        u.engine = "local";
        u.switched = "Indic unsure → Spark took over";
        u.prevWords = [];
        u.committedN = 0;
        try {
          text = (await engineOnce("local", pcm)).text;
        } catch {}
      }
      if (!u.entry) {
        u.entry = addEntry({
          live: true,
          engine: u.engine,
          pending: false,
          committed: "",
          tail: "",
        });
        u.entry.liveId = u.id;
      }
      u.entry.engine = u.engine;
      const words = text.split(/\s+/).filter(Boolean);
      if (isFinal) {
        // The final pass covers the same audio as the interims plus the tail, so it can only be richer.
        // If an engine glitch returns nothing, or less than half the words already shown, keep what was shown.
        const shown = interimText(u),
          nShown = shown.split(/\s+/).filter(Boolean).length;
        if (!text || (nShown >= 2 && words.length < nShown * 0.5)) {
          text = shown;
          if (shown) u.keptInterim = true;
        }
        u.entry.text = text;
      } else {
        const agreed = Math.max(u.committedN, commonPrefix(u.prevWords, words)); // LocalAgreement: never shrink the stable prefix
        u.committedN = Math.min(agreed, words.length);
        u.prevWords = words;
        u.entry.committed = words.slice(0, u.committedN).join(" ");
        u.entry.tail = words.slice(u.committedN).join(" ");
      }
      u.entry.latency = Math.round(performance.now() - t0);
      u.entry.seconds = u.len / inputRate;
      render(u.entry);
      if (!isFinal) docSetInterim(u.entry);
      return text;
    } catch (e) {
      if (u.entry) {
        u.entry.error = e.message || String(e);
        render(u.entry);
      }
      return interimText(u);
    } finally {
      live.inflight = false;
    }
  }
  async function finalizeUtterance(u) {
    u.final = true;
    live.utt = null;
    while (live.inflight) await new Promise((r) => setTimeout(r, 30));
    const pcm = uttPcm(u);
    const needFinal = u.len - u.sentLen >= 0.4 * inputRate || !u.entry;
    // The Spark's second opinion runs at the same time as the final pass instead of after it.
    const wantAlt =
      $("correct").checked && $("dual").checked && u.engine === "indic";
    const altP = wantAlt
      ? engineOnce("local", pcm)
          .then((r) => r.text)
          .catch(() => null)
      : Promise.resolve(null);
    let text = needFinal ? await runPass(u, true) : interimText(u);
    const e = u.entry;
    if (!e) return;
    const alt = await altP;
    const steps = [];
    if (u.switched) steps.push(u.switched);
    if (u.keptInterim)
      steps.push("final pass returned less; kept the live text");
    if (!text && alt) {
      text = alt;
      steps.push("Spark text used (engine returned nothing)");
    }
    e.text = text;
    e.liveFinal = true;
    e.audio = toWav(pcm);
    e.lid = u.lid;
    e.seconds = u.len / inputRate;
    if (!text) {
      e.silent = true;
      render(e);
      persist();
      docRawRow(e, docRawLi(e), "silent");
      return;
    } // nothing from any engine: no sentence, but the card and the strip say so
    render(e);
    persist();
    if (!$("correct").checked || e.error) {
      docSetFinal(e, text, "skipped");
      if (e.lid) renderDecision(e);
      return;
    }
    docSetFinal(e, text, "fixing");
    setDocStatus(LIVE_LABEL[live.engine], `· correcting…`);
    const t0 = performance.now();
    try {
      const primary = text,
        secondary = u.engine === "indic" ? alt : null; // after a takeover the Indic text is noise; the Spark's is the transcript
      const res = await correctText(primary, secondary, {
        onPartial: (partial) => docSetText(e, partial),
      });
      const ms = Math.round(performance.now() - t0);
      updateEntry(e, {
        raw: text,
        text: res.text,
        cleanupMs: ms,
        correctSteps: [...steps, ...res.steps].join(" · "),
        decisions: res.decisions,
        decisionMs: ms,
      });
      docSetFinal(e, res.text, "corrected");
      renderDecision(e);
      setDocStatus(
        LIVE_LABEL[live.engine],
        `· listening · last correction ${ms} ms`,
      );
    } catch (err) {
      console.warn("correction failed:", err.message);
      updateEntry(e, {
        correctSteps: [...steps, "correction failed: " + err.message].join(
          " · ",
        ),
      });
      docSetFinal(e, text, "failed");
    }
  }

  // document view: committed words type in, grey tail, each sentence replaced in place when corrected
  const docBody = $("docBody"),
    docText = $("docText"),
    docTail = $("docTail"),
    docStatus = $("docStatus"),
    rawList = $("rawList");
  const docSentences = new Map();
  const typer = { target: "", shown: "", timer: null };
  function docSetInterim(entry) {
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
    docBody.classList.remove("is-empty");
    if (!typer.timer) typeTick();
    setDocStatus(
      LIVE_LABEL[live.engine],
      `${live.lastLid ? " · " + String(live.lastLid.language) + (live.lastLid.detected ? "" : "?") : ""} · listening · ${entry.latency} ms per pass`,
    );
  }
  function typeTick() {
    typer.timer = null;
    if (typer.shown.length < typer.target.length) {
      const step = Math.max(
        1,
        Math.ceil((typer.target.length - typer.shown.length) / 12),
      );
      typer.shown = typer.target.slice(0, typer.shown.length + step);
      docTail.textContent = typer.shown;
      docBody.scrollTop = docBody.scrollHeight;
      typer.timer = setTimeout(typeTick, 28);
    } else if (typer.shown !== typer.target) {
      typer.shown = typer.target;
      docTail.textContent = typer.shown;
    }
  }
  function docRec(entry) {
    let rec = docSentences.get(entry);
    if (!rec) {
      const span = document.createElement("span");
      span.className = "sent";
      docText.appendChild(span);
      docText.appendChild(document.createTextNode(" "));
      const li = document.createElement("li");
      rawList.appendChild(li);
      rec = { span, li };
      docSentences.set(entry, rec);
    }
    return rec;
  }
  const docRawLi = (entry) => {
    const li = document.createElement("li");
    rawList.appendChild(li);
    return li;
  };
  // streamed correction: the sentence is rewritten word by word as the model answers
  function docSetText(entry, text) {
    const rec = docSentences.get(entry);
    if (!rec || !text) return;
    rec.span.textContent = text;
    docBody.scrollTop = docBody.scrollHeight;
  }
  function docSetFinal(entry, text, stage) {
    const rec = docRec(entry);
    rec.span.textContent = text;
    rec.span.classList.toggle("fixing", stage === "fixing");
    rec.span.classList.toggle("corrected", stage === "corrected");
    typer.target = typer.shown = "";
    docTail.textContent = "";
    clearTimeout(typer.timer);
    typer.timer = null;
    docBody.classList.remove("is-empty");
    docBody.scrollTop = docBody.scrollHeight;
    docRawRow(entry, rec.li, stage);
  }
  function docRawRow(entry, li, stage) {
    const raw = entry.raw || entry.text || (entry.silent ? "(silence)" : "");
    const badges = [];
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
      if (entry.correctSteps) badges.push(["", entry.correctSteps]);
    } else if (stage === "skipped") badges.push(["", "correction off"]);
    else if (stage === "failed")
      badges.push(["warn", "correction failed · raw text kept"]);
    else if (stage === "silent")
      badges.push([
        "",
        `nothing recognized by any engine · ${(entry.seconds || 0).toFixed(1)} s kept on the card`,
      ]);
    if (entry.correctSteps && stage !== "corrected")
      badges.push(["", entry.correctSteps]);
    li.replaceChildren(
      h("span.raw", raw),
      h(
        "span.badges",
        ...badges.map(([c, t]) => h("span.badge" + (c ? "." + c : ""), t)),
      ),
    );
    li.scrollIntoView({ block: "nearest" });
  }
  function docClear() {
    docText.textContent = "";
    docTail.textContent = "";
    rawList.innerHTML = "";
    docSentences.clear();
    docBody.classList.add("is-empty");
  }
  $("docCopy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(docText.textContent.trim());
      $("docCopy").textContent = "Copied";
    } catch {
      $("docCopy").textContent = "Copy failed";
    }
    setTimeout(() => {
      $("docCopy").textContent = "Copy";
    }, 1500);
  };
  $("docClear").onclick = () => {
    docClear();
    docBody.focus();
  };
  docBody.addEventListener("input", () =>
    docBody.classList.toggle("is-empty", !docBody.textContent.trim()),
  );

  async function liveStart() {
    try {
      await ensureAudio();
    } catch {
      addEntry({
        error: "Microphone blocked. Allow mic access for this page and reload.",
      });
      return;
    }
    if (ctx.state === "suspended") await ctx.resume();
    live.engine = LIVE_LABEL[engine] ? engine : "local";
    live.on = true;
    live.utt = null;
    live.pre = [];
    live.preLen = 0;
    live.block = null;
    live.noiseWin = [];
    live.noise = 0.004;
    live.lastLid = null;
    $("docEngine").textContent = LIVE_LABEL[live.engine];
    $("docEngine").className = "tag " + engineClass(live.engine);
    setDocStatus(LIVE_LABEL[live.engine], `· listening`);
    document.body.classList.add("live-on");
    if (useServer()) {
      // the server endpoints, transcribes and corrects; the page only streams PCM
      hint.innerHTML = `<strong>Live captions on</strong> · ${LIVE_LABEL[live.engine]} via NeuroLink · speak naturally, click the mic to stop`;
      setDocStatus(LIVE_LABEL[live.engine], `· via NeuroLink · connecting…`);
      nlLiveStart();
      return;
    }
    warmCorrector();
    hint.innerHTML = `<strong>Live captions on</strong> · ${LIVE_LABEL[live.engine]} · speak naturally, click the mic to stop`;
    live.timer = setInterval(liveTick, 150);
    if (live.engine === "whistle") whistleStart();
  }
  async function liveStop() {
    live.on = false;
    clearInterval(live.timer);
    ring.style.transform = "";
    document.body.classList.remove("live-on");
    docStatus.replaceChildren("stopped · click the mic to continue");
    hint.innerHTML = "<strong>Live captions</strong> · click the mic to start";
    if (live.nl) {
      nlLiveStop();
      return;
    }
    const u = live.utt;
    if (u && (u.speechMs >= MIN_SPEECH_MS || u.entry))
      await finalizeUtterance(u);
    else live.utt = null;
  }
  function updateModeNote() {
    $("modeNote").textContent =
      live.mode === "live"
        ? engine === "scribe"
          ? "Scribe is push-to-talk only — live captions use the self-hosted engines"
          : `${LIVE_LABEL[engine] || "Spark · Qwen3-ASR"} · correction on pause${useServer() ? " · via NeuroLink" : ""}`
        : useServer()
          ? engine === "scribe"
            ? "Scribe · direct"
            : "via NeuroLink"
          : "";
    document.querySelector('#engineSeg [data-engine="scribe"]').disabled =
      live.mode === "live";
  }
  function setMode(mode) {
    if (live.on) liveStop();
    live.mode = mode;
    document.body.classList.toggle("mode-live", mode === "live");
    document.body.classList.toggle("mode-ptt", mode === "ptt");
    document
      .querySelectorAll("#modeSeg button")
      .forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    mic.setAttribute(
      "aria-label",
      mode === "live" ? "Start or stop live captions" : "Hold to talk",
    );
    hint.innerHTML =
      mode === "live"
        ? "<strong>Live captions</strong> · click the mic to start"
        : "<strong>Hold to talk</strong> · or hold <strong>Space</strong>";
    if (mode === "live" && engine === "scribe") setEngine("local");
    updateModeNote();
    store.set("voice-bench-mode", mode);
  }
  document
    .querySelectorAll("#modeSeg button")
    .forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

  // mic: hold = talk while held; a tap shorter than TAP_MS toggles; in live mode a click starts/stops
  const TAP_MS = 250;
  let pressStart = 0,
    toggled = false;
  function pressDown() {
    if (live.mode === "live") {
      live.on ? liveStop() : liveStart();
      return;
    }
    if (recording && toggled) {
      toggled = false;
      stopRecording();
      return;
    }
    pressStart = performance.now();
    startRecording();
  }
  function pressUp() {
    if (live.mode === "live" || !recording) return;
    if (performance.now() - pressStart < TAP_MS) {
      toggled = true;
      return;
    }
    toggled = false;
    stopRecording();
  }
  mic.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    mic.setPointerCapture(e.pointerId);
    pressDown();
  });
  mic.addEventListener("pointerup", (e) => {
    e.preventDefault();
    pressUp();
  });
  mic.addEventListener("pointercancel", () => {
    if (recording && !toggled) stopRecording();
  });
  const typing = (e) =>
    ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
    e.target.isContentEditable;
  window.addEventListener("keydown", (e) => {
    if (
      e.code !== "Space" ||
      e.repeat ||
      typing(e) ||
      mic.disabled ||
      $("viewLive").hidden
    )
      return;
    e.preventDefault();
    pressDown();
  });
  window.addEventListener("keyup", (e) => {
    if (e.code !== "Space" || typing(e)) return;
    e.preventDefault();
    pressUp();
  });
  window.addEventListener("blur", () => {
    if (recording && !toggled) stopRecording();
  });

  // ================================================================ NeuroLink transport
  // With "Transcribe through NeuroLink server" on, push-to-talk and files are one POST to the server's
  // OpenAI-compatible /v1/audio/transcriptions (verbose_json), and live captions stream PCM16 over its
  // WebSocket: the server runs the engine, the endpointer, the dictionary, the decision guard and the
  // rewrite. Off, everything above runs in the page as before — that path is the comparison baseline.
  let viaServer = !!nlBase && store.get("voice-bench-via-neurolink", true);
  const useServer = () => viaServer && !!nlBase;
  const nlHeaders = () =>
    cfg.neurolinkToken ? { Authorization: "Bearer " + cfg.neurolinkToken } : {};
  const nlEngineOf = (provider) =>
    Object.keys(NL_PROVIDERS).find(
      (k) => NL_PROVIDERS[k] === String(provider || "").split("/")[0],
    ) || null;
  const nlDictionary = () =>
    dictionary.map((e) => ({
      term: e.term,
      heardAs: e.heard,
      ...(e.meaning ? { meaning: e.meaning } : {}),
    }));
  const nlContext = () => ($("meetingContext").value || "").trim();
  // The selector's language, when the engine can take it; otherwise auto (omitted).
  function nlLanguage(eng) {
    const l = $("lang").value;
    if (!l) return null;
    if (eng === "indic") return INDIC_LANGS.includes(l) ? l : null;
    if (eng === "whistle")
      return ["en", "de", "fr", "es", "it", "nl", "pl"].includes(l) ? l : null;
    return l;
  }
  // The server's decision record carries the probability of the CHOSEN reading; the panel wants P(term).
  const nlDecisions = (ds) =>
    (ds || []).map((d) => ({
      heard: d.heard,
      term: d.term,
      choice: d.choice || "term",
      pTerm:
        d.probability == null
          ? null
          : d.choice === "literal"
            ? 1 - d.probability
            : d.probability,
      confidence: d.confidence ?? null,
      ...(d.note ? { note: d.note } : {}),
    }));
  function nlSteps(d) {
    const t = d.timings || {},
      steps = ["via NeuroLink"];
    if (d.engine?.fallbackUsed) steps.push(`fallback → ${d.engine.provider}`);
    steps.push(...(d.steps || []));
    const ms = [
      ["transcribe", t.transcribeMs],
      ["2nd opinion", t.secondOpinionMs],
      ["decide", t.decideMs],
      ["rewrite", t.rewriteMs],
    ]
      .filter(([, v]) => v != null && v > 0)
      .map(([k, v]) => `${k} ${Math.round(v)} ms`);
    if (ms.length) steps.push(ms.join(", "));
    return steps;
  }
  const nlLangLabel = (lang, detected) =>
    lang && lang !== "auto"
      ? lang +
        (detected === true ? " (auto)" : detected === false ? " (unsure)" : "")
      : null;
  async function nlTranscribe(
    blob,
    filename,
    { eng, model, diarize, correct, secondOpinion, fallback, signal },
  ) {
    const form = new FormData();
    form.append("file", blob, filename);
    form.append(
      "model",
      model ? `${NL_PROVIDERS[eng]}/${model}` : NL_PROVIDERS[eng],
    );
    form.append("response_format", "verbose_json");
    const lang = nlLanguage(eng);
    if (lang) form.append("language", lang);
    if (correct) {
      // A dictionary alone switches the server's correction on, so it is only sent when correcting.
      const c = nlContext();
      if (c) form.append("prompt", c);
      if (dictionary.length)
        form.append("dictionary", JSON.stringify(nlDictionary()));
      form.append("correct", "1");
      if (secondOpinion) form.append("second_opinion", secondOpinion);
    } else {
      const p = asrContextPrompt();
      if (p) form.append("prompt", p);
    }
    if (fallback) form.append("fallback", fallback);
    if (diarize) form.append("diarize", "1");
    const r = await fetch(nlBase + "/v1/audio/transcriptions", {
      method: "POST",
      headers: nlHeaders(),
      body: form,
      signal,
    });
    if (!r.ok) {
      let msg = `NeuroLink HTTP ${r.status}`;
      try {
        msg += " · " + ((await r.json()).error?.message || "").slice(0, 200);
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  }
  async function checkNeurolink() {
    if (!nlBase) {
      conn("connNeurolink", "", "off · direct");
      return false;
    }
    const mode = useServer() ? "on" : "direct";
    try {
      const r = await fetch(nlBase + "/api/health", {
        headers: nlHeaders(),
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) {
        conn("connNeurolink", "bad", `${mode} · HTTP ${r.status}`);
        return false;
      }
      conn("connNeurolink", "ok", `${mode} · ${new URL(nlBase).host}`);
      return true;
    } catch {
      conn("connNeurolink", "bad", `${mode} · unreachable`);
      return false;
    }
  }
  function transportChanged() {
    $("transportHint").textContent = !nlBase
      ? "set neurolinkBaseUrl in config.js to enable"
      : useServer()
        ? `via ${nlBase}`
        : "direct engines + browser corrector";
    checkNeurolink().then((ok) => {
      if (!recording && !live.on)
        mic.disabled = !(backendOk || (useServer() && ok));
    });
    updateModeNote();
  }
  let backendOk = false;

  // push to talk through the server: one request, transcription and correction together
  async function transcribeViaServer(eng, wav, seconds) {
    const entry = addEntry({ pending: true, seconds, audio: wav, engine: eng });
    const t0 = performance.now();
    const correct = $("correct").checked;
    try {
      const d = await nlTranscribe(wav, "turn.wav", {
        eng,
        correct,
        secondOpinion:
          correct && $("dual").checked && (eng === "indic" || eng === "whistle")
            ? NL_PROVIDERS.local
            : null,
        fallback: eng === "indic" ? NL_PROVIDERS.local : null,
      });
      const shown = nlEngineOf(d.engine?.provider) || eng;
      const text = (d.text || "").trim(),
        raw = (d.raw ?? d.text ?? "").trim();
      const lid =
        d.language && d.language !== "auto"
          ? { language: d.language, detected: d.language_detected }
          : null;
      const fields = {
        engine: shown,
        text: text || "(no speech recognized)",
        latency: Math.round(performance.now() - t0),
        lang: nlLangLabel(d.language, d.language_detected),
        lid,
      };
      if (correct && text)
        Object.assign(fields, {
          raw,
          cleanupMs: Math.round(
            d.timings?.correctionMs ?? d.timings?.totalMs ?? 0,
          ),
          correctSteps: nlSteps(d).join(" · "),
          decisions: nlDecisions(d.decisions),
          decisionMs:
            d.timings?.decideMs != null ? Math.round(d.timings.decideMs) : null,
        });
      else fields.correctSteps = nlSteps(d).join(" · ");
      updateEntry(entry, fields);
      if (correct && text) renderDecision(entry);
    } catch (e) {
      updateEntry(entry, {
        error: e.message || String(e),
        latency: Math.round(performance.now() - t0),
      });
    }
  }

  // files through the server: one column per engine, segments (with speakers) from verbose_json
  async function runViaServer(kind, file) {
    const ids = {
      local: ["resLocal", "segments", "barLocal", localStats],
      indic: ["resIndic", "indicSegments", "barIndic", indicStats],
      whistle: ["resWhistle", "whistleSegments", "barWhistle", whistleStats],
    }[kind];
    const [resId, listId, barId, stats] = ids,
      S = job[kind];
    $(resId).hidden = false;
    $(listId).innerHTML = "";
    $(barId).style.width = "15%";
    S.phase = "uploading to NeuroLink";
    stats();
    const tick = setInterval(() => {
      if (
        S.phase === "uploading to NeuroLink" &&
        performance.now() - job.t0 > 3000
      ) {
        S.phase =
          kind === "local" ? "diarizing + transcribing" : "transcribing";
        $(barId).style.width = "55%";
      }
      stats();
    }, 1000);
    try {
      const correct = $("cleanup").checked || $("romanize").checked;
      const d = await nlTranscribe(file, file.name, {
        eng: kind,
        model: kind === "local" ? NL_DIARIZED : null,
        diarize: kind === "local",
        correct,
        secondOpinion:
          correct && $("dual").checked && kind !== "local"
            ? NL_PROVIDERS.local
            : null,
        fallback: kind === "indic" ? NL_PROVIDERS.local : null,
        signal: job.abort.signal,
      });
      S.t1 = performance.now();
      S.done = true;
      job.duration = d.duration || job.duration;
      const segs = d.segments?.length
        ? d.segments
        : d.text
          ? [{ start: 0, end: d.duration || job.duration, text: d.text }]
          : [];
      const spk = [...new Set(segs.map((x) => x.speaker).filter(Boolean))],
        names = Object.fromEntries(
          spk.map((id, i) => [id, `Speaker ${i + 1}`]),
        );
      const pieces = segs.length,
        rows = segs.map((x, i) => ({
          i,
          start: x.start,
          end: x.end,
          text: d.segments?.length ? x.text : (d.raw ?? x.text),
          speaker: names[x.speaker],
        }));
      // The server corrects the transcript as a whole, not segment by segment: show that as its own row.
      if (d.corrected)
        rows.push({
          i: rows.length,
          start: 0,
          end: d.duration || job.duration,
          text: d.corrected,
          raw: d.raw,
          speaker: "corrected",
        });
      if (kind === "local") S.chunks = rows;
      else S.rows = rows;
      if (kind === "indic")
        S.lang = nlLangLabel(d.language, d.language_detected);
      for (const r of rows)
        $(listId).appendChild(
          renderSeg(r, spk.length > 1 || r.speaker === "corrected"),
        );
      const secs = (S.t1 - job.t0) / 1000,
        dur = d.duration || job.duration || 0;
      S.phase = [
        kind === "local"
          ? `${spk.length || 1} speaker${spk.length > 1 ? "s" : ""}`
          : `${pieces} piece${pieces === 1 ? "" : "s"}`,
        nlSteps(d).join(" · "),
        `${secs.toFixed(0)} s total`,
        dur ? `${(dur / secs).toFixed(0)}× realtime` : null,
        "done",
      ]
        .filter(Boolean)
        .join(" · ");
      $(barId).style.width = "100%";
    } catch (e) {
      S.t1 = performance.now();
      S.phase = job.abort.signal.aborted
        ? "cancelled"
        : "failed: " + (e.message || e);
    } finally {
      clearInterval(tick);
    }
    stats();
  }

  // live captions through the server's WebSocket. Each connection keeps its own utterance map, so a
  // stopped session can drain its last corrections while a new one starts.
  const NL_SEND_SAMPLES = 1600,
    NL_KEEP_SAMPLES = 600 * SAMPLE_RATE; // 100 ms of 16 kHz PCM per frame; 10 min kept for playback
  function nlLiveConfig(eng) {
    const c = { provider: NL_PROVIDERS[eng] };
    const lang = nlLanguage(eng);
    if (lang) c.language = lang;
    const ctxS = nlContext();
    if ($("correct").checked) {
      if (ctxS) c.prompt = ctxS;
      if (dictionary.length) c.dictionary = nlDictionary();
      c.correction = {
        ...(ctxS ? { context: ctxS } : {}),
        ...($("dual").checked && eng !== "local"
          ? { secondOpinion: { provider: NL_PROVIDERS.local } }
          : {}),
      };
    } else {
      const p = asrContextPrompt();
      if (p) c.prompt = p;
    } // no dictionary: it would switch correction on
    if (eng === "indic") c.fallback = { provider: NL_PROVIDERS.local };
    c.streaming = { sampleRate: SAMPLE_RATE };
    return c;
  }
  function nlLiveStart() {
    const url = new URL(
      nlBase.replace(/^http/, "ws") + "/v1/audio/transcriptions/stream",
    );
    if (cfg.neurolinkToken) url.searchParams.set("token", cfg.neurolinkToken);
    const s = {
      ws: new WebSocket(url),
      queue: [],
      pend: [],
      pendLen: 0,
      utts: new Map(),
      sent: [],
      sentLen: 0,
      sentFrom: 0,
      correct: $("correct").checked,
      eng: live.engine,
      ended: false,
    };
    s.ws.binaryType = "arraybuffer";
    s.ws.onopen = () => {
      s.ws.send(JSON.stringify(nlLiveConfig(s.eng)));
      for (const b of s.queue) s.ws.send(b);
      s.queue = [];
      if (s.ended) s.ws.send(JSON.stringify({ type: "end" }));
    };
    s.ws.onmessage = (m) => {
      if (typeof m.data !== "string") return;
      let ev;
      try {
        ev = JSON.parse(m.data);
      } catch {
        return;
      }
      nlEvent(s, ev);
    };
    s.ws.onclose = (ev) => {
      if (live.nl === s && live.on) {
        setDocStatus(
          LIVE_LABEL[s.eng],
          `· NeuroLink connection closed (${ev.code}${ev.reason ? " " + String(ev.reason) : ""})`,
        );
        liveStop();
      }
    };
    s.ws.onerror = () => {
      if (live.nl === s)
        setDocStatus(LIVE_LABEL[s.eng], `· cannot reach the NeuroLink server`);
    };
    live.nl = s;
  }
  function nlSend(s, int16) {
    const buf = int16.buffer;
    if (s.ws.readyState === WebSocket.OPEN) s.ws.send(buf);
    else if (s.ws.readyState === WebSocket.CONNECTING) s.queue.push(buf);
  }
  function nlFlush(s) {
    if (!s.pendLen) return;
    const out = new Int16Array(s.pendLen);
    let o = 0;
    for (const f of s.pend)
      for (let i = 0; i < f.length; i++, o++) {
        const v = Math.max(-1, Math.min(1, f[i]));
        out[o] = v < 0 ? v * 0x8000 : v * 0x7fff;
      }
    s.pend = [];
    s.pendLen = 0;
    nlSend(s, out);
    s.sent.push(out);
    s.sentLen += out.length; // kept (last 10 min) so each finished sentence's card can play its audio
    while (s.sentLen - s.sentFrom > NL_KEEP_SAMPLES && s.sent.length > 1)
      s.sentFrom += s.sent.shift().length;
  }
  function nlAudio(s, start, end) {
    const a = Math.max(Math.round(start * SAMPLE_RATE), s.sentFrom),
      b = Math.min(Math.round(end * SAMPLE_RATE), s.sentLen);
    if (!(b > a)) return null;
    const out = new Float32Array(b - a);
    let pos = s.sentFrom;
    for (const c of s.sent) {
      const lo = Math.max(a, pos),
        hi = Math.min(b, pos + c.length);
      for (let i = lo; i < hi; i++) out[i - a] = c[i - pos] / 0x8000;
      pos += c.length;
      if (pos >= b) break;
    }
    return toWav(out);
  }
  function nlFeed(buf) {
    ring.style.transform = `scale(${1 + Math.min(rmsOf(buf) * 6, 0.45)})`; // the level ring; the server does the endpointing
    const s = live.nl;
    if (!s) return;
    const pcm = resampleTo16k(buf);
    s.pend.push(pcm);
    s.pendLen += pcm.length;
    if (s.pendLen >= NL_SEND_SAMPLES) nlFlush(s);
  }
  function nlLiveStop() {
    const s = live.nl;
    live.nl = null;
    if (!s) return;
    nlFlush(s);
    s.ended = true;
    if (s.ws.readyState === WebSocket.OPEN)
      s.ws.send(JSON.stringify({ type: "end" })); // the server finalizes, corrects, then closes with 1000
    else if (s.ws.readyState !== WebSocket.CONNECTING) return;
    setTimeout(() => {
      if (s.ws.readyState < WebSocket.CLOSING) s.ws.close(1000);
    }, 30000);
  }
  function nlUtt(s, id) {
    let u = s.utts.get(id);
    if (!u) {
      u = {
        entry: addEntry({
          live: true,
          engine: s.eng,
          pending: false,
          committed: "",
          tail: "",
        }),
        lid: null,
      };
      u.entry.liveId = id;
      s.utts.set(id, u);
    }
    return u;
  }
  function nlStatus(s, text) {
    setDocStatus(
      LIVE_LABEL[s.eng],
      `· via NeuroLink${live.lastLid ? " · " + String(live.lastLid.language) + (live.lastLid.detected ? "" : "?") : ""} · ${text}`,
    );
  }
  function nlEvent(s, ev) {
    const engOf = (p) => nlEngineOf(p) || s.eng;
    if (ev.type === "error") {
      console.warn("NeuroLink stream error:", ev.message);
      if (ev.recoverable)
        nlStatus(s, `error: ${esc(ev.message || "unknown")} · still listening`);
      else {
        setDocStatus(
          LIVE_LABEL[s.eng],
          `· NeuroLink error: ${String(ev.message || "unknown")}`,
        );
        if (live.nl === s && live.on) liveStop();
      }
      return;
    }
    if (ev.utterance == null) return;
    if (ev.type === "language") {
      const lid = {
        language: ev.language,
        detected: ev.detected,
        scores: ev.scores,
      };
      live.lastLid = lid;
      nlUtt(s, ev.utterance).lid = lid;
      nlStatus(s, live.on ? "listening" : "finishing");
      return;
    }
    const u = nlUtt(s, ev.utterance),
      e = u.entry;
    if (ev.type === "interim") {
      if (e.liveFinal) return;
      e.engine = engOf(ev.engine);
      e.committed = ev.committed || "";
      e.tail = ev.tail || (ev.committed ? "" : ev.text || "");
      e.latency = ev.latencyMs;
      e.seconds = ev.seconds;
      render(e);
      docSetInterim(e);
      nlStatus(s, `listening · ${ev.latencyMs ?? "?"} ms per pass`);
    } else if (ev.type === "final") {
      const steps = ["via NeuroLink"];
      e.engine = engOf(ev.engine);
      e.text = ev.text || "";
      e.liveFinal = true;
      e.seconds = ev.seconds;
      const seg = ev.segment;
      if (seg && seg.end != null)
        e.audio = nlAudio(s, seg.start ?? 0, seg.end) || e.audio;
      e.lid = ev.language
        ? {
            language: ev.language,
            detected: ev.languageDetected,
            scores: u.lid?.scores,
          }
        : u.lid;
      e.correctSteps = steps.join(" · ");
      if (!e.text) {
        e.silent = true;
        render(e);
        persist();
        docRawRow(e, docRawLi(e), "silent");
        return;
      }
      render(e);
      persist();
      docSetFinal(e, e.text, s.correct ? "fixing" : "skipped");
      if (s.correct) nlStatus(s, "correcting…");
      else if (e.lid) renderDecision(e);
    } else if (ev.type === "correcting") docSetText(e, ev.text);
    else if (ev.type === "corrected") {
      const t = ev.timings || {};
      const steps = [
        ...(e.correctSteps ? [e.correctSteps] : []),
        ...nlSteps({ steps: ev.steps, timings: t }).slice(1),
      ];
      updateEntry(e, {
        raw: ev.raw ?? e.text,
        text: ev.text || e.text,
        cleanupMs: Math.round(t.correctionMs ?? t.totalMs ?? 0),
        correctSteps: steps.join(" · "),
        decisions: nlDecisions(ev.decisions),
        decisionMs: t.decideMs != null ? Math.round(t.decideMs) : null,
      });
      docSetFinal(e, e.text, "corrected");
      renderDecision(e);
      nlStatus(
        s,
        `${live.on && live.nl === s ? "listening" : "stopped"} · last correction ${Math.round(t.correctionMs ?? t.totalMs ?? 0)} ms`,
      );
    } else if (ev.type === "silence") {
      if (e.liveFinal && e.text) return;
      Object.assign(e, {
        liveFinal: true,
        silent: true,
        text: "",
        seconds: ev.seconds,
      });
      typer.target = typer.shown = "";
      docTail.textContent = "";
      render(e);
      persist();
      docRawRow(e, docRawLi(e), "silent");
    }
  }

  // ================================================================ text to speech
  const ttsText = $("ttsText"),
    voiceSel = $("voice"),
    speakBtn = $("speak");
  async function loadVoices() {
    try {
      const d = await (await fetch(base + "/s2pro/voices")).json();
      const current = voiceSel.value;
      voiceSel.innerHTML = "";
      for (const v of d.voices || ["default"]) {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        voiceSel.appendChild(o);
      }
      if ([...voiceSel.options].some((o) => o.value === current))
        voiceSel.value = current;
    } catch {}
  }
  function wavSeconds(buf) {
    const v = new DataView(buf);
    if (buf.byteLength < 44 || v.getUint32(0, false) !== 0x52494646)
      return null;
    return (
      (buf.byteLength - 44) /
      (v.getUint32(24, true) *
        v.getUint16(22, true) *
        (v.getUint16(34, true) / 8))
    );
  }
  async function speak(text, voice) {
    speakBtn.disabled = true;
    const entry = addEntry({ kind: "tts", voice, pending: true, text });
    const t0 = performance.now();
    try {
      const r = await fetch(base + "/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + cfg.apiKey,
          "Content-Type": "application/json",
        },
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
          msg += " · " + ((await r.json()).error?.message || "").slice(0, 200);
        } catch {}
        updateEntry(entry, { error: msg, latency });
        return;
      }
      const buf = await r.arrayBuffer();
      const audio = new Blob([buf], { type: "audio/wav" });
      updateEntry(entry, { audio, seconds: wavSeconds(buf), latency, text });
      const a = new Audio(URL.createObjectURL(audio));
      a.onended = () => URL.revokeObjectURL(a.src);
      a.play().catch(() => {});
    } catch (e) {
      updateEntry(entry, { error: "Request failed: " + (e.message || e) });
    } finally {
      speakBtn.disabled = false;
    }
  }
  $("ttsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = ttsText.value.trim();
    if (t) speak(t, voiceSel.value || "default");
  });
  $("clone").onclick = async () => {
    const last = [...history]
      .reverse()
      .find((e) => e.kind !== "tts" && e.audio && e.text && !e.error);
    const name = ($("cloneName").value || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "-");
    if (!last) {
      addEntry({
        kind: "tts",
        error:
          "Record something first (push to talk, 3–30 s, with a good transcript) — the clone uses your last recording.",
      });
      return;
    }
    if (!name) {
      $("cloneName").focus();
      $("cloneName").placeholder = "name required";
      return;
    }
    if (last.seconds < 3 || last.seconds > 30) {
      addEntry({
        kind: "tts",
        error: `Last recording is ${last.seconds.toFixed(1)} s; a reference needs 3–30 s.`,
      });
      return;
    }
    const form = new FormData();
    form.append("name", name);
    form.append("consent", "true");
    form.append("audio_sample", last.audio, "reference.wav");
    form.append("ref_text", last.text);
    const entry = addEntry({
      kind: "tts",
      voice: name,
      pending: true,
      text: `cloning voice "${name}" from your ${last.seconds.toFixed(1)} s recording…`,
    });
    try {
      const r = await fetch(base + "/s2pro/voices", {
        method: "POST",
        body: form,
      });
      if (!r.ok) {
        updateEntry(entry, { error: `clone failed · HTTP ${r.status}` });
        return;
      }
      updateEntry(entry, {
        text: `voice "${name}" ready — selected. Press Speak to hear yourself.`,
      });
      await loadVoices();
      voiceSel.value = name;
    } catch (e) {
      updateEntry(entry, { error: "clone failed: " + (e.message || e) });
    }
  };

  // ================================================================ files
  const fmtClock = (sec) => {
    const h = Math.floor(sec / 3600),
      m = Math.floor((sec % 3600) / 60),
      s = Math.floor(sec % 60);
    return (
      (h ? `${h}:` : "") +
      `${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`
    );
  };
  let job = null;
  function renderSeg(c, showSpeaker = false) {
    const li = c.el || document.createElement("li");
    li.className =
      "seg" + (c.error ? " error" : c.text == null ? " pending" : "");
    li.innerHTML = `<time>${fmtClock(c.start)} – ${fmtClock(c.end)}</time><div><div class="seg-text"></div></div>`;
    const tx = li.querySelector(".seg-text");
    if (showSpeaker && c.speaker) {
      const b = document.createElement("span");
      b.className = "spk";
      b.textContent = c.speaker;
      tx.appendChild(b);
    }
    tx.appendChild(
      document.createTextNode(
        c.error || (c.text == null ? "queued…" : c.text || "(silence)"),
      ),
    );
    if (c.raw) {
      const o = document.createElement("div");
      o.className = "orig";
      o.textContent = "before cleanup: " + c.raw;
      tx.parentElement.appendChild(o);
    }
    if (c.original) {
      const o = document.createElement("div");
      o.className = "orig";
      o.textContent = "native script: " + c.original;
      tx.parentElement.appendChild(o);
    }
    return li;
  }
  const statsOf = (key, id, extra) => {
    const j = job;
    if (!j || !j[key]) return;
    const S = j[key],
      el = ((S.t1 || performance.now()) - j.t0) / 1000;
    $(id).textContent = S.done
      ? `${fmtClock(j.duration)} · ${S.phase}${extra ? extra(S) : ""}`
      : `${el.toFixed(0)} s · ${S.phase}`;
  };
  const localStats = () => statsOf("local", "statsLocal"),
    whistleStats = () => statsOf("whistle", "statsWhistle"),
    indicStats = () =>
      statsOf("indic", "statsIndic", (I) =>
        I.lang ? " · lang " + I.lang : "",
      );
  function cloudStats(text) {
    const j = job;
    if (!j || !j.cloud) return;
    const C = j.cloud,
      el = ((C.t1 || performance.now()) - j.t0) / 1000;
    $("statsCloud").textContent =
      text || `${el.toFixed(0)} s` + (C.phase ? ` · ${C.phase}` : "");
    $("barCloud").style.width = C.done
      ? "100%"
      : C.phase === "uploading"
        ? "15%"
        : "55%";
  }
  async function romanizeText(text) {
    return (await correctText(text, null, { signal: job.abort.signal })).text;
  }
  async function runPool(items, limit, fn) {
    let next = 0;
    const worker = async () => {
      while (next < items.length && !job.abort.signal.aborted)
        await fn(items[next++]);
    };
    await Promise.all(
      Array.from({ length: Math.min(limit, items.length) }, worker),
    );
  }
  async function postProcessRows(rows, S, stats) {
    if ($("romanize").checked) {
      const todo = rows.filter((r) => r.text && INDIC_RE.test(r.text));
      if (todo.length) {
        S.phase = `romanizing ${todo.length}`;
        stats();
        await runPool(todo, 2, async (r) => {
          try {
            const out = await romanizeText(r.text);
            if (out) {
              r.original = r.text;
              r.text = out;
            }
          } catch {}
        });
        S.t1 = performance.now();
      }
    }
    if ($("cleanup").checked && rows.length) {
      S.phase = "glossary cleanup";
      stats();
      const idx = rows.map((r, k) => (r.text ? k : -1)).filter((k) => k >= 0);
      const fixed = await cleanupLines(
        idx.map((k) => rows[k].text),
        job.abort.signal,
      );
      idx.forEach((k, n) => {
        if (fixed[n] && fixed[n] !== rows[k].text) {
          rows[k].raw = rows[k].text;
          rows[k].text = fixed[n];
        }
      });
      S.t1 = performance.now();
    }
  }
  async function runLocal(file) {
    if (useServer()) return runViaServer("local", file);
    const L = job.local;
    $("resLocal").hidden = false;
    $("segments").innerHTML = "";
    $("barLocal").style.width = "15%";
    L.phase = "uploading";
    localStats();
    const tick = setInterval(() => {
      if (L.phase === "uploading" && performance.now() - job.t0 > 3000) {
        L.phase = "diarizing + transcribing";
        $("barLocal").style.width = "55%";
      }
      localStats();
    }, 1000);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("model", cfg.diarizedModel || "qwen3-asr-diarized");
      form.append("response_format", "verbose_json");
      const lang = $("lang").value;
      if (lang) form.append("language", lang);
      const n = Number($("maxSpeakers").value);
      if (n >= 1) form.append("max_speakers", String(n));
      const c = asrContextPrompt();
      if (c) form.append("prompt", c);
      const r = await fetch(base + "/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: "Bearer " + cfg.apiKey },
        body: form,
        signal: job.abort.signal,
      });
      if (!r.ok) {
        let msg = `HTTP ${r.status}`;
        try {
          msg += " · " + ((await r.json()).error?.message || "").slice(0, 160);
        } catch {}
        throw new Error(msg);
      }
      const d = await r.json();
      L.t1 = performance.now();
      L.done = true;
      const segs = d.segments || [];
      job.duration = d.duration || job.duration;
      const ids = [...new Set(segs.map((x) => x.speaker))],
        names = Object.fromEntries(
          ids.map((id, i) => [id, `Speaker ${i + 1}`]),
        );
      L.chunks = segs.map((x, i) => ({
        i,
        start: x.start,
        end: x.end,
        text: x.text,
        speaker: names[x.speaker],
        error: x.error,
      }));
      await postProcessRows(L.chunks, L, localStats);
      for (const ch of L.chunks) {
        ch.el = renderSeg(ch, ids.length > 1);
        $("segments").appendChild(ch.el);
      }
      const secs = (L.t1 - job.t0) / 1000;
      L.phase = `${ids.length} speaker${ids.length === 1 ? "" : "s"} · ${secs.toFixed(0)} s · ${(job.duration / secs).toFixed(0)}× realtime · done`;
      $("barLocal").style.width = "100%";
    } finally {
      clearInterval(tick);
    }
    localStats();
  }
  async function runCloud(file) {
    const C = job.cloud;
    $("resCloud").hidden = false;
    $("cloudSegments").innerHTML = "";
    C.phase = "uploading";
    cloudStats();
    const tick = setInterval(() => {
      if (C.phase === "uploading" && performance.now() - job.t0 > 3000)
        C.phase = "transcribing";
      cloudStats();
    }, 1000);
    try {
      const res = await scribeRequest(file, file.name, {
        diarize: true,
        signal: job.abort.signal,
      });
      C.t1 = performance.now();
      C.done = true;
      const secs = (C.t1 - job.t0) / 1000,
        dur = res.turns.length
          ? res.turns[res.turns.length - 1].end
          : job.duration;
      C.turns = res.turns;
      C.speakers = res.speakers;
      C.text = res.text;
      const names = Object.fromEntries(
        res.speakers.map((id, i) => [id, `Speaker ${i + 1}`]),
      );
      if ($("cleanup").checked) {
        C.phase = "glossary cleanup";
        cloudStats();
        const fixed = await cleanupLines(
          res.turns.map((t) => t.text),
          job.abort.signal,
        );
        res.turns.forEach((t, n) => {
          if (fixed[n] && fixed[n] !== t.text) {
            t.raw = t.text;
            t.text = fixed[n];
          }
        });
        C.t1 = performance.now();
      }
      for (const t of res.turns)
        $("cloudSegments").appendChild(
          renderSeg(
            {
              ...t,
              speaker: res.speakers.length > 1 ? names[t.speaker] : null,
            },
            res.speakers.length > 1,
          ),
        );
      cloudStats(
        `${fmtClock(dur)} · ${res.speakers.length} speaker${res.speakers.length === 1 ? "" : "s"} · lang ${res.lang || "?"} · ${secs.toFixed(0)} s · ${(dur / secs).toFixed(0)}× realtime · done`,
      );
    } catch (e) {
      C.t1 = performance.now();
      cloudStats(
        job.abort.signal.aborted ? "cancelled" : "failed: " + (e.message || e),
      );
    } finally {
      clearInterval(tick);
    }
  }
  async function decodeFile(file) {
    const audio = await new OfflineAudioContext(
      1,
      1,
      SAMPLE_RATE,
    ).decodeAudioData(await file.arrayBuffer());
    const n = audio.length,
      mono = new Float32Array(n);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const d = audio.getChannelData(c);
      for (let i = 0; i < n; i++) mono[i] += d[i] / audio.numberOfChannels;
    }
    return mono;
  }
  async function runWhistle(file) {
    if (useServer()) return runViaServer("whistle", file);
    const W = job.whistle;
    $("resWhistle").hidden = false;
    $("whistleSegments").innerHTML = "";
    $("barWhistle").style.width = "10%";
    W.phase = "decoding";
    whistleStats();
    const tick = setInterval(whistleStats, 1000);
    try {
      whistleStart();
      const pcm = await decodeFile(file);
      if (job.abort.signal.aborted) return;
      job.duration = job.duration || pcm.length / SAMPLE_RATE;
      W.phase = whistle.ready ? "transcribing" : "loading model";
      $("barWhistle").style.width = "40%";
      whistleStats();
      const res = await whistleTranscribe(pcm);
      W.t1 = performance.now();
      W.done = true;
      const rows = [];
      let cur = null;
      for (const w of res.words || []) {
        if (!cur || w.start - cur.end > 0.8 || cur.text.length > 220) {
          cur = { start: w.start, end: w.end, text: w.word };
          rows.push(cur);
        } else {
          cur.text += " " + w.word;
          cur.end = w.end;
        }
      }
      if (!rows.length && res.text)
        rows.push({ start: 0, end: job.duration, text: res.text });
      await postProcessRows(rows, W, whistleStats);
      W.rows = rows;
      for (const r of rows) $("whistleSegments").appendChild(renderSeg(r));
      const secs = (W.t1 - job.t0) / 1000,
        engineSecs = res.ms / 1000;
      W.phase = `${res.chunks} passes · engine ${engineSecs.toFixed(1)} s (${(job.duration / engineSecs).toFixed(0)}× realtime) · ${secs.toFixed(0)} s total · done`;
      $("barWhistle").style.width = "100%";
    } catch (e) {
      W.t1 = performance.now();
      W.phase = "failed: " + (e.message || e);
    } finally {
      clearInterval(tick);
    }
    whistleStats();
  }
  async function runIndic(file) {
    if (useServer()) return runViaServer("indic", file);
    const I = job.indic;
    $("resIndic").hidden = false;
    $("indicSegments").innerHTML = "";
    $("barIndic").style.width = "10%";
    I.phase = "decoding";
    indicStats();
    const tick = setInterval(indicStats, 1000);
    try {
      const pcm = await decodeFile(file);
      if (job.abort.signal.aborted) return;
      job.duration = job.duration || pcm.length / SAMPLE_RATE;
      I.phase = `transcribing (${indicLang()})`;
      $("barIndic").style.width = "40%";
      indicStats();
      const res = await indicRequest(toWav(pcm), "file.wav", job.abort.signal);
      I.t1 = performance.now();
      I.done = true;
      I.lang = lidLabel(res);
      const rows = (res.segments || []).map((x) => ({
        start: x.start,
        end: x.end,
        text: x.text,
      }));
      await postProcessRows(rows, I, indicStats);
      I.rows = rows;
      for (const r of rows) $("indicSegments").appendChild(renderSeg(r));
      const secs = (I.t1 - job.t0) / 1000,
        eng = res.timings?.total_s ?? secs;
      I.phase = `${rows.length} pieces · engine ${eng.toFixed(1)} s (${(job.duration / eng).toFixed(0)}× realtime) · ${secs.toFixed(0)} s total · done`;
      $("barIndic").style.width = "100%";
    } catch (e) {
      I.t1 = performance.now();
      I.phase = "failed: " + (e.message || e);
    } finally {
      clearInterval(tick);
    }
    indicStats();
  }
  async function processFile(file) {
    if (job) job.abort.abort();
    const engines = filesEngines();
    if (!engines.length) {
      alert("Pick at least one engine.");
      return;
    }
    job = {
      file,
      t0: performance.now(),
      abort: new AbortController(),
      duration: 0,
      local: engines.includes("local") ? { chunks: [], phase: "" } : null,
      cloud: engines.includes("scribe") ? { phase: "" } : null,
      whistle: engines.includes("whistle") ? { phase: "" } : null,
      indic: engines.includes("indic") ? { phase: "" } : null,
    };
    $("job").hidden = false;
    $("jobName").textContent =
      `${file.name} · ${(file.size / 1048576).toFixed(1)} MB`;
    for (const id of ["resLocal", "resCloud", "resWhistle", "resIndic"])
      $(id).hidden = true;
    $("results").className =
      "card-body results " +
      (["", "", "two", "three", "four"][engines.length] || "four");
    const tasks = [];
    if (job.indic) tasks.push(runIndic(file));
    if (job.whistle) tasks.push(runWhistle(file));
    if (job.cloud) tasks.push(runCloud(file));
    if (job.local)
      tasks.push(
        runLocal(file).catch((e) => {
          job.local.phase = /decod|Unable/i.test(e.message || "")
            ? "failed: the browser cannot decode this file's audio"
            : "failed: " + (e.message || e);
          localStats();
        }),
      );
    await Promise.all(tasks);
  }
  function transcriptText(which = "all") {
    if (!job) return "";
    const out = [
      `# ${job.file.name} — transcribed ${new Date().toLocaleString()}`,
    ];
    if (job.local && ["local", "all"].includes(which)) {
      out.push(
        "",
        `## Spark · Qwen3-ASR + Nemotron-3 diarization (${$("statsLocal").textContent})`,
        "",
      );
      out.push(
        ...job.local.chunks.map(
          (c) =>
            `[${fmtClock(c.start)}] ${c.speaker ? c.speaker + ": " : ""}${c.error ? `(error: ${c.error})` : c.text || ""}`,
        ),
      );
    }
    if (job.indic?.rows && ["indic", "all"].includes(which)) {
      out.push(
        "",
        `## IndicConformer-600M (${$("statsIndic").textContent})`,
        "",
      );
      out.push(
        ...job.indic.rows.map((r) => `[${fmtClock(r.start)}] ${r.text}`),
      );
    }
    if (job.whistle?.rows && ["whistle", "all"].includes(which)) {
      out.push("", `## Whistle (${$("statsWhistle").textContent})`, "");
      out.push(
        ...job.whistle.rows.map((r) => `[${fmtClock(r.start)}] ${r.text}`),
      );
    }
    if (job.cloud?.turns && ["cloud", "all"].includes(which)) {
      const names = Object.fromEntries(
        (job.cloud.speakers || []).map((id, i) => [id, `Speaker ${i + 1}`]),
      );
      out.push(
        "",
        `## ElevenLabs Scribe v2 (${$("statsCloud").textContent})`,
        "",
      );
      out.push(
        ...job.cloud.turns.map(
          (t) =>
            `[${fmtClock(t.start)}] ${(job.cloud.speakers || []).length > 1 ? names[t.speaker] + ": " : ""}${t.text}`,
        ),
      );
    }
    return out.join("\n");
  }
  async function copyTranscript(which, btn) {
    const label = btn.textContent;
    try {
      await navigator.clipboard.writeText(transcriptText(which));
      btn.textContent = "Copied";
    } catch {
      btn.textContent = "Copy failed";
    }
    setTimeout(() => {
      btn.textContent = label;
    }, 1500);
  }
  function downloadTranscript(which) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([transcriptText(which)], { type: "text/plain" }),
    );
    const stem = (job?.file.name || "transcript").replace(/\.[^.]+$/, ""),
      tag =
        {
          local: "spark-qwen3asr-nemotron",
          cloud: "cloud-scribe",
          whistle: "browser-whistle",
          indic: "indic-conformer",
        }[which] || "all";
    a.download = `${stem}.${tag}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  document.querySelectorAll("[data-copy]").forEach((b) => {
    b.onclick = () => copyTranscript(b.dataset.copy, b);
  });
  document.querySelectorAll("[data-download]").forEach((b) => {
    b.onclick = () => downloadTranscript(b.dataset.download);
  });
  const drop = $("drop"),
    fileInput = $("fileInput");
  $("pick").onclick = () => fileInput.click();
  fileInput.onchange = () => {
    if (fileInput.files[0]) processFile(fileInput.files[0]);
    fileInput.value = "";
  };
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  });
  $("cancelJob").onclick = () => {
    if (!job) return;
    job.abort.abort();
    if (job.local) {
      job.local.phase = "cancelled";
      localStats();
    }
    if (job.cloud) cloudStats("cancelled");
    if (job.whistle) {
      job.whistle.phase = "cancelled";
      whistleStats();
    }
    if (job.indic) {
      job.indic.phase = "cancelled";
      indicStats();
    }
  };
  $("copyAll").onclick = () => copyTranscript("all", $("copyAll"));
  $("downloadTxt").onclick = () => downloadTranscript("all");

  // ================================================================ boot
  restore();
  setEngine(engine);
  setMode(store.get("voice-bench-mode", "live"));
  showView(
    views.includes(store.get("voice-bench-view", "live"))
      ? store.get("voice-bench-view", "live")
      : "live",
  );
  loadVoices();
  checkIndic();
  checkGateway();
  $("viaNeurolink").checked = useServer();
  $("viaNeurolink").disabled = !nlBase;
  $("viaNeurolink").addEventListener("change", () => {
    if (live.on) liveStop();
    viaServer = $("viaNeurolink").checked;
    store.set("voice-bench-via-neurolink", viaServer);
    transportChanged();
  });
  checkBackend().then((ok) => {
    backendOk = ok;
    speakBtn.disabled = !ok;
    transportChanged();
    if (engine === "whistle" && !useServer()) whistleStart();
  });
})();

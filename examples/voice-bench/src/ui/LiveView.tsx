import {
  Box,
  Button,
  ButtonBase,
  Collapse,
  IconButton,
  SwipeableDrawer,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import DeleteSweepRounded from "@mui/icons-material/DeleteSweepRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ENGINE_LABEL,
  fmtTime,
  langName,
  LIVE_LABEL,
  ROUTE_LABEL,
} from "../engine/config";
import { docClear, docPlainText, registerDoc, storySteps } from "../engine/doc";
import { clearCards, playBlob } from "../engine/feed";
import {
  micEnabled,
  pressCancel,
  pressDown,
  pressUp,
  setMode,
} from "../engine/live";
import { getState, setState, useBench } from "../engine/store";
import type { Entry } from "../engine/types";
import { NeuroMark } from "../fx/NeuroMark";
import { OrbitWords } from "../fx/OrbitWords";
import { Waveform } from "../fx/Waveform";
import { showView } from "./AppShell";
import { Badge, CopyButton, EngineTag, Surface } from "./common";

// ------------------------------------------------------------------ toolbar
// Routing is the server's job: the bar only says what it is set to and links to the overrides.
function RoutingChip() {
  const route = useBench((s) => s.route);
  const lang = useBench((s) => s.lang);
  const { vb } = useTheme();
  const phone = useMediaQuery("(max-width: 599.95px)");
  const engine =
    route === "auto"
      ? phone
        ? "Auto"
        : "Auto engine"
      : phone
        ? ROUTE_LABEL[route].split(" ·")[0]
        : ROUTE_LABEL[route];
  const language = lang ? langName(lang) : phone ? "" : "Auto language";
  return (
    <Tooltip title="Engine and language are picked per utterance. Override in Settings.">
      <ButtonBase
        onClick={() => showView("settings")}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          height: 34,
          px: 1.5,
          borderRadius: 999,
          border: `1px solid ${vb.line}`,
          bgcolor: vb.surface,
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: "text.primary",
          maxWidth: "100%",
          "&:hover": { borderColor: vb.lineStrong },
        }}
      >
        <AutoAwesomeRounded
          sx={{
            fontSize: 16,
            color: route === "auto" && !lang ? vb.accent : "text.secondary",
          }}
        />
        <Box
          component="span"
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {engine}
          {language && (
            <Box
              component="span"
              sx={{ color: "text.secondary", fontWeight: 500 }}
            >
              {" · "}
              {language}
            </Box>
          )}
        </Box>
      </ButtonBase>
    </Tooltip>
  );
}

function LiveToolbar() {
  const mode = useBench((s) => s.mode);
  const route = useBench((s) => s.route);
  const narrow = useMediaQuery("(max-width: 1100px)");
  const phone = useMediaQuery("(max-width: 599.95px)");
  const { vb } = useTheme();
  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, md: 1.25 },
        px: { xs: 2, md: 3 },
        py: { xs: 1.25, md: 1.5 },
        borderBottom: `1px solid ${vb.line}`,
        bgcolor: alpha(vb.surface, 0.7),
        backdropFilter: "blur(14px) saturate(1.2)",
        position: "relative",
        zIndex: 2,
        minWidth: 0,
      }}
    >
      <ToggleButtonGroup
        exclusive
        value={mode}
        onChange={(_e, v: "live" | "ptt" | null) => v && setMode(v)}
        aria-label="Capture mode"
        size="small"
        sx={{ flex: "none" }}
      >
        <ToggleButton value="live" disabled={route === "scribe"}>
          Live
        </ToggleButton>
        <ToggleButton value="ptt">
          {phone ? "Hold" : "Push to talk"}
        </ToggleButton>
      </ToggleButtonGroup>
      <Box sx={{ flex: "none", display: "flex" }}>
        <RoutingChip />
      </Box>
      <Box sx={{ flex: 1 }} />
      <CopyButton
        iconOnly
        label="Copy transcript"
        getText={() =>
          getState().mode === "live"
            ? docPlainText()
            : getState()
                .entries.filter((e) => e.text && e.kind !== "tts")
                .map((e) => `[${fmtTime(e.at)}] ${e.text}`)
                .join("\n")
        }
      />
      <Tooltip title="Clear transcript, cards and decisions">
        <IconButton
          size="small"
          aria-label="Clear"
          onClick={() => {
            clearCards();
            docClear();
            setState({ decisionIds: [] });
          }}
        >
          <DeleteSweepRounded fontSize="small" />
        </IconButton>
      </Tooltip>
      {narrow && (
        <Tooltip title="Decisions">
          <IconButton
            size="small"
            aria-label="Show decisions"
            onClick={() => setState({ panelOpen: true })}
          >
            <FactCheckRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

// ------------------------------------------------------------------ transcript document
function Hero() {
  const capture = useBench((s) => s.capture);
  const on = capture === "live";
  const small = useMediaQuery("(max-width: 599.95px), (max-height: 760px)");
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
        p: 2,
      }}
    >
      <Box
        sx={{
          display: "grid",
          justifyItems: "center",
          gap: { xs: 1.5, md: 2.5 },
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: small ? 300 : 460,
            height: small ? 220 : 260,
            display: "grid",
            placeItems: "center",
          }}
        >
          <OrbitWords clear={(small ? 190 : 270) * 0.33 + 28} />
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <NeuroMark
              size={small ? 190 : 270}
              disc={false}
              reactive
              state={on ? "live" : "idle"}
              glyph="brain"
            />
          </Box>
        </Box>
        <Typography
          sx={{
            fontFamily: (t) => t.typography.h1.fontFamily,
            fontWeight: 800,
            fontSize: { xs: "1.5rem", md: "2rem" },
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
          }}
        >
          {on ? "Listening. Go ahead." : "Speak in any language."}
        </Typography>
        <Typography
          sx={{
            color: "text.secondary",
            maxWidth: "44ch",
            fontSize: { xs: "0.9rem", md: "0.975rem" },
            display: small ? "none" : "block",
          }}
        >
          Words appear as they are recognised; each sentence is corrected in
          place when you pause.
        </Typography>
      </Box>
    </Box>
  );
}

function DocStatusLine() {
  const st = useBench((s) => s.docStatus);
  return (
    <Typography
      component="span"
      sx={{
        fontSize: "0.8125rem",
        color: "text.secondary",
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      className="tabular"
    >
      {"plain" in st ? (
        st.plain
      ) : (
        <>
          <Box component="b" sx={{ color: "text.primary", fontWeight: 600 }}>
            {st.engine}
          </Box>
          {st.rest ? ` · ${st.rest}` : ""}
        </>
      )}
    </Typography>
  );
}

function TranscriptDoc() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(true);
  const capture = useBench((s) => s.capture);
  const liveEngine = useBench((s) => s.liveEngine);
  const route = useBench((s) => s.route);
  const { vb } = useTheme();
  // The editable document's children are created here, not rendered by React: the user can edit
  // them, and a reconciler that finds its nodes gone throws and blanks the whole page.
  useEffect(() => {
    const body = bodyRef.current!;
    const make = (cls?: string) => {
      const el = document.createElement("span");
      if (cls) el.className = cls;
      return el;
    };
    const handle = {
      text: make(),
      tail: make("vb-tail"),
      body,
      setEmpty,
      rebuild: () => {},
    };
    handle.rebuild = () => {
      handle.text = make();
      handle.tail = make("vb-tail");
      body.replaceChildren(handle.text, handle.tail, make("vb-caret"));
    };
    handle.rebuild();
    registerDoc(handle);
    return () => registerDoc(null);
  }, []);
  return (
    <Surface
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: { xs: 2, md: 2.5 },
          py: 1.25,
          borderBottom: `1px solid ${vb.line}`,
        }}
      >
        {route !== "auto" && (
          <EngineTag engine={liveEngine}>
            {LIVE_LABEL[liveEngine] ?? ENGINE_LABEL[liveEngine]}
          </EngineTag>
        )}
        {capture === "live" && <Badge tone="busy">live</Badge>}
        <DocStatusLine />
      </Box>
      <Box sx={{ position: "relative", flex: 1, minHeight: 0 }}>
        {empty && <Hero />}
        <Box
          ref={bodyRef}
          className={"vb-doc" + (capture === "live" ? " is-live" : "")}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          aria-label="Live transcript"
          onInput={(e) => setEmpty(!(e.currentTarget.textContent ?? "").trim())}
          sx={{
            position: "absolute",
            inset: 0,
            overflowY: "auto",
            px: { xs: 2.25, md: 4 },
            py: { xs: 2, md: 3.5 },
            fontSize: { xs: "1.2rem", md: "1.5rem" },
            lineHeight: 1.6,
            fontWeight: 400,
            letterSpacing: "-0.005em",
          }}
        />
      </Box>
    </Surface>
  );
}

/** Every finished sentence in each output language, one tab per language. */
function OutputsPanel() {
  const langs = useBench((s) => s.outputLangs);
  const entries = useBench((s) => s.entries);
  const [picked, setPicked] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { vb } = useTheme();
  const active = picked && langs.includes(picked) ? picked : langs[0];
  const lines = entries
    .filter((e) => e.kind !== "tts" && e.outputs?.[active ?? ""])
    .map((e) => ({ id: e.id, out: e.outputs![active!] }));
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [lines.length, active]);
  if (!langs.length || !active) return null;
  return (
    <Surface
      sx={{ flex: "none", boxShadow: "none", px: { xs: 2, md: 2.5 }, py: 1.25 }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          mb: 1,
        }}
      >
        <Typography sx={{ fontWeight: 650, fontSize: "0.875rem", mr: 1 }}>
          Output languages
        </Typography>
        {langs.map((l) => (
          <ButtonBase
            key={l}
            onClick={() => setPicked(l)}
            aria-pressed={l === active}
            sx={{
              px: 1.25,
              py: 0.25,
              borderRadius: "999px",
              fontSize: "0.8125rem",
              fontWeight: l === active ? 650 : 500,
              color: l === active ? vb.accentInk : "text.secondary",
              border: "1px solid",
              borderColor: l === active ? vb.accentInk : "divider",
            }}
          >
            {l}
          </ButtonBase>
        ))}
        {lines.length > 0 && (
          <Box sx={{ ml: "auto" }}>
            <CopyButton
              getText={() =>
                lines
                  .map((x) => x.out.text)
                  .filter(Boolean)
                  .join("\n")
              }
            />
          </Box>
        )}
      </Box>
      <Box
        sx={{ maxHeight: 180, overflowY: "auto", display: "grid", gap: 0.5 }}
      >
        {lines.length === 0 ? (
          <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
            Sentences appear here in {active} once they are corrected.
          </Typography>
        ) : (
          lines.map((x) => (
            <Typography
              key={x.id}
              sx={{
                fontSize: "0.9375rem",
                lineHeight: 1.55,
                overflowWrap: "anywhere",
                color: x.out.text ? "text.primary" : "text.secondary",
                fontStyle: x.out.text ? "normal" : "italic",
              }}
            >
              {x.out.text || `(${x.out.status})`}
            </Typography>
          ))
        )}
        <div ref={endRef} />
      </Box>
    </Surface>
  );
}

function RawStrip() {
  const rows = useBench((s) => s.rawRows);
  const [open, setOpen] = useState(
    () => !window.matchMedia("(max-width: 599.95px)").matches,
  );
  const endRef = useRef<HTMLDivElement>(null);
  const { vb } = useTheme();
  // block body on purpose: newer Chrome's scrollIntoView returns a Promise, and an effect's return
  // value is called as its cleanup ("is not a function" on the next update)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [rows]);
  return (
    <Surface sx={{ flex: "none", boxShadow: "none" }}>
      <ButtonBase
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        sx={{
          width: "100%",
          justifyContent: "flex-start",
          gap: 1,
          px: { xs: 2, md: 2.5 },
          py: 1.25,
          borderRadius: "16px",
          textAlign: "left",
          flexWrap: "wrap",
        }}
      >
        <ExpandMoreRounded
          fontSize="small"
          sx={{
            color: "text.secondary",
            transform: open ? "none" : "rotate(-90deg)",
            transition: "transform 200ms",
          }}
        />
        <Typography sx={{ fontWeight: 650, fontSize: "0.875rem" }}>
          Before correction
        </Typography>
        <Typography
          sx={{
            fontSize: "0.8125rem",
            color: "text.secondary",
            display: { xs: "none", sm: "block" },
          }}
        >
          raw engine text per sentence, and what changed
        </Typography>
        {rows.length > 0 && (
          <Box
            component="span"
            className="tabular"
            sx={{ ml: "auto", fontSize: "0.75rem", color: "text.secondary" }}
          >
            {rows.length} {rows.length === 1 ? "sentence" : "sentences"}
          </Box>
        )}
      </ButtonBase>
      <Collapse in={open}>
        <Box
          sx={{
            maxHeight: { xs: "22vh", md: "24vh" },
            overflowY: "auto",
            px: { xs: 2, md: 2.5 },
            pb: 1.5,
            borderTop: rows.length ? `1px solid ${vb.line}` : "none",
          }}
        >
          {!rows.length ? (
            <Typography
              sx={{ fontSize: "0.8125rem", color: "text.secondary", pb: 0.5 }}
            >
              Each finished sentence lands here with the engine's raw text, its
              language and every change the corrector made.
            </Typography>
          ) : (
            <Box
              component="ol"
              sx={{ m: 0, p: 0, listStyle: "none", display: "grid" }}
            >
              {rows.map((r, i) => (
                <Box
                  component="li"
                  key={r.key}
                  className="vb-rise"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr",
                    gap: 1,
                    py: 1.1,
                    borderBottom:
                      i < rows.length - 1 ? `1px dashed ${vb.line}` : "none",
                  }}
                >
                  <Typography
                    className="tabular"
                    sx={{
                      fontSize: "0.75rem",
                      color: "text.secondary",
                      pt: "2px",
                    }}
                  >
                    {i + 1}
                  </Typography>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: "0.9rem",
                        lineHeight: 1.55,
                        overflowWrap: "anywhere",
                        color: "text.secondary",
                      }}
                    >
                      {r.raw}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.5,
                        mt: 0.6,
                      }}
                    >
                      {r.badges.map(([tone, text], k) => (
                        <Badge key={k} tone={tone}>
                          {text}
                        </Badge>
                      ))}
                    </Box>
                  </Box>
                </Box>
              ))}
              <div ref={endRef} />
            </Box>
          )}
        </Box>
      </Collapse>
    </Surface>
  );
}

// ------------------------------------------------------------------ push-to-talk feed
export function EntryCard({ entry }: { entry: Entry }) {
  const { vb } = useTheme();
  const rtf =
    entry.seconds && entry.latency != null
      ? entry.latency / 1000 / entry.seconds
      : null;
  const meta: ReactNode[] = [<span key="t">{fmtTime(entry.at)}</span>];
  if (entry.ttft != null)
    meta.push(
      <span key="ttft">{Math.round(entry.ttft)} ms to first token</span>,
    );
  if (entry.lang) meta.push(<span key="l">lang {entry.lang}</span>);
  if (entry.seconds != null)
    meta.push(<span key="s">{entry.seconds.toFixed(1)} s audio</span>);
  if (entry.latency != null)
    meta.push(
      <span key="lat">
        {entry.latency} ms
        {rtf
          ? entry.kind === "tts"
            ? ` · RTF ${rtf.toFixed(2)}`
            : ` · ${(1 / rtf).toFixed(0)}× realtime`
          : ""}
      </span>,
    );
  const text = entry.pending
    ? entry.kind === "tts"
      ? "speaking…"
      : "transcribing…"
    : entry.correcting
      ? entry.text
      : entry.error ||
        entry.text ||
        (entry.silent ? "(nothing recognized — audio kept, press play)" : "");
  return (
    <Surface
      className="vb-rise"
      sx={{
        p: { xs: 1.75, md: 2 },
        display: "grid",
        gap: 1,
        boxShadow: "none",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "4px 12px",
          fontSize: "0.75rem",
          color: "text.secondary",
        }}
        className="tabular"
      >
        <Typography
          component="span"
          sx={{
            fontWeight: 650,
            fontSize: "0.8125rem",
            color: entry.kind === "tts" ? vb.accentInk : "text.primary",
          }}
        >
          {entry.kind === "tts" ? `TTS · ${entry.voice || "default"}` : "You"}
        </Typography>
        {entry.engine && (
          <EngineTag engine={entry.engine}>
            {ENGINE_LABEL[entry.engine]}
          </EngineTag>
        )}
        {meta}
        {entry.live && (
          <Badge tone={entry.liveFinal ? "" : "busy"}>
            {entry.liveFinal ? "live" : "live · listening"}
          </Badge>
        )}
        {entry.cleanupMs != null && (
          <Box component="span" sx={{ color: vb.accentInk }}>
            {entry.raw && entry.raw !== entry.text ? "corrected" : "checked"}
            {storySteps(entry.correctSteps)
              ? " · " + storySteps(entry.correctSteps)
              : ""}
          </Box>
        )}
        {entry.correctError && (
          <Box component="span" sx={{ color: vb.rec }}>
            correction failed · {entry.correctError}
          </Box>
        )}
        {entry.audio && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PlayArrowRounded />}
            onClick={() => playBlob(entry.audio!)}
            sx={{ ml: "auto", minHeight: 26, py: 0 }}
          >
            Play
          </Button>
        )}
      </Box>
      <Typography
        className={entry.pending || entry.correcting ? "vb-busy" : undefined}
        sx={{
          fontSize: entry.error ? "0.9rem" : "1.0625rem",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          color: entry.error
            ? vb.rec
            : entry.pending
              ? "text.secondary"
              : "text.primary",
          fontStyle: entry.pending ? "italic" : "normal",
        }}
      >
        {entry.live && !entry.liveFinal && !entry.error ? (
          <>
            {entry.committed}
            <Box component="span" sx={{ color: "text.secondary" }}>
              {(entry.committed ? " " : "") +
                (entry.tail || (entry.committed ? "" : "listening…"))}
            </Box>
          </>
        ) : (
          text
        )}
        {entry.correcting && (
          <Box
            component="span"
            sx={{
              display: "block",
              fontSize: "0.8125rem",
              color: "text.secondary",
              mt: 0.5,
            }}
          >
            correcting…
          </Box>
        )}
      </Typography>
      {entry.raw && entry.raw !== entry.text && (
        <Typography
          sx={{
            fontSize: "0.8125rem",
            color: "text.secondary",
            overflowWrap: "anywhere",
          }}
        >
          <Box component="b" sx={{ fontWeight: 600, mr: 0.75 }}>
            Before correction
          </Box>
          {entry.raw}
        </Typography>
      )}
      {Object.entries(entry.outputs ?? {}).map(([tag, o]) => (
        <Typography
          key={tag}
          sx={{ fontSize: "0.9375rem", overflowWrap: "anywhere" }}
        >
          <Box
            component="b"
            sx={{ fontWeight: 600, mr: 0.75, color: vb.accentInk }}
          >
            {tag}
          </Box>
          {o.text || (
            <Box
              component="span"
              sx={{ color: "text.secondary", fontStyle: "italic" }}
            >
              ({o.status})
            </Box>
          )}
        </Typography>
      ))}
    </Surface>
  );
}

function PttFeed() {
  const entries = useBench((s) => s.entries);
  const shown = entries.filter((e) => e.kind !== "tts");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [shown.length]);
  if (!shown.length)
    return (
      <Surface
        sx={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          p: 3,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "grid",
            justifyItems: "center",
            gap: 2,
            textAlign: "center",
            maxWidth: 440,
          }}
        >
          <NeuroMark size={120} disc={false} reactive state="idle" />
          <Typography
            sx={{
              fontFamily: (t) => t.typography.h1.fontFamily,
              fontWeight: 800,
              fontSize: "1.5rem",
              letterSpacing: "-0.02em",
            }}
          >
            Hold to talk.
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            Hold the mic, or hold{" "}
            <Box
              component="kbd"
              sx={{
                font: "600 0.8rem inherit",
                px: 0.75,
                py: "1px",
                border: (t) => `1px solid ${t.vb.lineStrong}`,
                borderBottomWidth: 2,
                borderRadius: 1.5,
              }}
            >
              Space
            </Box>
            , and speak. Release to transcribe. A quick tap starts a longer
            recording; tap again to stop.
          </Typography>
        </Box>
      </Surface>
    );
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        display: "grid",
        alignContent: "start",
        gap: 1.25,
        pr: 0.5,
      }}
    >
      {shown.map((e) => (
        <EntryCard key={e.id} entry={e} />
      ))}
      <div ref={endRef} />
    </Box>
  );
}

// ------------------------------------------------------------------ correction + decisions
function DecisionCard({ entry }: { entry: Entry }) {
  const { vb } = useTheme();
  const rows: ReactNode[] = [];
  if (entry.lid) {
    const unsure = entry.lid.detected === false;
    rows.push(
      <Box
        key="lid"
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 1,
          alignItems: "center",
        }}
      >
        <Typography sx={{ fontSize: "0.8125rem" }}>
          language: <b>{langName(entry.lid.language)}</b>
        </Typography>
        <Typography
          sx={{
            fontSize: "0.72rem",
            color: unsure ? vb.warn : vb.ok,
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
        >
          {unsure ? "unsure · Spark led" : "confident"}
        </Typography>
      </Box>,
    );
  }
  for (const [i, d] of (entry.decisions || []).entries()) {
    const isTerm = d.choice === "term";
    const p =
      d.pTerm == null
        ? null
        : Math.round((isTerm ? d.pTerm : 1 - d.pTerm) * 100);
    const c = isTerm ? vb.accent : vb.warn;
    rows.push(
      <Box
        key={i}
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "6px 10px",
          alignItems: "center",
        }}
      >
        <Typography sx={{ fontSize: "0.8125rem", overflowWrap: "anywhere" }}>
          “{d.heard}”
          <Box component="span" sx={{ color: "text.secondary", mx: 0.75 }}>
            →
          </Box>
          {isTerm ? <b>{d.term}</b> : `kept as “${d.heard}”`}
        </Typography>
        <Typography
          className="tabular"
          sx={{
            fontSize: "0.72rem",
            color: c,
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
        >
          {isTerm ? "your term" : "ordinary word"}
          {p != null ? ` · ${p}%` : ""}
        </Typography>
        {p != null && (
          <Box
            sx={{
              gridColumn: "1 / -1",
              height: 4,
              borderRadius: 999,
              bgcolor: vb.surface2,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                height: "100%",
                width: "100%",
                bgcolor: c,
                borderRadius: 999,
                transform: `scaleX(${p / 100})`,
                transformOrigin: "left",
                transition: "transform 500ms cubic-bezier(.22,1,.36,1)",
              }}
            />
          </Box>
        )}
      </Box>,
    );
  }
  return (
    <Box
      className="vb-rise"
      sx={{
        border: `1px solid ${vb.line}`,
        borderRadius: 3,
        p: 1.5,
        display: "grid",
        gap: 1,
        bgcolor: vb.surface,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontSize: "0.72rem",
          color: "text.secondary",
        }}
        className="tabular"
      >
        <span>{fmtTime(entry.at)}</span>
      </Box>
      {rows.length ? (
        rows
      ) : (
        <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
          nothing from memory in this sentence
        </Typography>
      )}
    </Box>
  );
}

function DecisionsBody() {
  const ids = useBench((st) => st.decisionIds);
  const entries = useBench((st) => st.entries);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const cards = ids.map((id) => byId.get(id)).filter(Boolean) as Entry[];
  return (
    <Box
      sx={{
        px: 2.25,
        pt: 2,
        pb: 3,
        display: "grid",
        gap: 1.25,
        alignContent: "start",
      }}
    >
      <Typography variant="h3">Decisions</Typography>
      {!cards.length ? (
        <Typography
          sx={{
            fontSize: "0.8125rem",
            color: "text.secondary",
            lineHeight: 1.55,
          }}
        >
          Why each change was made. For every finished sentence, each word that
          sounds like something in Memory is judged — the term you taught it, or
          the ordinary word the speaker meant — next to the language that was
          heard.
        </Typography>
      ) : (
        cards.map((e) => <DecisionCard key={e.id} entry={e} />)
      )}
    </Box>
  );
}

function CorrectionPanel() {
  const open = useBench((s) => s.panelOpen);
  const narrow = useMediaQuery("(max-width: 1100px)");
  const { vb } = useTheme();
  if (narrow)
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onOpen={() => setState({ panelOpen: true })}
        onClose={() => setState({ panelOpen: false })}
        disableSwipeToOpen
        slotProps={{
          paper: {
            sx: {
              maxHeight: "82dvh",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              pb: "env(safe-area-inset-bottom)",
            },
          },
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 4,
            borderRadius: 2,
            bgcolor: vb.lineStrong,
            mx: "auto",
            mt: 1.25,
          }}
        />
        <DecisionsBody />
      </SwipeableDrawer>
    );
  return (
    <Box
      component="aside"
      aria-label="Decisions"
      sx={{
        width: 340,
        flex: "none",
        borderLeft: `1px solid ${vb.line}`,
        bgcolor: alpha(vb.surface, 0.72),
        backdropFilter: "blur(14px)",
        overflowY: "auto",
        minHeight: 0,
      }}
    >
      <DecisionsBody />
    </Box>
  );
}

// ------------------------------------------------------------------ the dock
function useElapsed(from: number | null) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (from == null) return;
    const t = window.setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [from]);
  return from == null ? null : (Date.now() - from) / 1000;
}

function MicDock() {
  const s = useBench((st) => st);
  const { vb } = useTheme();
  const enabled = micEnabled(s);
  const elapsed = useElapsed(s.recordStartedAt);
  const phone = useMediaQuery("(max-width: 599.95px)");
  const live = s.capture === "live";
  const listening = s.capture === "listening";
  const busy = s.capture === "transcribing";
  const routeText = s.route === "auto" ? "Auto engine" : ROUTE_LABEL[s.route];
  const langText = s.lang ? langName(s.lang) : "any language";
  let title: string, sub: string;
  if (s.mode === "live") {
    title = live ? "Live captions on" : "Live captions";
    sub = live ? "speak naturally · press to stop" : "press the mic to start";
  } else {
    title = listening ? "Listening" : busy ? "Transcribing" : "Hold to talk";
    sub = listening
      ? "release, or press Space to stop"
      : busy
        ? "one moment"
        : "or hold Space";
  }
  const overridden = s.route !== "auto" || !!s.lang;
  const note = overridden ? `${routeText} · ${langText}` : "";
  const markState =
    !enabled && !busy
      ? "off"
      : live || listening
        ? "live"
        : busy
          ? "busy"
          : "idle";
  return (
    <Box
      sx={{
        position: "relative",
        zIndex: 4,
        px: { xs: 1.5, md: 3 },
        pb: { xs: "calc(74px + env(safe-area-inset-bottom))", md: 2.5 },
        pt: 1,
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          pointerEvents: "auto",
          mx: "auto",
          maxWidth: 760,
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.5, md: 2.25 },
          pl: { xs: 1, md: 1.25 },
          pr: { xs: 2, md: 3 },
          py: { xs: 1, md: 1.25 },
          borderRadius: 999,
          border: `1px solid ${vb.line}`,
          bgcolor: alpha(vb.surface, 0.86),
          backdropFilter: "blur(18px) saturate(1.3)",
          boxShadow: vb.shadowLift,
        }}
      >
        <ButtonBase
          aria-label={
            s.mode === "live"
              ? live
                ? "Stop live captions"
                : "Start live captions"
              : "Hold to talk"
          }
          aria-pressed={live || listening}
          disabled={!enabled}
          onPointerDown={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            pressDown();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            pressUp();
          }}
          onPointerCancel={pressCancel}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.repeat) {
              e.preventDefault();
              pressDown();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              pressUp();
            }
          }}
          sx={{
            borderRadius: "50%",
            flex: "none",
            touchAction: "none",
            transition: "transform 160ms cubic-bezier(.22,1,.36,1)",
            "&:active": { transform: "scale(0.96)" },
            "&.Mui-focusVisible": {
              outline: `3px solid ${alpha(vb.accent, 0.5)}`,
              outlineOffset: 3,
            },
            position: "relative",
            "&::after":
              live || listening
                ? {
                    content: '""',
                    position: "absolute",
                    inset: -4,
                    borderRadius: "50%",
                    border: `2px solid ${vb.live}`,
                    animation:
                      "vb-pulse 1.6s cubic-bezier(.22,1,.36,1) infinite",
                  }
                : {},
          }}
        >
          <Box
            sx={{
              width: phone ? 64 : 80,
              height: phone ? 64 : 80,
              display: "grid",
              placeItems: "center",
            }}
          >
            <NeuroMark
              size={phone ? 64 : 80}
              reactive
              state={markState}
              glyph={live || listening ? "stop" : "brain"}
            />
          </Box>
        </ButtonBase>
        <Box sx={{ minWidth: 0, flex: { xs: 1, md: "0 1 auto" } }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem",
              lineHeight: 1.3,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {title}
            {elapsed != null && (
              <Box
                component="span"
                className="tabular"
                sx={{ fontWeight: 600, fontSize: "0.8125rem", color: vb.live }}
              >
                {elapsed.toFixed(1)} s
              </Box>
            )}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.8125rem",
              color: "text.secondary",
              lineHeight: 1.4,
              whiteSpace: { md: "nowrap" },
            }}
          >
            {sub}
          </Typography>
          {note && (
            <Typography
              sx={{
                fontSize: "0.72rem",
                color: "text.secondary",
                opacity: 0.8,
                mt: 0.25,
                display: { xs: "none", sm: "block" },
              }}
            >
              {note}
            </Typography>
          )}
          {!enabled && !busy && (
            <Typography sx={{ fontSize: "0.72rem", color: vb.warn, mt: 0.25 }}>
              The NeuroLink speech service is offline. Retrying shortly.
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            flex: 1,
            minWidth: 60,
            height: 40,
            display: { xs: "none", sm: "block" },
          }}
        >
          <Waveform
            active={live || listening}
            colors={[vb.accentBright, vb.live]}
            idle={vb.lineStrong}
          />
        </Box>
      </Box>
    </Box>
  );
}

// ------------------------------------------------------------------ the view
export function LiveView() {
  const mode = useBench((s) => s.mode);
  const view = useBench((s) => s.view);
  // Space = push-to-talk / start-stop, anywhere on the Live view except while typing.
  useEffect(() => {
    const typing = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      return (
        ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) ||
        t.isContentEditable ||
        t.getAttribute("role") === "combobox"
      );
    };
    const down = (e: KeyboardEvent) => {
      if (
        e.code !== "Space" ||
        e.repeat ||
        typing(e) ||
        getState().view !== "live" ||
        !micEnabled()
      )
        return;
      e.preventDefault();
      pressDown();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || typing(e)) return;
      e.preventDefault();
      pressUp();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", pressCancel);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", pressCancel);
    };
  }, [view]);
  return (
    <>
      <LiveToolbar />
      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              px: { xs: 1.5, md: 3 },
              pt: { xs: 1.5, md: 2.5 },
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: mode === "live" ? "flex" : "none",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <TranscriptDoc />
              <OutputsPanel />
              <RawStrip />
            </Box>
            {mode === "ptt" && <PttFeed />}
          </Box>
          <MicDock />
        </Box>
        <CorrectionPanel />
      </Box>
    </>
  );
}

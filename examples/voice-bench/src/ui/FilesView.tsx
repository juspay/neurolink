import {
  Box,
  Button,
  ButtonBase,
  Checkbox,
  LinearProgress,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import ReplayRounded from "@mui/icons-material/ReplayRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import { useEffect, useRef, useState } from "react";
import { cfg, fmtClock, langName } from "../engine/config";
import { serverHas } from "../engine/neurolink";
import {
  cancelJob,
  columnStats,
  downloadTranscript,
  processFile,
  retryPart,
  setFileEngines,
  transcriptText,
} from "../engine/files";
import { setState, useBench, useServer } from "../engine/store";
import type { EngineId, FileColumn, PartState, Segment } from "../engine/types";
import {
  CopyButton,
  EngineDot,
  EngineTag,
  Illustration,
  Page,
  SectionHead,
  Surface,
} from "./common";

const OPTIONS: { e: EngineId; title: string; desc: string }[] = [
  {
    e: "local",
    title: "Spark · diarized",
    desc: "Nemotron-3 diarization + Qwen3-ASR with speaker labels",
  },
  {
    e: "scribe",
    title: "Scribe",
    desc: "ElevenLabs Scribe v2, cloud reference, with speakers",
  },
  {
    e: "whistle",
    title: "Whistle",
    desc: "On-device engine · English + 6 European languages",
  },
  {
    e: "indic",
    title: "Indic-Transcribe",
    desc: "AI4Bharat 600M · 22 Indian languages, split per utterance, language auto-detected",
  },
];

const COLUMN: Record<FileColumn, { engine: EngineId; label: string }> = {
  local: { engine: "local", label: "Spark · Qwen3-ASR + Nemotron-3" },
  cloud: { engine: "scribe", label: "Cloud · ElevenLabs Scribe v2" },
  whistle: { engine: "whistle", label: "Browser · Whistle" },
  indic: { engine: "indic", label: "Indic-Transcribe-Flex" },
};

function EnginePicker() {
  const sel = useBench((s) => s.fengines);
  useBench((s) => s.providers); // re-render when the server's engine list arrives
  const options = OPTIONS.filter((o) =>
    o.e === "scribe" ? !!cfg.elevenlabsKey : !useServer() || serverHas(o.e),
  );
  const maxSpeakers = useBench((s) => s.maxSpeakers);
  const { vb } = useTheme();
  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            lg: "repeat(4, 1fr)",
          },
          gap: 1.25,
        }}
      >
        {options.map((o) => {
          const on = sel.includes(o.e);
          const c = vb.engine[o.e];
          return (
            <ButtonBase
              key={o.e}
              role="checkbox"
              aria-checked={on}
              onClick={() =>
                setFileEngines(
                  on ? sel.filter((x) => x !== o.e) : [...sel, o.e],
                )
              }
              sx={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                alignItems: "start",
                textAlign: "left",
                gap: 1,
                p: 1.5,
                borderRadius: 3,
                border: `1px solid ${on ? alpha(c, 0.55) : vb.line}`,
                bgcolor: on ? alpha(c, 0.07) : vb.surface,
                transition: "border-color 180ms, background-color 180ms",
                "&:hover": { borderColor: alpha(c, 0.7) },
              }}
            >
              <Checkbox
                checked={on}
                size="small"
                slotProps={{ input: { tabIndex: -1, "aria-hidden": true } }}
                sx={{
                  p: 0,
                  mt: "1px",
                  color: vb.lineStrong,
                  "&.Mui-checked": { color: c },
                }}
              />
              <Box>
                <Typography
                  sx={{
                    fontWeight: 650,
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                  }}
                >
                  <EngineDot engine={o.e} />
                  {o.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.78rem",
                    color: "text.secondary",
                    lineHeight: 1.45,
                    mt: 0.25,
                  }}
                >
                  {o.desc}
                </Typography>
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <TextField
          size="small"
          type="number"
          label="Speakers"
          placeholder="auto"
          value={maxSpeakers}
          onChange={(e) => setState({ maxSpeakers: e.target.value })}
          slotProps={{
            htmlInput: { min: 1, max: 8 },
            inputLabel: { shrink: true },
          }}
          sx={{ width: 110 }}
        />
        <Typography
          sx={{
            fontSize: "0.8125rem",
            color: "text.secondary",
            flex: 1,
            minWidth: 220,
          }}
        >
          Expected speakers for Spark diarization (blank lets the model decide).
          Language, output script and correction follow Settings; each segment
          is corrected against Memory.
        </Typography>
      </Box>
    </Box>
  );
}

function DropZone() {
  const [over, setOver] = useState(false);
  const [warn, setWarn] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const { vb } = useTheme();
  const take = async (f?: File) => {
    if (!f) return;
    setWarn("");
    if (!(await processFile(f))) setWarn("Pick at least one engine above.");
  };
  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void take(e.dataTransfer.files[0]);
      }}
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "20px",
        border: `1.5px dashed ${over ? vb.accent : vb.lineStrong}`,
        bgcolor: over ? vb.accentSoft : alpha(vb.surface, 0.7),
        transition: "border-color 180ms, background-color 180ms",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1.1fr" },
        alignItems: "center",
        minHeight: { md: 260 },
      }}
    >
      <Box
        sx={{
          p: { xs: 2.5, md: 4 },
          display: "grid",
          gap: 1.5,
          order: { xs: 2, md: 1 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Typography
          variant="h2"
          component="h2"
          sx={{ fontSize: { xs: "1.5rem", md: "1.875rem" } }}
        >
          Drop a recording to compare engines.
        </Typography>
        <Typography sx={{ color: "text.secondary", maxWidth: "48ch" }}>
          Every selected engine transcribes the same audio side by side, with
          speakers where the engine can tell them apart. MP4, M4A, MP3, WAV,
          WebM — any length.
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
            mt: 0.5,
          }}
        >
          <Button
            variant="contained"
            startIcon={<UploadFileRounded />}
            onClick={() => input.current?.click()}
          >
            Choose a file
          </Button>
          <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
            or drop it anywhere here
          </Typography>
        </Box>
        {warn && (
          <Typography sx={{ fontSize: "0.8125rem", color: vb.warn }}>
            {warn}
          </Typography>
        )}
        <input
          ref={input}
          type="file"
          hidden
          accept="audio/*,video/*,.mp4,.m4a,.mp3,.wav,.webm,.ogg,.flac"
          onChange={(e) => {
            void take(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </Box>
      <Box
        sx={{
          order: { xs: 1, md: 2 },
          height: { xs: 170, md: "100%" },
          minHeight: { md: 260 },
        }}
      >
        <Illustration name="files" />
      </Box>
    </Box>
  );
}

function SegmentRow({
  s,
  showSpeaker,
  odd,
  onRetry,
}: {
  s: Segment;
  showSpeaker: boolean;
  odd: boolean;
  onRetry?: () => Promise<void> | void;
}) {
  const { vb } = useTheme();
  const [busy, setBusy] = useState(false);
  if (s.divider)
    return (
      <Box
        component="li"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          pt: 1.5,
          pb: 0.5,
          px: 1,
        }}
      >
        <Typography
          component="time"
          className="tabular"
          sx={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "text.secondary",
            whiteSpace: "nowrap",
          }}
        >
          {fmtClock(s.start)}
        </Typography>
        <Box
          sx={{ height: "1px", width: 16, bgcolor: vb.line, flex: "none" }}
        />
        <Typography
          sx={{
            fontSize: "0.72rem",
            color: "text.secondary",
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          {s.divider}
        </Typography>
        <Box sx={{ height: "1px", flex: 1, bgcolor: vb.line }} />
      </Box>
    );
  if (s.part != null && s.error)
    return (
      <Box
        component="li"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "92px 1fr auto" },
          gap: { xs: 0.75, sm: 1.5 },
          alignItems: "center",
          px: 1,
          py: 1,
          my: 0.5,
          borderRadius: 2,
          border: `1px dashed ${alpha(vb.rec, 0.45)}`,
          bgcolor: vb.recSoft,
        }}
      >
        <Typography
          component="time"
          className="tabular"
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
            whiteSpace: "nowrap",
          }}
        >
          {fmtClock(s.start)} – {fmtClock(s.end)}
        </Typography>
        <Typography
          sx={{ fontSize: "0.875rem", color: vb.rec, overflowWrap: "anywhere" }}
        >
          {s.error}
        </Typography>
        {onRetry && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ReplayRounded fontSize="small" />}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onRetry();
              } finally {
                setBusy(false);
              }
            }}
            sx={{ justifySelf: { xs: "start", sm: "end" } }}
          >
            {busy ? "Retrying…" : "Retry"}
          </Button>
        )}
      </Box>
    );
  return (
    <Box
      component="li"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "92px 1fr" },
        gap: { xs: 0.25, sm: 1.5 },
        px: 1,
        py: 1,
        borderRadius: 2,
        bgcolor: odd ? alpha(vb.fg, 0.025) : "transparent",
      }}
    >
      <Typography
        component="time"
        className="tabular"
        sx={{
          fontSize: "0.75rem",
          color: "text.secondary",
          lineHeight: 1.9,
          whiteSpace: "nowrap",
        }}
      >
        {fmtClock(s.start)} – {fmtClock(s.end)}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        {s.language && (
          <Box
            component="span"
            sx={{
              float: "right",
              ml: 1,
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "text.secondary",
              border: `1px solid ${vb.line}`,
              borderRadius: 999,
              px: 0.9,
              lineHeight: 1.7,
            }}
          >
            {langName(s.language)}
          </Box>
        )}
        <Typography
          sx={{
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            overflowWrap: "anywhere",
            color: s.error
              ? vb.rec
              : s.text == null
                ? "text.secondary"
                : "text.primary",
          }}
        >
          {showSpeaker && s.speaker && (
            <Box
              component="span"
              sx={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: s.speaker === "corrected" ? vb.ok : vb.live,
                mr: 1,
                letterSpacing: "0.02em",
              }}
            >
              {s.speaker}
            </Box>
          )}
          {s.error ||
            (s.text == null
              ? s.part != null
                ? `Part ${s.part + 1} · transcribing…`
                : "queued…"
              : s.text || "(silence)")}
        </Typography>
        {s.pending && (
          <Typography
            className="vb-busy"
            sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.25 }}
          >
            correcting…
          </Typography>
        )}
        {s.note && (
          <Typography
            sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.25 }}
          >
            {s.note}
          </Typography>
        )}
        {s.raw && (
          <Typography
            sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 0.5 }}
          >
            before correction: {s.raw}
          </Typography>
        )}
        {s.original && (
          <Typography
            sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 0.5 }}
          >
            native script: {s.original}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// One bar per part, sized by its duration: queued, transcribing, done, or failed (hover for which).
function PartStrip({
  parts,
  color,
  onRetry,
}: {
  parts: PartState[];
  color: string;
  onRetry?: (i: number) => void;
}) {
  const { vb } = useTheme();
  const total = parts.reduce((n, p) => n + (p.end - p.start), 0) || 1;
  const done = parts.filter((p) => p.state === "done").length;
  return (
    <Box
      role="progressbar"
      aria-label="Parts transcribed"
      aria-valuemin={0}
      aria-valuemax={parts.length}
      aria-valuenow={done}
      sx={{ display: "flex", gap: "3px", height: 6 }}
    >
      {parts.map((p, i) => (
        <Tooltip
          key={i}
          title={`Part ${i + 1} · ${fmtClock(p.start)} – ${fmtClock(p.end)} · ${p.state === "working" ? "transcribing" : p.state}${p.error ? " · " + p.error : ""}${p.state === "failed" && onRetry ? " · click to retry" : ""}`}
        >
          <Box
            component={p.state === "failed" && onRetry ? "button" : "span"}
            onClick={
              p.state === "failed" && onRetry ? () => onRetry(i) : undefined
            }
            aria-label={
              p.state === "failed" && onRetry
                ? `Retry part ${i + 1}`
                : undefined
            }
            className={p.state === "working" ? "vb-busy" : undefined}
            sx={{
              flex: `${(p.end - p.start) / total} 1 0`,
              minWidth: 6,
              borderRadius: 999,
              bgcolor:
                p.state === "done"
                  ? color
                  : p.state === "failed"
                    ? vb.rec
                    : p.state === "working"
                      ? alpha(color, 0.55)
                      : vb.surface2,
              border: p.state === "queued" ? `1px solid ${vb.line}` : "none",
              p: 0,
              display: "block",
              cursor: p.state === "failed" && onRetry ? "pointer" : "default",
              transition: "background-color 300ms",
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
}

function useTicker(active: boolean) {
  const [, t] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => t((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

function Results() {
  const job = useBench((s) => s.job);
  const { vb } = useTheme();
  const cols = job ? (Object.keys(job.columns) as FileColumn[]) : [];
  useTicker(!!job && cols.some((k) => !job.columns[k]!.done));
  if (!job) return null;
  return (
    <Surface className="vb-rise">
      <SectionHead
        title={
          <>
            {job.fileName}
            <Box
              component="span"
              className="tabular"
              sx={{
                fontFamily: (t) => t.typography.fontFamily,
                fontWeight: 500,
                fontSize: "0.8125rem",
                color: "text.secondary",
              }}
            >
              {job.sizeMb.toFixed(1)} MB
            </Box>
          </>
        }
      >
        <Box sx={{ ml: "auto", display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          <CopyButton
            size="small"
            variant="outlined"
            label="Copy all"
            getText={() => transcriptText("all")}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadRounded fontSize="small" />}
            onClick={() => downloadTranscript("all")}
          >
            Download all
          </Button>
          <Button
            size="small"
            startIcon={<CloseRounded fontSize="small" />}
            onClick={cancelJob}
            sx={{ "&:hover": { color: vb.rec } }}
          >
            Cancel
          </Button>
        </Box>
      </SectionHead>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: cols.length >= 2 ? "1fr 1fr" : "1fr",
            xl: `repeat(${Math.min(cols.length, 4)}, minmax(0,1fr))`,
          },
          gap: "1px",
          bgcolor: vb.line,
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
          overflow: "hidden",
        }}
      >
        {cols.map((k, i) => {
          const c = job.columns[k]!;
          const meta = COLUMN[k];
          // red only when the whole column failed, not when a summary mentions failed parts
          const failed =
            /^(failed|cancelled)/.test(c.phase) ||
            /^(failed|cancelled)/.test(c.statsOverride ?? "");
          return (
            <Box
              key={k}
              sx={{
                p: { xs: 1.5, md: 2 },
                bgcolor: vb.surface,
                gridColumn: {
                  lg: cols.length === 3 && i === 2 ? "1 / -1" : "auto",
                  xl: "auto",
                },
                display: "grid",
                gap: 1.25,
                alignContent: "start",
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "6px 10px",
                }}
              >
                <EngineTag engine={meta.engine}>{meta.label}</EngineTag>
                <Box sx={{ ml: "auto", display: "flex", gap: 0.5 }}>
                  <CopyButton size="small" getText={() => transcriptText(k)} />
                  <Button size="small" onClick={() => downloadTranscript(k)}>
                    .txt
                  </Button>
                </Box>
              </Box>
              <Typography
                className="tabular"
                sx={{
                  fontSize: "0.75rem",
                  color: failed ? vb.rec : "text.secondary",
                  lineHeight: 1.5,
                }}
              >
                {columnStats(job, k)}
              </Typography>
              {c.parts ? (
                <PartStrip
                  parts={c.parts}
                  color={vb.engine[meta.engine]}
                  onRetry={c.done ? (i) => void retryPart(k, i) : undefined}
                />
              ) : (
                <LinearProgress
                  variant="determinate"
                  value={c.progress}
                  sx={{
                    "& .MuiLinearProgress-bar": {
                      bgcolor: failed ? vb.rec : vb.engine[meta.engine],
                    },
                  }}
                />
              )}
              {c.rows.length > 0 && (
                <Box
                  component="ol"
                  sx={{
                    listStyle: "none",
                    m: 0,
                    p: 0,
                    display: "grid",
                    maxHeight: "62vh",
                    overflowY: "auto",
                  }}
                >
                  {c.rows.map((r, n) => (
                    <SegmentRow
                      key={`${r.start}-${n}-${r.part ?? ""}`}
                      s={r}
                      showSpeaker={c.showSpeakers}
                      odd={
                        c.rows.slice(0, n).filter((x) => !x.divider).length %
                          2 ===
                        1
                      }
                      onRetry={
                        r.part != null && c.done
                          ? () => retryPart(k, r.part!)
                          : undefined
                      }
                    />
                  ))}
                </Box>
              )}
              {!c.done && !failed && (
                <Box
                  sx={{ display: "grid", gap: 1, pt: 0.5 }}
                  aria-hidden="true"
                >
                  {(c.rows.length ? [70] : [92, 76, 84]).map((w) => (
                    <Box
                      key={w}
                      className="vb-busy"
                      sx={{
                        height: 12,
                        width: `${w}%`,
                        borderRadius: 999,
                        bgcolor: alpha(vb.fg, 0.06),
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Surface>
  );
}

export function FilesView() {
  return (
    <Page>
      <DropZone />
      <Surface sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h3" sx={{ mb: 1.5 }}>
          Engines to run
        </Typography>
        <EnginePicker />
      </Surface>
      <Results />
    </Page>
  );
}

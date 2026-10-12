import {
  Box,
  Button,
  MenuItem,
  Select,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import { showView } from "./AppShell";
import { useState } from "react";
import { setState, useBench } from "../engine/store";
import { fmtTime } from "../engine/config";
import { playBlob } from "../engine/feed";
import {
  CLONE_MAX_S,
  CLONE_MIN_S,
  cloneReference,
  cloneVoice,
  speak,
} from "../engine/tts";
import { EntryCard } from "./LiveView";
import { Page, PageHeader, SectionHead, Surface } from "./common";

const TAGS = ["[whisper]", "[excited]", "[laughing]", "[pause]", "[pitch up]"];

function CloneReference() {
  const entries = useBench((s) => s.entries);
  const { vb } = useTheme();
  const ref = cloneReference(entries);
  return (
    <Surface>
      <SectionHead
        title="Voice clone reference"
        hint={`the newest recording of ${CLONE_MIN_S}–${CLONE_MAX_S} s from Live or push to talk, with its transcript`}
      />
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        {ref ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" },
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <Button
              variant="outlined"
              startIcon={<PlayArrowRounded />}
              onClick={() => playBlob(ref.audio!)}
            >
              Play · {(ref.seconds ?? 0).toFixed(1)} s
            </Button>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.9375rem",
                  lineHeight: 1.5,
                  overflowWrap: "anywhere",
                }}
              >
                “{ref.text}”
              </Typography>
              <Typography
                className="tabular"
                sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.25 }}
              >
                recorded {fmtTime(ref.at)}
                {ref.lang ? ` · ${ref.lang}` : ""} · this audio and transcript
                are sent when you clone
              </Typography>
            </Box>
          </Box>
        ) : (
          <Typography sx={{ fontSize: "0.875rem", color: vb.warn }}>
            No recording of {CLONE_MIN_S}–{CLONE_MAX_S} s in this session yet.
            Go to Live, choose Push to talk, hold for about 10 s and say one
            clear sentence; it appears here.
          </Typography>
        )}
      </Box>
    </Surface>
  );
}

export function SpeakView() {
  const voices = useBench((s) => s.voices);
  const voice = useBench((s) => s.voice);
  const speaking = useBench((s) => s.speaking);
  const ttsOk = useBench((s) => s.ttsOk);
  const entries = useBench((s) => s.entries);
  const spoken = entries.filter((e) => e.kind === "tts");
  const [text, setText] = useState(
    "Hello from the voice bench. [excited] Speech recognition and synthesis, all self-hosted! [whisper] And this part is a whisper.",
  );
  const [name, setName] = useState("");
  const [nameErr, setNameErr] = useState("");
  const { vb } = useTheme();
  return (
    <Page>
      <Button
        size="small"
        startIcon={<ArrowBackRounded />}
        onClick={() => showView("settings")}
        sx={{ justifySelf: "start", mb: -1 }}
      >
        Settings
      </Button>
      <PageHeader title="Speak" art="speak">
        Text to speech through the configured TTS model (Fish Audio S2-Pro via
        LiteLLM in the reference setup). Inline tags change delivery
        mid-sentence; clone a voice from your last push-to-talk recording.
      </PageHeader>
      <Surface
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void speak(text.trim(), voice || "default");
        }}
        sx={{ p: { xs: 2, md: 2.5 }, display: "grid", gap: 1.75 }}
      >
        <TextField
          multiline
          minRows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Text for the TTS model to say…"
          slotProps={{ htmlInput: { "aria-label": "Text to speak" } }}
          sx={{ "& textarea": { fontSize: "1.0625rem", lineHeight: 1.6 } }}
        />
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            alignItems: "center",
          }}
        >
          <Typography
            sx={{ fontSize: "0.8125rem", color: "text.secondary", mr: 0.5 }}
          >
            Insert a tag
          </Typography>
          {TAGS.map((t) => (
            <Button
              key={t}
              size="small"
              variant="outlined"
              onClick={() =>
                setText((x) => (x.trimEnd() + " " + t + " ").trimStart())
              }
              sx={{ minHeight: 26, borderRadius: 999, fontSize: "0.75rem" }}
            >
              {t}
            </Button>
          ))}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.25,
            alignItems: "center",
            pt: 0.5,
            borderTop: `1px solid ${vb.line}`,
            mt: 0.5,
          }}
        >
          <Select
            size="small"
            value={voices.includes(voice) ? voice : voices[0]}
            onChange={(e) => setState({ voice: e.target.value })}
            inputProps={{ "aria-label": "Voice" }}
            sx={{ minWidth: 160, mt: 1.25 }}
          >
            {voices.map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </Select>
          <Button
            type="submit"
            variant="contained"
            startIcon={<PlayArrowRounded />}
            disabled={!ttsOk || speaking}
            sx={{ mt: 1.25 }}
          >
            {speaking ? "Speaking…" : "Speak"}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Box
            sx={{ display: "flex", gap: 1, alignItems: "flex-start", mt: 1.25 }}
          >
            <TextField
              size="small"
              placeholder="voice name"
              value={name}
              error={!!nameErr}
              helperText={nameErr || " "}
              onChange={(e) => {
                setName(e.target.value);
                setNameErr("");
              }}
              slotProps={{
                htmlInput: { "aria-label": "Name for cloned voice" },
              }}
              sx={{ width: 160, "& .MuiFormHelperText-root": { mt: 0.25 } }}
            />
            <Button
              variant="outlined"
              title="Uses your last push-to-talk recording (3–30 s) and its transcript as the reference"
              onClick={async () => setNameErr((await cloneVoice(name)) ?? "")}
            >
              Clone last recording
            </Button>
          </Box>
        </Box>
        {!ttsOk && (
          <Typography sx={{ fontSize: "0.8125rem", color: vb.warn }}>
            Text to speech is not reachable. On the public demo, start serve.mjs
            with TTS_BASE_URL and TTS_API_KEY; locally, set baseUrl and apiKey
            in config.js.
          </Typography>
        )}
      </Surface>
      <CloneReference />
      <Surface>
        <SectionHead
          title="Spoken"
          hint={
            spoken.length
              ? `${spoken.length} ${spoken.length === 1 ? "clip" : "clips"} this session`
              : undefined
          }
        />
        <Box
          sx={{
            p: { xs: 1.5, md: 2 },
            display: "grid",
            gap: 1.25,
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {spoken.length ? (
            [...spoken].reverse().map((e) => <EntryCard key={e.id} entry={e} />)
          ) : (
            <Typography
              sx={{ color: "text.secondary", fontSize: "0.875rem", p: 1 }}
            >
              What you synthesise plays immediately and stays here with its
              latency and real-time factor.
            </Typography>
          )}
        </Box>
      </Surface>
    </Page>
  );
}

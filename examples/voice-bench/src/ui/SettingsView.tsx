import {
  Autocomplete,
  Box,
  Button,
  Chip,
  MenuItem,
  Select,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import { useState, type ReactNode } from "react";
import { cfg, LANGUAGES } from "../engine/config";
import { serverHas } from "../engine/neurolink";
import { clearCards } from "../engine/feed";
import {
  liveRestartIfRunning,
  nlLiveSetOutputs,
  setRoute,
} from "../engine/live";
import {
  setState,
  storage,
  TUNE_DEFAULTS,
  useBench,
  useServer,
} from "../engine/store";
import type { Route, Tune } from "../engine/types";
import { showView } from "./AppShell";
import { Page, PageHeader, SectionHead, Surface } from "./common";

// BCP-47: a language, an optional script (hi-Latn), an optional region (fr-CA).
const OUTPUT_TAG_RE =
  /^(?:source|[A-Za-z]{2,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|\d{3}))?)$/;
const SPOKEN_CHOICES: [string, string][] = [
  ["en", "English"],
  ["hi", "Hindi"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
  ["kn", "Kannada"],
  ["ml", "Malayalam"],
  ["bn", "Bengali"],
  ["mr", "Marathi"],
  ["gu", "Gujarati"],
  ["pa", "Punjabi"],
  ["or", "Odia"],
  ["as", "Assamese"],
  ["ur", "Urdu"],
  ["ne", "Nepali"],
];
const OUTPUT_CHOICES: [string, string][] = [
  ["en", "English"],
  ["hi", "Hindi"],
  ["hi-Latn", "Hindi in Latin letters (Hinglish)"],
  ["ta", "Tamil"],
  ["ta-Latn", "Tamil in Latin letters (Tanglish)"],
  ["te", "Telugu"],
  ["kn", "Kannada"],
  ["ml", "Malayalam"],
  ["bn", "Bengali"],
  ["mr", "Marathi"],
  ["gu", "Gujarati"],
  ["pa", "Punjabi"],
  ["ur", "Urdu"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["pt", "Portuguese"],
  ["ar", "Arabic"],
  ["ja", "Japanese"],
  ["zh", "Chinese"],
];

const ROUTES: { v: Route; title: string; desc: string }[] = [
  {
    v: "auto",
    title: "Auto",
    desc: "Recommended. Indic-Transcribe-Flex for Indian languages, Indian English and code-mixed speech; Spark only when it returns nothing.",
  },
  {
    v: "whistle",
    title: "Whistle · offline",
    desc: "The built-in on-device engine. English and six European languages.",
  },
  {
    v: "scribe",
    title: "Scribe · cloud",
    desc: "ElevenLabs Scribe v2 as a cloud reference. Push to talk only.",
  },
];

const TUNING: {
  k: keyof Tune;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  {
    k: "silence",
    label: "End of sentence after silence (ms)",
    min: 300,
    max: 2000,
    step: 50,
  },
  {
    k: "intervalLocal",
    label: "Interim pass interval — Spark (ms)",
    min: 300,
    max: 3000,
    step: 50,
  },
  {
    k: "intervalIndic",
    label: "Interim pass interval — Indic-Transcribe (ms)",
    min: 300,
    max: 3000,
    step: 50,
  },
  {
    k: "intervalWhistle",
    label: "Interim pass interval — Whistle (ms)",
    min: 300,
    max: 3000,
    step: 50,
  },
  {
    k: "softCut",
    label: "Long turns end at a pause after (s)",
    min: 6,
    max: 30,
    step: 1,
  },
  {
    k: "onset",
    label: "Speech onset floor (RMS)",
    min: 0.002,
    max: 0.05,
    step: 0.001,
  },
];

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: ReactNode;
  children: ReactNode;
}) {
  const { vb } = useTheme();
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) auto" },
        gap: { xs: 1.25, md: 3 },
        alignItems: "center",
        px: { xs: 2, md: 2.5 },
        py: 2,
        "& + &": { borderTop: `1px solid ${vb.line}` },
      }}
    >
      <Box>
        <Typography sx={{ fontWeight: 650 }}>{title}</Typography>
        <Typography
          sx={{
            fontSize: "0.85rem",
            color: "text.secondary",
            mt: 0.25,
            maxWidth: "62ch",
            lineHeight: 1.5,
          }}
        >
          {desc}
        </Typography>
      </Box>
      <Box sx={{ justifySelf: { md: "end" } }}>{children}</Box>
    </Box>
  );
}

export function SettingsView() {
  const route = useBench((s) => s.route);
  const lang = useBench((s) => s.lang);
  const flags = useBench((s) => s.flags);
  const tune = useBench((s) => s.tune);
  const server = useServer();
  const serverFileMode = useBench((s) => s.serverFileMode);
  const { vb } = useTheme();
  const [resetN, setResetN] = useState(0);
  const outputLangs = useBench((s) => s.outputLangs);
  const expectedLangs = useBench((s) => s.expectedLangs);
  const setExpected = (tags: string[]) => {
    const clean = [...new Set(tags)];
    storage.set("voice-bench-expected", clean);
    setState({ expectedLangs: clean });
    void liveRestartIfRunning();
  };
  const setOutputs = (tags: string[]) => {
    const clean = [
      ...new Set(
        tags.map((t) => t.trim()).filter((t) => OUTPUT_TAG_RE.test(t)),
      ),
    ].slice(0, 8);
    storage.set("voice-bench-outputs", clean);
    setState({ outputLangs: clean });
    nlLiveSetOutputs(clean);
  };
  const setFlag = (
    k: "correct" | "romanize" | "clean" | "reconcile",
    v: boolean,
  ) => {
    storage.set("voice-bench-" + k, v);
    setState((s) => ({ flags: { ...s.flags, [k]: v } }));
    void liveRestartIfRunning();
  };
  const setTune = (t: Tune) => {
    storage.set("voice-bench-tuning", t);
    setState({ tune: t });
  };
  useBench((s) => s.providers); // re-render when the server's engine list arrives
  const routes = ROUTES.filter(
    (r) =>
      r.v === "auto" ||
      r.v === route ||
      (r.v === "scribe"
        ? !!cfg.elevenlabsKey
        : !server || serverHas("whistle")),
  );
  const routeDesc = ROUTES.find((r) => r.v === route)!.desc;
  return (
    <Page>
      <PageHeader title="Settings" art="settings">
        Out of the box every utterance is routed for you: the engine and the
        language are picked as you speak, and each sentence is corrected against
        Memory. Override them here when you want to compare.
      </PageHeader>

      <Surface>
        <SectionHead title="Recognition" />
        <Row title="Engine" desc={routeDesc}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={route}
            onChange={(_e, v: Route | null) => v && setRoute(v)}
            aria-label="Engine"
          >
            {routes.map((r) => (
              <ToggleButton key={r.v} value={r.v}>
                {r.title}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Row>
        <Row
          title="Language"
          desc="Auto-detect listens for the language on every utterance. Pinning one turns that detection off."
        >
          <Select
            size="small"
            value={lang}
            displayEmpty
            onChange={(e) => {
              storage.set("voice-bench-lang", e.target.value);
              setState({ lang: e.target.value });
              void liveRestartIfRunning();
            }}
            inputProps={{ "aria-label": "Language" }}
            sx={{ minWidth: 200 }}
            MenuProps={{ slotProps: { paper: { sx: { maxHeight: 360 } } } }}
          >
            {LANGUAGES.map(([v, l]) => (
              <MenuItem key={v} value={v}>
                {l}
              </MenuItem>
            ))}
          </Select>
        </Row>
      </Surface>

      <Surface>
        <SectionHead title="Correction" />
        <Row
          title="Correct each sentence"
          desc="Memory terms are judged and the sentence is tidied at every pause. Clean sentences pass through untouched, so leaving it on costs nothing."
        >
          <Switch
            checked={flags.correct}
            onChange={(e) => setFlag("correct", e.target.checked)}
            slotProps={{ input: { "aria-label": "Correct each sentence" } }}
          />
        </Row>
        <Row
          title="Output script"
          desc="Latin writes Hinglish and Tanglish the way people type them; Native keeps the speaker's own script. Never translated."
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={flags.romanize ? "latin" : "native"}
            onChange={(_e, v: string | null) =>
              v && setFlag("romanize", v === "latin")
            }
            aria-label="Output script"
          >
            <ToggleButton value="latin">Latin</ToggleButton>
            <ToggleButton value="native">Native</ToggleButton>
          </ToggleButtonGroup>
        </Row>
        {(!server || serverFileMode) && (
          <Row
            title="Clean verbatim"
            desc="Let the rewrite drop fillers and stutters (um, uh, repeated starts). Content words are never removed. Off keeps every word as spoken."
          >
            <Switch
              checked={flags.clean}
              disabled={!flags.correct}
              onChange={(e) => setFlag("clean", e.target.checked)}
              slotProps={{ input: { "aria-label": "Clean verbatim" } }}
            />
          </Row>
        )}
      </Surface>

      {server && (
        <Surface>
          <SectionHead title="Spoken languages" />
          <Row
            title="Speakers use"
            desc="The recognizer only chooses among these, so a fragment of background speech is never written as Bengali or Marathi. Leave it empty to allow any of the 22 Indian languages and English."
          >
            <Autocomplete
              multiple
              size="small"
              options={SPOKEN_CHOICES.map(([v]) => v)}
              getOptionLabel={(v) =>
                SPOKEN_CHOICES.find(([t]) => t === v)?.[1] ?? v
              }
              value={expectedLangs}
              onChange={(_e, v) => setExpected(v as string[])}
              renderValue={(value, getItemProps) =>
                value.map((v, index) => (
                  <Chip
                    {...getItemProps({ index })}
                    key={v}
                    size="small"
                    label={v}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={expectedLangs.length ? "" : "any language"}
                  slotProps={{
                    ...params.slotProps,
                    htmlInput: {
                      ...params.slotProps.htmlInput,
                      "aria-label": "Spoken languages",
                    },
                  }}
                />
              )}
              sx={{ minWidth: 260, maxWidth: 420 }}
            />
          </Row>
        </Surface>
      )}

      {server && (
        <Surface>
          <SectionHead title="Output languages" />
          <Row
            title="Also write every sentence in"
            desc="Each sentence is rendered once into every language here, after it is corrected: es, fr, de, ta … translate; hi-Latn writes Hindi in Latin letters (Hinglish), whatever was spoken. Changes apply from the next sentence."
          >
            <Autocomplete
              multiple
              freeSolo
              size="small"
              options={OUTPUT_CHOICES.map(([v]) => v)}
              getOptionLabel={(v) =>
                OUTPUT_CHOICES.find(([t]) => t === v)?.[1] ?? v
              }
              value={outputLangs}
              onChange={(_e, v) => setOutputs(v as string[])}
              renderValue={(value, getItemProps) =>
                value.map((v, index) => (
                  <Chip
                    {...getItemProps({ index })}
                    key={v}
                    size="small"
                    label={v}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={outputLangs.length ? "" : "transcript only"}
                  slotProps={{
                    ...params.slotProps,
                    htmlInput: {
                      ...params.slotProps.htmlInput,
                      "aria-label": "Output languages",
                    },
                  }}
                />
              )}
              sx={{ minWidth: 260, maxWidth: 420 }}
            />
          </Row>
        </Surface>
      )}

      <Surface>
        <Row
          title="Speak"
          desc="Text to speech and voice cloning, kept here because it is not part of transcription."
        >
          <Button
            variant="outlined"
            endIcon={<ArrowForwardRounded />}
            onClick={() => showView("speak")}
          >
            Open Speak
          </Button>
        </Row>
      </Surface>

      {!server && (
        <Surface>
          <SectionHead
            title="On-device endpointing"
            hint="used only without a NeuroLink server; 20 ms blocks with a minimum-statistics noise floor"
          >
            <Button
              size="small"
              sx={{ ml: "auto" }}
              onClick={() => {
                setTune({ ...TUNE_DEFAULTS });
                setResetN((n) => n + 1);
              }}
            >
              Reset
            </Button>
          </SectionHead>
          <Box
            sx={{
              p: { xs: 2, md: 2.5 },
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                lg: "1fr 1fr 1fr",
              },
              gap: 2,
            }}
          >
            {TUNING.map((f) => (
              <TextField
                key={`${f.k}-${resetN}`}
                type="number"
                size="small"
                label={f.label}
                defaultValue={tune[f.k]}
                slotProps={{
                  htmlInput: {
                    min: f.min,
                    max: f.max,
                    step: f.step,
                    className: "tabular",
                  },
                  inputLabel: { shrink: true },
                }}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (e.target.value !== "" && Number.isFinite(v))
                    setTune({
                      ...tune,
                      [f.k]: Math.min(f.max, Math.max(f.min, v)),
                    });
                }}
              />
            ))}
          </Box>
        </Surface>
      )}

      <Surface sx={{ borderColor: vb.line }}>
        <Row
          title="History"
          desc="Transcript cards are kept in this browser (the last 200)."
        >
          <Button variant="outlined" onClick={clearCards}>
            Clear saved cards
          </Button>
        </Row>
      </Surface>
    </Page>
  );
}

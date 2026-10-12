import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import FileDownloadRounded from "@mui/icons-material/FileDownloadRounded";
import FileUploadRounded from "@mui/icons-material/FileUploadRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { useRef, useState, type KeyboardEvent } from "react";
import { download } from "../engine/feed";
import { sampleDictionary, setState, storage, useBench } from "../engine/store";
import type { DictEntry } from "../engine/types";
import { Page, PageHeader, SectionHead, Surface } from "./common";

function saveDictionary(dictionary: DictEntry[]) {
  storage.set("voice-bench-dictionary", dictionary);
  setState({ dictionary });
}

function TermForm({
  editing,
  onDone,
}: {
  editing: number;
  onDone: () => void;
}) {
  const dictionary = useBench((s) => s.dictionary);
  const current = editing >= 0 ? dictionary[editing] : null;
  const [term, setTerm] = useState(current?.term ?? "");
  const [heard, setHeard] = useState<string[]>(current?.heard ?? []);
  const [draft, setDraft] = useState("");
  const [meaning, setMeaning] = useState(current?.meaning ?? "");
  const termRef = useRef<HTMLInputElement>(null);
  const { vb } = useTheme();

  const addChip = (v: string) => {
    const x = v.trim().replace(/,$/, "").trim();
    if (x && !heard.includes(x)) setHeard((h) => [...h, x]);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addChip(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && heard.length)
      setHeard((h) => h.slice(0, -1));
  };
  const submit = () => {
    const all = draft.trim()
      ? [...heard, ...(heard.includes(draft.trim()) ? [] : [draft.trim()])]
      : heard;
    const entry = { term: term.trim(), heard: all, meaning: meaning.trim() };
    if (!entry.term) return termRef.current?.focus();
    const next = dictionary.slice();
    if (editing >= 0) next[editing] = entry;
    else next.unshift(entry);
    saveDictionary(next);
    setTerm("");
    setHeard([]);
    setDraft("");
    setMeaning("");
    onDone();
    termRef.current?.focus();
  };

  return (
    <Surface
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      sx={{ borderColor: editing >= 0 ? alpha(vb.accent, 0.5) : vb.line }}
    >
      <SectionHead
        title={current ? `Edit “${current.term}”` : "Teach a term"}
        hint="Enter adds a mis-hearing · the meaning helps the models decide"
      />
      <Box
        sx={{
          p: { xs: 2, md: 2.5 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1.4fr 1.2fr auto" },
          gap: 1.5,
          alignItems: "start",
        }}
      >
        <TextField
          inputRef={termRef}
          size="small"
          label="Term"
          placeholder="e.g. Kubernetes"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          required
          autoComplete="off"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          label="Also heard as"
          placeholder={heard.length ? "" : "type and press Enter · any script"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => {
            if (draft.trim()) {
              addChip(draft);
              setDraft("");
            }
          }}
          autoComplete="off"
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              startAdornment: heard.length ? (
                <InputAdornment
                  position="start"
                  sx={{
                    maxHeight: "none",
                    height: "auto",
                    flexWrap: "wrap",
                    gap: 0.5,
                    py: 0.5,
                    mr: 0.5,
                  }}
                >
                  {heard.map((h) => (
                    <Chip
                      key={h}
                      size="small"
                      label={h}
                      onDelete={() => setHeard((x) => x.filter((y) => y !== h))}
                    />
                  ))}
                </InputAdornment>
              ) : undefined,
              sx: { flexWrap: "wrap" },
            },
          }}
        />
        <TextField
          size="small"
          label="Meaning / usage"
          placeholder="e.g. our company"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          autoComplete="off"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={current ? undefined : <AddRounded />}
          >
            {current ? "Save" : "Add"}
          </Button>
          {current && (
            <Button variant="outlined" onClick={onDone}>
              Cancel
            </Button>
          )}
        </Box>
      </Box>
    </Surface>
  );
}

function TermsList({
  editing,
  onEdit,
}: {
  editing: number;
  onEdit: (i: number) => void;
}) {
  const dictionary = useBench((s) => s.dictionary);
  const [q, setQ] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const { vb } = useTheme();
  const needle = q.trim().toLowerCase();
  const shown = dictionary
    .map((e, i) => [e, i] as const)
    .filter(
      ([e]) =>
        !needle ||
        [e.term, e.meaning, ...e.heard]
          .join(" ")
          .toLowerCase()
          .includes(needle),
    );
  const cols = {
    xs: "1fr",
    md: "minmax(0,1fr) minmax(0,1.4fr) minmax(0,1.2fr) 88px",
  };
  return (
    <Surface>
      <SectionHead
        title={
          <>
            Terms
            <Box
              component="span"
              className="tabular"
              sx={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "text.secondary",
                border: `1px solid ${vb.line}`,
                px: 0.9,
                borderRadius: 999,
                fontFamily: (t) => t.typography.fontFamily,
              }}
            >
              {dictionary.length}
            </Box>
          </>
        }
      >
        <Box
          sx={{
            ml: "auto",
            display: "flex",
            gap: 0.75,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            size="small"
            placeholder="Filter"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <SearchRounded
                    sx={{ fontSize: 18, color: "text.secondary", mr: 0.5 }}
                  />
                ),
              },
              htmlInput: { "aria-label": "Filter terms" },
            }}
            sx={{ width: { xs: "100%", sm: 200 } }}
          />
          <Button
            size="small"
            startIcon={<FileDownloadRounded fontSize="small" />}
            onClick={() =>
              download(
                "voice-bench-memory.json",
                new Blob([JSON.stringify(dictionary, null, 2)], {
                  type: "application/json",
                }),
              )
            }
          >
            Export
          </Button>
          <Button
            size="small"
            startIcon={<FileUploadRounded fontSize="small" />}
            onClick={() => file.current?.click()}
          >
            Import
          </Button>
          <Tooltip title="Restore the sample dictionary">
            <Button
              size="small"
              startIcon={<RestartAltRounded fontSize="small" />}
              onClick={() => saveDictionary(sampleDictionary())}
              sx={{ "&:hover": { color: vb.rec } }}
            >
              Reset
            </Button>
          </Tooltip>
          <input
            ref={file}
            type="file"
            hidden
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const d = JSON.parse(await f.text()) as unknown;
                if (Array.isArray(d))
                  saveDictionary(
                    d
                      .filter(
                        (
                          x,
                        ): x is {
                          term: unknown;
                          heard?: unknown;
                          meaning?: unknown;
                        } =>
                          !!x &&
                          typeof x === "object" &&
                          "term" in x &&
                          !!x.term,
                      )
                      .map((x) => ({
                        term: String(x.term),
                        heard: Array.isArray(x.heard)
                          ? x.heard.map(String)
                          : [],
                        meaning: String(x.meaning || ""),
                      })),
                  );
              } catch {
                /* not a dictionary file */
              }
            }}
          />
        </Box>
      </SectionHead>
      <Box
        sx={{
          display: { xs: "none", md: "grid" },
          gridTemplateColumns: cols.md,
          gap: 2,
          px: 2.5,
          py: 1,
          borderBottom: `1px solid ${vb.line}`,
        }}
      >
        {["Term", "Also heard as", "Meaning", ""].map((h) => (
          <Typography
            key={h}
            variant="overline"
            sx={{ color: "text.secondary" }}
          >
            {h}
          </Typography>
        ))}
      </Box>
      {!shown.length ? (
        <Typography sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
          {needle
            ? "No terms match."
            : "Nothing taught yet. Add the names and jargon the engines keep getting wrong."}
        </Typography>
      ) : (
        shown.map(([e, i], n) => (
          <Box
            key={i}
            sx={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: { xs: 0.75, md: 2 },
              alignItems: "center",
              px: { xs: 2, md: 2.5 },
              py: 1.5,
              borderTop: n ? `1px solid ${vb.line}` : "none",
              bgcolor: editing === i ? vb.accentSoft : "transparent",
              transition: "background-color 200ms",
              "&:hover .vb-row-actions": { opacity: 1 },
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontFamily: (t) => t.typography.h3.fontFamily,
              }}
            >
              {e.term}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {e.heard.length ? (
                e.heard.map((h) => (
                  <Chip key={h} size="small" variant="outlined" label={h} />
                ))
              ) : (
                <Typography
                  sx={{ color: "text.secondary", fontSize: "0.8125rem" }}
                >
                  —
                </Typography>
              )}
            </Box>
            <Typography sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
              {e.meaning}
            </Typography>
            <Box
              className="vb-row-actions"
              sx={{
                display: "flex",
                gap: 0.25,
                justifyContent: { md: "flex-end" },
                opacity: { md: 0.55 },
                transition: "opacity 180ms",
              }}
            >
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  aria-label={`Edit ${e.term}`}
                  onClick={() => onEdit(i)}
                >
                  <EditRounded fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  aria-label={`Delete ${e.term}`}
                  onClick={() => {
                    saveDictionary(dictionary.filter((_x, k) => k !== i));
                    if (editing === i) onEdit(-1);
                  }}
                  sx={{ "&:hover": { color: vb.rec } }}
                >
                  <DeleteOutlineRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ))
      )}
    </Surface>
  );
}

function ContextCard() {
  const context = useBench((s) => s.context);
  return (
    <Surface>
      <SectionHead
        title="Context"
        hint="one sentence about who is talking and about what — it helps every judgement"
      />
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        <TextField
          fullWidth
          size="small"
          placeholder="e.g. payments platform team, weekly engineering sync"
          value={context}
          onChange={(e) => {
            storage.setRaw("asr-bench-context", e.target.value);
            setState({ context: e.target.value });
          }}
          slotProps={{ htmlInput: { "aria-label": "Meeting context" } }}
        />
      </Box>
    </Surface>
  );
}

export function DictionaryView() {
  const [editing, setEditing] = useState(-1);
  return (
    <Page>
      <PageHeader title="Memory" art="dict">
        Teach it the words that matter to you: your product names, people and
        jargon, with how they tend to be heard. A word that merely sounds like a
        term is judged, never blindly replaced — when you meant the ordinary
        word, it stays.
      </PageHeader>
      <TermForm key={editing} editing={editing} onDone={() => setEditing(-1)} />
      <ContextCard />
      <TermsList editing={editing} onEdit={setEditing} />
    </Page>
  );
}

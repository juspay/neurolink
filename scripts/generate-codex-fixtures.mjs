#!/usr/bin/env node
// Generates synthetic-but-structurally-faithful Codex CLI wire-capture fixtures.
//
// Shape is modeled on a real redacted codex_exec/0.155.1 capture
// (~/.neurolink/reference/codex-cli-wire-sample.json), which is NOT available
// in this environment, so these are hand-built to match its documented shape:
//   - no top-level `instructions` field; role:"developer" messages carry the
//     system prompt instead (split across several turns)
//   - tools do NOT appear as a top-level `tools` array; they ride inside an
//     `input` item of type "additional_tools" under role:"developer"
//   - tools are grouped into two namespaces: "functions" and "collaboration"
//   - the "exec" tool lives in "collaboration", is type:"custom", and is
//     described with a Lark grammar instead of a JSON schema
//   - two Codex-specific beta headers gate optional server behavior:
//       x-codex-beta-features: remote_compaction_v2
//       x-openai-internal-codex-responses-lite: true
//
// All values below (tokens, paths, account/session ids) are synthetic
// placeholders — nothing here was copied from a real capture.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "test", "fixtures");

const EXEC_GRAMMAR = String.raw`
start: command
command: WORD (" " ARG)*
WORD: /[a-zA-Z0-9_\-\.\/]+/
ARG: /[^\n]+/
`.trim();

const FUNCTION_TOOLS = [
  {
    type: "function",
    name: "read_file",
    description: "Read a UTF-8 text file from the workspace.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" },
        offset: { type: "integer" },
        limit: { type: "integer" },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "apply_patch",
    description: "Apply a unified-diff style patch to one or more files.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        patch: { type: "string" },
      },
      required: ["patch"],
      additionalProperties: false,
    },
  },
];

const COLLABORATION_TOOLS = [
  {
    type: "custom",
    name: "exec",
    description:
      "Execute a shell command in the sandboxed workspace and return stdout/stderr.",
    format: { type: "grammar", syntax: "lark", definition: EXEC_GRAMMAR },
  },
  {
    type: "function",
    name: "request_review",
    description: "Ask the operator to review a proposed change before applying it.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string" },
      },
      required: ["summary"],
      additionalProperties: false,
    },
  },
];

const DEVELOPER_MESSAGES = [
  "You are Codex, a coding agent operating inside a local sandbox. Follow the operator's instructions and the tool contracts exactly.",
  "Sandbox policy: workspace-write, network access is restricted unless explicitly approved. Never exfiltrate secrets.",
  "Tool usage: prefer `apply_patch` for file edits over raw shell redirection. Use `exec` only for commands, not for editing files directly.",
  "Output formatting: keep responses concise; summarize diffs instead of pasting full file contents when the file is large.",
];

// Namespace-array shape (corrected: matches the real captured wire sample,
// ~/.neurolink/reference/codex-cli-wire-sample.json — additional_tools.tools
// is an array of namespace objects, each declaration discriminated by its own
// `type` field, never by which namespace it sits in — not the flat
// `{functions, collaboration}` object this generator emitted before).
function additionalToolsItem() {
  return {
    type: "additional_tools",
    role: "developer",
    tools: [
      {
        type: "namespace",
        name: "functions",
        description: "General-purpose workspace tools.",
        tools: FUNCTION_TOOLS,
      },
      {
        type: "namespace",
        name: "collaboration",
        description: "Tools for executing commands and coordinating with the operator.",
        tools: COLLABORATION_TOOLS,
      },
    ],
  };
}

function developerMessageItems() {
  return DEVELOPER_MESSAGES.map((text) => ({
    type: "message",
    role: "developer",
    content: [{ type: "input_text", text }],
  }));
}

function userMessageItem(text) {
  return {
    type: "message",
    role: "user",
    content: [{ type: "input_text", text }],
  };
}

function functionCallOutputItem(
  callId = "call_synthetic_0001",
  output = JSON.stringify({
    stdout: "total 0\ndrwxr-xr-x  2 codex  staff  64 Jan  1 00:00 .\n",
    stderr: "",
    exit_code: 0,
  }),
) {
  return {
    type: "function_call_output",
    call_id: callId,
    output,
  };
}

function functionCallItem(
  callId = "call_synthetic_0001",
  name = "exec",
  args = "ls -la",
) {
  return {
    type: "function_call",
    call_id: callId,
    name,
    arguments: args,
  };
}

function baseHeaders({ betaCompaction, betaResponsesLite }) {
  const headers = {
    authorization: "Bearer REDACTED",
    "content-type": "application/json",
    "openai-beta": "responses=experimental",
    "user-agent": "codex_cli_rs/0.155.1 (macOS; arm64)",
  };
  if (betaCompaction) {
    headers["x-codex-beta-features"] = "remote_compaction_v2";
  }
  if (betaResponsesLite) {
    headers["x-openai-internal-codex-responses-lite"] = "true";
  }
  return headers;
}

function baseBody({ input, sessionId, threadId }) {
  const body = {
    model: "gpt-5-codex",
    stream: true,
    store: false,
    input,
  };
  // Corrected placement (matches the real captured wire sample): session_id/
  // thread_id live nested inside client_metadata, never at the top level —
  // this fixture previously put them at the top level, which is exactly the
  // shape the design wrongly attributed to real traffic.
  if (sessionId || threadId) {
    body.client_metadata = {
      ...(sessionId ? { session_id: sessionId } : {}),
      ...(threadId ? { thread_id: threadId } : {}),
    };
  }
  return body;
}

function buildFixture({ fixtureMeta, mode, betaCompaction, betaResponsesLite, sessionId, threadId, extraInputItems = [], userTexts }) {
  const input = [
    additionalToolsItem(),
    ...developerMessageItems(),
    userMessageItem(userTexts[0]),
    userMessageItem(userTexts[1]),
    ...extraInputItems,
  ];

  return {
    _fixtureMeta: {
      ...fixtureMeta,
      generatedBy: "scripts/generate-codex-fixtures.mjs",
      basedOn:
        "~/.neurolink/reference/codex-cli-wire-sample.json (redacted codex_exec/0.155.1 capture; shape only, not copied verbatim)",
      mode,
    },
    method: "POST",
    url: "https://REDACTED/backend-api/codex/responses",
    headers: baseHeaders({ betaCompaction, betaResponsesLite }),
    body: baseBody({ input, sessionId, threadId }),
  };
}

const fixtures = [
  {
    file: "codex-request-exec-mode.json",
    data: buildFixture({
      fixtureMeta: {
        variation:
          "codex exec (non-interactive) mode, both beta headers present, fresh session (no session/thread id)",
      },
      mode: "exec",
      betaCompaction: true,
      betaResponsesLite: true,
      userTexts: [
        "Run the test suite and fix any failing tests in src/utils.",
        "<environment_context>cwd=/workspace/repo approval_policy=never sandbox=workspace-write</environment_context>",
      ],
    }),
  },
  {
    file: "codex-request-interactive-mode.json",
    data: buildFixture({
      fixtureMeta: {
        variation:
          "interactive (TTY) mode, neither beta header present, fresh session (no session/thread id)",
      },
      mode: "interactive",
      betaCompaction: false,
      betaResponsesLite: false,
      userTexts: [
        "Can you add input validation to the login form?",
        "<environment_context>cwd=/workspace/repo approval_policy=on-request sandbox=workspace-write</environment_context>",
      ],
    }),
  },
  {
    file: "codex-request-resumed-session.json",
    data: buildFixture({
      fixtureMeta: {
        variation:
          "resumed session: carries session_id and thread_id from a prior turn; both beta headers present",
      },
      mode: "interactive",
      betaCompaction: true,
      betaResponsesLite: true,
      sessionId: "sess_synthetic_00000000000000000000",
      threadId: "thread_synthetic_00000000000000000000",
      userTexts: [
        "Continue from where we left off and finish the refactor.",
        "<environment_context>cwd=/workspace/repo approval_policy=on-request sandbox=workspace-write</environment_context>",
      ],
    }),
  },
  {
    file: "codex-request-tool-result-turn.json",
    data: buildFixture({
      fixtureMeta: {
        variation:
          "a turn carrying a prior function_call plus its function_call_output (tool result) in the input array, exec mode, both beta headers present",
      },
      mode: "exec",
      betaCompaction: true,
      betaResponsesLite: true,
      extraInputItems: [functionCallItem(), functionCallOutputItem()],
      userTexts: [
        "List the files in the current directory and summarize the layout.",
        "<environment_context>cwd=/workspace/repo approval_policy=never sandbox=workspace-write</environment_context>",
      ],
    }),
  },
  {
    file: "codex-request-parallel-tool-calls.json",
    data: buildFixture({
      fixtureMeta: {
        variation:
          "2 consecutive function_call items (one JSON args, one non-JSON args) then 2 consecutive function_call_output items, exec mode, both beta headers present",
      },
      mode: "exec",
      betaCompaction: true,
      betaResponsesLite: true,
      extraInputItems: [
        functionCallItem("call_synthetic_0001", "exec", "ls -la"),
        functionCallItem(
          "call_synthetic_0002",
          "read_file",
          JSON.stringify({ path: "src/index.ts" }),
        ),
        functionCallOutputItem("call_synthetic_0001"),
        functionCallOutputItem(
          "call_synthetic_0002",
          JSON.stringify({ content: "export {};\n" }),
        ),
      ],
      userTexts: [
        "Read src/index.ts after listing the directory.",
        "<environment_context>cwd=/workspace/repo approval_policy=never sandbox=workspace-write</environment_context>",
      ],
    }),
  },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const { file, data } of fixtures) {
  const outPath = path.join(OUT_DIR, file);
  writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`wrote ${path.relative(process.cwd(), outPath)}`);
}

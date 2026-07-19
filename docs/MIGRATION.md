# Migration Guide: Breaking Changes

This document tracks **breaking changes** shipped in specific NeuroLink
releases — changes to public SDK/CLI surface that require an update on the
consumer side, as opposed to the additive/backward-compatible changes covered
by [`docs/guides/migration-guide.md`](./guides/migration-guide.md) and the
auto-generated changelog (see the
[GitHub releases page](https://github.com/juspay/neurolink/releases)).

Three breaking changes shipped across 9.94.x–9.95.x. Each is intentional and
stays as shipped — this document exists so downstream consumers know what
changed and how to adapt.

## Policy

Per this repository's `CLAUDE.md` (Critical Rule 5), the public SDK API must
not break existing callers. The three breaking changes below shipped in
9.94.x–9.95.x without an accompanying migration path and are documented here
retroactively. Going forward, any breaking change **must** ship its migration
path in the same release that introduces it — not documented after the fact.

---

## 1. Multimodal file/CSV processing is now fail-loud (v9.94.6)

**What changed:** `generate()`/`stream()` calls that attach files via
`input.files` (auto-detected) or `input.csvFiles` (explicit CSV) now **throw**
on the first file that fails to process, instead of logging a warning and
silently continuing with the files that did succeed.

- `processUnifiedFilesArray()` (`src/lib/utils/messageBuilder.ts`) throws
  `ErrorFactory.fileProcessingFailed(filename, originalError)` on any file in
  `input.files` that fails detection/processing.
- `processExplicitCsvFiles()` (same file) throws
  `ErrorFactory.csvProcessingFailed(filename, originalError)` on any file in
  `input.csvFiles` that fails to parse.

Both errors are typed `NeuroLinkError`s (`ERROR_CODES.FILE_PROCESSING_FAILED`
/ `ERROR_CODES.CSV_PROCESSING_FAILED`, see `src/lib/utils/errorHandling.ts`)
that carry the original error as `.originalError` and the failing filename in
`.context.filename`.

**Why:** the previous log-and-skip behavior silently produced a partial
prompt — e.g. attaching 5 files and having one silently drop meant the model
answered as if that file never existed, with no signal to the caller or the
end user that anything was missing. A model call that appears to succeed but
is actually missing part of its input is worse than a call that fails loudly.

**Before (9.94.5 and earlier):**

```typescript
// One corrupt/unreadable file among several silently dropped; the request
// still succeeded using only the files that processed cleanly.
const result = await neurolink.generate({
  input: { text: "Summarize these", files: ["a.pdf", "corrupt.pdf", "b.pdf"] },
});
// result.content summarizes only a.pdf and b.pdf — no error, no warning
// visible to the caller beyond a log line.
```

**After (9.94.6+):**

```typescript
try {
  const result = await neurolink.generate({
    input: {
      text: "Summarize these",
      files: ["a.pdf", "corrupt.pdf", "b.pdf"],
    },
  });
} catch (error) {
  if (
    error instanceof NeuroLinkError &&
    error.code === "FILE_PROCESSING_FAILED"
  ) {
    // error.context.filename === "corrupt.pdf"
    // error.originalError is the underlying cause
  }
  throw error;
}
```

**How to adapt:**

- Wrap multi-file `generate()`/`stream()` calls in `try`/`catch` if you were
  previously relying on partial success.
- If you want the old best-effort behavior, pre-validate/pre-filter files
  yourself before passing them in `input.files`/`input.csvFiles`, or catch the
  typed error, drop the failing filename (`error.context.filename`), and
  retry without it.
- CSV-specific failures (`input.csvFiles`) and generic file failures
  (`input.files`) now throw _different_ error codes — branch on
  `error.code` if you need to distinguish them.

---

## 2. `MessageContent` dropped its open index signature (v9.94.6)

**What changed:** the exported `MessageContent` type
(`src/lib/types/multimodal.ts`, re-exported via `src/lib/types/index.ts` and
the package root) no longer has a `[key: string]: unknown` index signature.
It's now a closed shape with the concrete fields the pipeline actually reads:
`type`, `text`, `image`, `mimeType`, `data`, `name`, `filename`,
`toolCallId`, `toolName`, `args`, `result`, `isError`, `providerOptions`.

**Why:** the open index signature let any typo or unrelated key through
type-checking unchecked (e.g. `{ type: "text", txt: "..." }` compiled fine
and silently produced empty content). Closing it catches that class of bug at
compile time for everyone building `MessageContent[]` arrays directly.

**Before:**

```typescript
import type { MessageContent } from "@juspay/neurolink";

// Compiled fine even though "customField" isn't a real MessageContent key —
// the typo/extra field was silently accepted.
const item: MessageContent = {
  type: "text",
  text: "hello",
  customField: "some app-specific metadata",
};
```

**After:**

```typescript
import type { MessageContent } from "@juspay/neurolink";

// TS2353: Object literal may only specify known properties, and
// 'customField' does not exist in type 'MessageContent'.
const item: MessageContent = {
  type: "text",
  text: "hello",
  customField: "some app-specific metadata", // ❌ no longer type-checks
};
```

**How to adapt:**

- If you were attaching arbitrary metadata to a `MessageContent` item,
  use the dedicated `providerOptions?: Record<string, unknown>` field instead
  — it's read by `MessageBuilder` when converting to `ModelMessage[]` and is
  the intended extension point.
- If you genuinely need a field NeuroLink doesn't model, open an issue —
  `MessageContent` intentionally stays a closed, hand-maintained shape rather
  than reopening a blanket index signature (see the `#325` comment on the
  type itself).
- Runtime behavior is unchanged — this is a compile-time-only break. Plain
  JavaScript callers, or TypeScript callers that never annotated a literal
  as `MessageContent` explicitly, are unaffected.

---

## 3. `BatchCommandArgs.file` renamed to `.promptsFile` (v9.95.1)

**What changed:** the public CLI argument type `BatchCommandArgs`
(`src/lib/types/cli.ts`) renamed its `file?: string` property to
`promptsFile?: string`.

**Why:** yargs implicitly registers a positional argument's key as a
recognized flag name too. Keeping the property named `file` collided with
the _unrelated_ common `--file` auto-detect flag that the `batch` command
intentionally does not register — `--file` on `batch` would silently pass
`strictOptions()` without actually doing anything. Renaming the positional's
backing property to `promptsFile` removes that collision.

**Before:**

```typescript
import type { BatchCommandArgs } from "@juspay/neurolink";

function handleBatch(argv: BatchCommandArgs) {
  const promptsListPath = argv.file; // ❌ no longer exists
}
```

**After:**

```typescript
import type { BatchCommandArgs } from "@juspay/neurolink";

function handleBatch(argv: BatchCommandArgs) {
  const promptsListPath = argv.promptsFile; // ✅
}
```

**How to adapt:**

- Update any code that constructs or reads a `BatchCommandArgs` object
  directly (custom CLI wrappers, tests) to use `.promptsFile` instead of
  `.file`.
- The CLI's own `<promptsFile>` positional argument and its behavior are
  unchanged — this is a type-only rename of the property NeuroLink's own
  `batch` command handler reads internally; end users invoking
  `neurolink batch <promptsFile>` on the command line see no difference.

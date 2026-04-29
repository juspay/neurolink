# Execution Agent Prompt: Remove Google AI SDK Dependencies, Vertex-Protected Milestone

## Role

You are the execution agent. The orchestrator has already audited the current
branch and narrowed the work. Your job is to execute the first milestone only:
remove the Google-specific AI SDK packages from the NeuroLink core dependency
graph while preserving current Google AI Studio and, especially, Vertex behavior.

Work in small cycles. Use the existing continuous test suites as the regression
base. Add focused characterization tests where the existing suites do not
directly cover a risky behavior. Do not stop at analysis; implement, verify,
and report.

## Critical Scope Decision

The original broad goal was to remove all AI SDK runtime dependencies from core.
That is not this milestone.

This first milestone is intentionally smaller:

1. Remove `@ai-sdk/google`.
2. Remove `@ai-sdk/google-vertex`.
3. Remove every production dependency path that pulls either package.
4. Preserve behavior for Google AI Studio, Vertex Gemini, and Claude-on-Vertex.
5. Treat Vertex users as the protected path because they are currently the
   highest-volume users.

Do not remove the remaining AI SDK packages in this milestone unless a very
narrow local edit is required to remove the two banned Google packages.

## Highest Priority

Vertex is the highest-priority provider surface for this milestone.

If a choice must be made between a smaller dependency change and protecting
Vertex behavior, protect Vertex behavior and continue looking for a lower-impact
dependency solution. The accepted result is not "Google packages are gone but
Vertex regressed." The accepted result is "Google packages are gone and Vertex
users should not notice a behavior change."

## Current Branch State

Audited on 2026-05-03 in:

```bash
/Users/sachinsharma/Developer/temp/neurolink-fork/feat/remove-ai-sdk-google
```

Branch shown by `git status --short --branch`:

```text
## feat/native-google-anthropic-vertex-v2...origin/feat/native-google-anthropic-vertex-v2
?? docs/plans/2026-05-02-remove-aisdk-execution-agent-prompt.md
```

Current package version in `package.json`:

```text
@juspay/neurolink@9.61.0
```

Direct Google AI SDK dependencies are already absent from `package.json`.
Native Google provider code is already present:

- `src/lib/providers/googleAiStudio.ts` routes through native `@google/genai`.
- `src/lib/providers/googleVertex.ts` routes Vertex Gemini through native
  `@google/genai`.
- `src/lib/providers/googleVertex.ts` routes Claude-on-Vertex through native
  `@anthropic-ai/vertex-sdk`.

However, the dependency graph is not clean. `pnpm why` still shows the banned
packages via a transitive path.

```bash
pnpm why @ai-sdk/google @ai-sdk/google-vertex
```

Current output:

```text
Legend: production dependency, optional only, dev only

@juspay/neurolink@9.61.0 /Users/sachinsharma/Developer/temp/neurolink-fork/feat/remove-ai-sdk-google

dependencies:
@juspay/hippocampus 0.1.4
`-- @juspay/neurolink 9.37.0 peer
    |-- @ai-sdk/google 3.0.61
    `-- @ai-sdk/google-vertex 4.0.106
        `-- @ai-sdk/google 3.0.61
```

This milestone is incomplete until that output shows no production dependency
path to the banned Google AI SDK packages.

## Banned Packages

For this milestone, these packages and subpaths are banned from production
dependencies and provider implementation code:

```text
@ai-sdk/google
@ai-sdk/google-vertex
@ai-sdk/google-vertex/anthropic
```

The ban applies to:

- `dependencies`
- `optionalDependencies`
- production lockfile package snapshots
- source imports
- generated bundles if they are part of the committed/published output
- any transitive production dependency path shown by `pnpm why`

The ban does not require deleting historical docs or explanatory comments unless
they are used by a guard that would otherwise fail. Prefer a dependency-aware
guard over a naive all-repo text grep.

## Allowed Dependencies In This Milestone

The current Google implementation may continue to use individual provider SDKs:

```text
@google/genai
@anthropic-ai/vertex-sdk
google-auth-library
@google-cloud/text-to-speech
@google-cloud/vertexai
```

The following AI SDK packages are explicitly out of scope for this milestone and
must not be removed as part of the Google-only work:

```text
ai
@ai-sdk/openai
@ai-sdk/anthropic
@ai-sdk/azure
@ai-sdk/mistral
@ai-sdk/provider
@ai-sdk/provider-utils
@openrouter/ai-sdk-provider
```

There are still imports from `ai` throughout the codebase, including type imports
and helper utilities. Leave them alone unless a local compile error from your
Google-only change requires a minimal adjustment.

## Non-Goals

Do not execute the full no-AISDK migration in this milestone.

Do not rewrite every provider.

Do not replace OpenAI, Anthropic, Azure, Mistral, OpenRouter, Bedrock, Ollama, or
other provider internals.

Do not remove browser exports of non-Google AI SDK helpers in
`src/browser/entry.ts`; that is future work.

Do not redesign the provider architecture unless a tiny targeted change is the
lowest-risk way to preserve Google/Vertex behavior.

Do not remove memory support unless it is impossible to remove the transitive
Google AI SDK dependency while keeping `@juspay/hippocampus` as a direct runtime
dependency. If you must change memory packaging, keep it backward-compatible and
document the installation/runtime behavior.

## Acceptance Criteria

### Dependency Acceptance

All must pass:

```bash
pnpm why @ai-sdk/google @ai-sdk/google-vertex
```

Expected result: no production dependency path to either package.

```bash
rg -n "\"@ai-sdk/google\"|\"@ai-sdk/google-vertex\"|@ai-sdk/google-vertex/anthropic" package.json pnpm-lock.yaml src test scripts -g '!**/node_modules/**' -g '!dist/**' -g '!action-dist/**'
```

Expected result:

- no `package.json` dependency entry for banned packages
- no `pnpm-lock.yaml` package snapshot for banned packages
- no source import of banned packages
- no test mock import of banned packages unless it is intentionally testing that
  the package is absent

Historical docs may still mention the old packages.

### Provider Behavior Acceptance

Vertex must be protected first:

- Vertex Gemini `generate` still works.
- Vertex Gemini `stream` still works.
- Vertex Gemini tool calling still works.
- Vertex Gemini structured output still works without tools.
- Vertex Gemini structured output with tools still works through the existing
  `final_result` pattern, or an explicitly documented equivalent.
- Vertex Gemini conversation history still works.
- Vertex Gemini multimodal input still works for images/PDF/CSV where already
  supported.
- Vertex Gemini image model behavior remains compatible.
- Vertex Claude `generate` still works.
- Vertex Claude `stream` still works.
- Vertex Claude tool calling still works.
- Vertex Claude structured output still works through the existing `final_result`
  pattern.
- Vertex Claude conversation history uses the current NeuroLink
  `conversationMessages` path.
- Vertex auth, project, location, global endpoint routing, proxy fetch, timeout,
  abort, and error formatting behavior do not regress.
- Analytics, evaluation, tracing, tool result metadata, and usage accounting do
  not silently disappear on native Vertex paths.

Google AI Studio must remain compatible:

- Google AI Studio `generate` still works.
- Google AI Studio `stream` still works.
- Google AI Studio tool calling still works.
- Google AI Studio structured output is enforced when requested and tools are
  disabled for the request.
- Google AI Studio conversation history still works.
- Google AI Studio audio streaming and image behavior remain compatible where
  already supported.
- Analytics, evaluation, tracing, tool result metadata, and usage accounting do
  not silently disappear on native Google AI Studio paths.

### Build And Test Acceptance

Run at least the targeted verification suite below. If a command cannot run
because credentials or local services are unavailable, the suite must skip only
for that expected reason. Auth, quota, and unavailable-model skips are acceptable
only when the test suite already treats them as expected provider environment
conditions.

```bash
pnpm install
pnpm run check
pnpm run build
pnpm run test:providers
pnpm run test:tool-reliability
pnpm run test:observability
pnpm run test:tracing
pnpm run test:bugfixes
```

Run provider-focused slices where credentials are available:

```bash
TEST_PROVIDER=vertex pnpm run test:providers
TEST_PROVIDER=google-ai pnpm run test:providers
TEST_PROVIDER=google-ai-studio pnpm run test
TEST_PROVIDER=vertex TEST_MODEL=gemini-2.5-flash pnpm run test:providers
TEST_PROVIDER=vertex TEST_MODEL=<current-vertex-claude-model> pnpm run test:providers
```

Use the provider alias accepted by the target suite. The main provider suite
defaults to `TEST_PROVIDER=vertex` and uses `google-ai` in its provider list.
Some older scripts still refer to `google-ai-studio`; verify aliases before
treating a failure as behavioral.

Because many continuous suites import from `dist`, build before running tests
that import `../dist/index.js`.

### Reporting Acceptance

Final report must include:

- exact files changed
- exact dependency graph before and after
- exact tests run
- tests skipped and why
- any behavior intentionally left unchanged
- any future full-AISDK-removal items not completed in this milestone

## Execution Rules

Use conservative, low-impact changes.

Use structured package/dependency checks instead of broad text deletion.

Prefer existing helpers and patterns in `BaseProvider`, `MessageBuilder`,
`googleNativeGemini3.ts`, `ToolsManager`, and provider-specific code.

Freeze behavior with tests before changing risky provider paths.

Do not revert unrelated local changes.

Do not edit generated `dist` files manually. If repository practice requires
updating generated output, run the build that produces it and inspect the diff.

Do not hide real provider regressions behind broad "expected provider error"
matching. Existing test suites intentionally skip missing credentials and
transport setup; configured providers returning auth/billing/quota or request
shape errors should be investigated.

## Baseline Commands

Run these first and save the important output in your notes:

```bash
git status --short --branch
pnpm why @ai-sdk/google @ai-sdk/google-vertex
pnpm view @juspay/hippocampus version dependencies peerDependencies --json
pnpm view @juspay/hippocampus versions --json
rg -n "\"@ai-sdk/google\"|\"@ai-sdk/google-vertex\"|@ai-sdk/google-vertex/anthropic" package.json pnpm-lock.yaml src test scripts -g '!**/node_modules/**' -g '!dist/**' -g '!action-dist/**'
rg -n "@juspay/hippocampus|hippocampus|Hippocampus" package.json pnpm-lock.yaml src scripts docs -g '!**/node_modules/**' -g '!dist/**' -g '!action-dist/**'
rg -n "conversationMessages|conversationHistory|buildNativeConfig|executeNativeGemini3|executeNativeAnthropic|disableTools|enhanceResult" src/lib/providers src/lib/core src/lib/neurolink.ts
```

Current audit found:

```text
pnpm view @juspay/hippocampus version dependencies peerDependencies --json
{
  "version": "0.1.6",
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0",
    "redis": "^4.0.0"
  },
  "peerDependencies": {
    "@juspay/neurolink": ">=9.0.0",
    "better-sqlite3": ">=11.0.0"
  }
}
```

As of this audit, the latest `@juspay/hippocampus` is `0.1.6`, but it still has
a peer dependency on `@juspay/neurolink`. Do not assume bumping Hippocampus alone
fixes the transitive old-NeuroLink resolution. Verify with `pnpm why`.

## Current Progress Already Made

Do not redo this work unless tests prove it is broken.

1. `package.json` no longer has direct `@ai-sdk/google` or
   `@ai-sdk/google-vertex` dependencies.
2. `src/lib/providers/googleAiStudio.ts` imports native `@google/genai`
   dynamically and throws if any unexpected `getAISDKModel()` path is used.
3. `src/lib/providers/googleVertex.ts` imports native `@google/genai`
   dynamically for Gemini.
4. `src/lib/providers/googleVertex.ts` uses `@anthropic-ai/vertex-sdk` for
   Claude-on-Vertex.
5. `src/lib/providers/googleNativeGemini3.ts` contains shared native Gemini
   helpers for schema sanitization, tool declaration conversion, stream chunk
   collection, tool execution, and thought-signature-preserving history.
6. `BaseProvider.stream()` already pre-merges tools with
   `getToolsForStream(options)` before calling provider `executeStream()`.
7. `BaseProvider.prepareGenerationContext()` already merges tools for the base
   AI SDK generate path, but it is private and is bypassed by provider-level
   `generate()` overrides.

## Known Gaps And Issues

### 1. Transitive Google AI SDK Dependency Through Hippocampus

This is the primary dependency blocker.

Current `package.json` has:

```json
"@juspay/hippocampus": "^0.1.4"
```

Current `pnpm-lock.yaml` root importer resolves it as:

```text
'@juspay/hippocampus':
  specifier: ^0.1.4
  version: 0.1.4(@juspay/neurolink@9.37.0(...))
```

Current lockfile package section includes:

```text
'@juspay/hippocampus@0.1.4(@juspay/neurolink@9.37.0(...))':
  dependencies:
    '@aws-sdk/client-s3': 3.1019.0
    '@juspay/neurolink': 9.37.0(...)
    redis: 4.7.1
```

That old registry copy of NeuroLink then pulls:

```text
@ai-sdk/google: 3.0.61
@ai-sdk/google-vertex: 4.0.106
```

Root cause:

- NeuroLink depends on `@juspay/hippocampus`.
- `@juspay/hippocampus` declares a peer dependency on `@juspay/neurolink`.
- Because the current project is itself `@juspay/neurolink`, pnpm resolves that
  peer to a registry copy rather than to the local package.
- The registry copy is old and still depends on the Google AI SDK wrappers.

Candidate fixes, in preferred order:

1. Try bumping `@juspay/hippocampus` to the latest published version and running
   `pnpm install`, but verify. The current audit shows latest `0.1.6` still has
   a NeuroLink peer, so this may not be sufficient.
2. If Hippocampus still resolves a registry NeuroLink peer, break the circular
   runtime dependency. The lowest-risk product shape is usually:
   - make the Hippocampus integration optional/dynamic at runtime
   - remove `@juspay/hippocampus` from required production `dependencies`
   - keep type safety through a local structural type or an optional peer type
   - give a clear runtime error or warning only when memory is enabled but the
     package is missing
   - update memory docs if users must install `@juspay/hippocampus` separately
3. If an upstream Hippocampus package can be changed/published quickly, publish
   a version that does not peer-depend on `@juspay/neurolink`, then bump to it.
4. A pnpm-only override or package extension is acceptable only as a temporary
   development workaround. It is not enough for milestone acceptance unless a
   normal install of the package also avoids the banned Google AI SDK packages.

Files currently involved in Hippocampus integration:

- `package.json`
- `pnpm-lock.yaml`
- `src/lib/memory/hippocampusInitializer.ts`
- `src/lib/neurolink.ts`
- `src/lib/types/conversation.ts`
- `src/lib/types/common.ts`
- `scripts/build-browser.mjs`
- `scripts/bundle-cli.mjs`
- memory documentation under `docs/features/memory.md` and
  `docs/advanced/memory-integration.md`

Implementation notes if moving Hippocampus optional:

- Convert value imports to dynamic imports so importing NeuroLink core does not
  require loading Hippocampus.
- Avoid declaration files that force all consumers to install Hippocampus types
  unless Hippocampus remains a peer dependency.
- Prefer local structural types for public memory config if that avoids forcing
  the peer into every consumer's type graph.
- Keep existing memory behavior when the package is installed and memory is
  enabled.
- Ensure browser and CLI bundles still build.
- Revisit `scripts/bundle-cli.mjs`, which currently has a comment and stub plugin
  tied to the old Hippocampus peer pulling an old NeuroLink.

Acceptance for this gap:

```bash
pnpm why @ai-sdk/google @ai-sdk/google-vertex
```

must no longer show the Hippocampus -> old NeuroLink -> Google AI SDK path.

### 2. Direct Google AI SDK Imports Are Mostly Gone, But Guard Them

Current source has no direct implementation import of the banned packages. It
does contain comments such as:

```text
GoogleAIStudioProvider no longer uses @ai-sdk/google.
GoogleVertexProvider no longer uses @ai-sdk/google-vertex.
```

Those comments are fine. The guard should not force deleting useful explanatory
comments.

Add or update a dependency guard that checks actual manifests and lockfile
package entries. Prefer parsing `package.json` and `pnpm-lock.yaml` with a YAML
parser over regex-only checks. If you add a text scan, scope it to imports and
manifest keys, not all docs.

Suggested guard behavior:

- fail if root `package.json` has banned packages in dependencies,
  optionalDependencies, peerDependencies, or devDependencies unless a test-only
  dev dependency is explicitly justified
- fail if `pnpm-lock.yaml` has package snapshots for banned packages
- fail if source files import banned packages
- fail if `pnpm why` reports a production path to banned packages

### 3. Google AI Studio `generate()` Bypasses BaseProvider Features

`src/lib/providers/googleAiStudio.ts` overrides `generate()` and routes all
models through native `executeNativeGemini3Generate()`.

Risk:

- `BaseProvider.generate()` normally normalizes and validates options.
- `BaseProvider.generate()` normally handles video, direct TTS, image model
  routing, tool preparation, message building, analytics, evaluation, and final
  `enhanceResult()`.
- The Google AI Studio override bypasses most of that path.

Current Google AI Studio override behavior:

- Normalizes only a string prompt into `{ prompt }`.
- Trusts `options.tools || {}`.
- Does not call `getToolsForStream(options)` for direct provider usage.
- Disables tools when JSON/schema output is requested.
- Calls `executeNativeGemini3Generate()`.
- Does not call `enhanceResult()` on the returned native result.
- Does not accept/pass the optional `analysisSchema` argument.

Why this matters:

- SDK-level NeuroLink calls may already pre-process some options, but direct
  provider calls and edge paths can lose built-in/MCP tools.
- `enableAnalytics` and `enableEvaluation` can be silently ignored.
- TTS can be silently ignored.
- Image generation model routing can be bypassed.
- Structured output can request JSON but not receive native schema enforcement.
- Conversation history can be ignored by the native contents builder.

Low-impact target:

- Keep the native `@google/genai` route.
- Before native generation, merge tools with the existing protected helper
  `getToolsForStream(options)` when tools are not disabled.
- Preserve existing JSON/schema conflict behavior, but enforce JSON/schema when
  tools are disabled.
- Return through `enhanceResult()` or an equivalent shared enhancement path so
  analytics/evaluation/TTS-result semantics are preserved.
- Add tests to prove direct provider and SDK-level calls both preserve expected
  behavior.

### 4. Google AI Studio Structured Output Is Not Fully Enforced Natively

`src/lib/providers/googleNativeGemini3.ts` has `buildNativeConfig()` with:

```text
temperature
maxOutputTokens
tools
systemInstruction
thinkingConfig
```

It does not currently add:

```text
responseMimeType: "application/json"
responseSchema
```

The Google AI Studio provider disables tools when JSON/schema output is
requested, which avoids the Gemini limitation around combining function calling
with `responseMimeType`. But after tools are disabled, the native config still
needs to enforce JSON/schema output.

Vertex Gemini already has explicit native schema handling in
`googleVertex.ts`. Mirror the working parts carefully for AI Studio.

Rules to preserve:

- Gemini does not support tool/function calling with `responseMimeType:
"application/json"`.
- `responseSchema` requires `responseMimeType: "application/json"`.
- If tools are present and schema/JSON is requested, keep the current behavior
  of disabling tools for Google AI Studio unless you add a tested
  `final_result` pattern.
- If tools are disabled and schema/JSON is requested, set native JSON output
  config and schema.

Tests to add/freeze:

- Google AI Studio generate with `output.format = "json"` and no tools.
- Google AI Studio generate with Zod schema and no tools.
- Google AI Studio stream with `output.format = "json"` and no tools.
- Google AI Studio request with tools plus schema disables tools and does not
  send incompatible native config.

### 5. Google AI Studio Native Paths Ignore `conversationMessages`

The native AI Studio generate and stream paths build contents from only the
current input:

```text
[{ role: "user", parts: [{ text: promptText }] }]
```

They do not use `options.conversationMessages`.

This bypasses `MessageBuilder`, which maps `conversationMessages` into the AI
SDK message format for the base path.

Low-impact target:

- Add a small native Gemini content builder that maps supported
  `conversationMessages` roles into `@google/genai` contents.
- Map NeuroLink assistant messages to Gemini role `model`.
- Map NeuroLink user messages to Gemini role `user`.
- Decide how to handle system messages consistently with existing
  `systemPrompt` handling.
- Avoid duplicating the current user prompt if the calling layer already includes
  it in `conversationMessages`; inspect `src/lib/neurolink.ts` call sites before
  finalizing.
- Preserve thought-signature handling for tool-loop turns created inside the
  native request.

Tests to add/freeze:

- multi-turn Google AI Studio generate where the second prompt depends on an
  earlier user/assistant turn
- multi-turn Google AI Studio stream with the same expectation

### 6. Vertex `generate()` Bypasses BaseProvider Features

`src/lib/providers/googleVertex.ts` overrides `generate()` and routes:

- image models to `executeImageGeneration()`
- Claude models to `executeNativeAnthropicGenerate()`
- Gemini models to `executeNativeGemini3Generate()`

Risk:

- It bypasses `BaseProvider.generate()`.
- It does not call `enhanceResult()` for Gemini and Claude native results.
- It trusts `processedOptions.tools || {}` rather than merging built-in/MCP
  tools itself.
- It does not consistently respect `disableTools` in all native generate paths.
- It can lose analytics, evaluation, TTS, timeout, abort, and other base
  behavior.

Low-impact target:

- Keep the native routing.
- Before routing, prepare tools through `getToolsForStream(options)` when tools
  are not disabled.
- If `disableTools` is true, guarantee no native Gemini or Anthropic tools are
  sent even if `options.tools` is present.
- Return Gemini and Claude native generate results through `enhanceResult()` or
  an equivalent enhancement path.
- Preserve image model behavior and propagate analytics/evaluation from image
  generation into stream fallback results when applicable.

### 7. Vertex Gemini Native Generate Ignores `disableTools`

In `executeNativeGemini3Generate()`, tools are built from:

```text
const combinedTools = options.tools || {};
if (Object.keys(combinedTools).length > 0) {
  ...
}
```

There is no `!options.disableTools` guard in that local tool conversion.

In `executeNativeAnthropicGenerate()`, tools are built from:

```text
if (options.tools && Object.keys(options.tools).length > 0) {
  ...
}
```

Again, there is no `!options.disableTools` guard.

This matters because Vertex `generate()` bypasses `BaseProvider.generate()`.
If a caller passes `disableTools: true` and `tools`, the native path can still
send tools.

Acceptance:

- A focused test proves `disableTools: true` prevents native tool declaration
  sending and tool execution for Vertex Gemini generate.
- A focused test proves the same for Vertex Claude generate.
- Existing tool-calling tests still pass when tools are enabled.

### 8. Vertex Gemini Native Paths Ignore `conversationMessages`

Vertex Gemini native stream and generate build contents from current input and
multimodal parts. They do not include `options.conversationMessages`.

This is high priority because Vertex is the protected user path.

Low-impact target:

- Add or reuse a native Gemini content builder for Vertex.
- Prefer `options.conversationMessages` because that is what NeuroLink injects.
- If `conversationHistory` still exists for backwards compatibility, use it only
  as a fallback.
- Preserve multimodal current input behavior.
- Preserve internal tool-loop history with thought signatures.

Tests:

- Vertex Gemini generate uses `conversationMessages`.
- Vertex Gemini stream uses `conversationMessages`.
- Multimodal current input still works after adding history.

### 9. Vertex Claude Generate Uses Legacy `conversationHistory`

Vertex Claude stream already checks `options.conversationMessages`.

Vertex Claude generate checks only `options.conversationHistory`:

```text
if (options.conversationHistory && options.conversationHistory.length > 0) {
  ...
}
```

NeuroLink's current generation path injects `conversationMessages`. The generate
path should prefer:

```text
options.conversationMessages ?? options.conversationHistory
```

Tests:

- Vertex Claude generate includes `conversationMessages`.
- Vertex Claude generate still supports legacy `conversationHistory` if public
  compatibility requires it.

### 10. Vertex Gemini Tool Response Role Looks Wrong

Google AI Studio native tool responses use role `user`, with a comment:

```text
The @google/genai SDK only accepts "user" and "model" as valid roles in contents.
Function/tool responses must use role: "user".
```

Vertex Gemini native stream currently pushes function responses with:

```text
role: "function"
```

This likely diverges from `@google/genai` expectations and from the AI Studio
implementation.

Low-impact target:

- Verify with a focused test or native SDK documentation/behavior.
- If not valid, align Vertex Gemini with AI Studio and use role `user` for
  function responses.
- Preserve thought-signature model response parts before the function response.

Tests:

- Vertex Gemini multi-step tool call succeeds.
- Tool response is accepted by native `@google/genai`.
- No request-shape error is thrown for `role: "function"`.

### 11. Vertex Native Paths Need Timeout And Abort Parity

Google AI Studio native generate/stream composes `options.abortSignal` with a
timeout controller and passes the signal to `@google/genai`.

Vertex Gemini native stream/generate currently create the client and call
`generateContentStream()` without the same timeout/abort handling.

Vertex Claude native stream/generate also need timeout/abort review.

Why this matters:

- Vertex users are the protected path.
- Removing AI SDK wrappers also removes any timeout/abort semantics previously
  supplied by those wrappers.
- Native requests must not hang or ignore caller cancellation.

Low-impact target:

- Use the existing timeout utilities and provider error formatting.
- Pass abort signals through native SDK request options where supported.
- Add tests with an already-aborted signal or mocked slow request.

### 12. Vertex Stream Is Not Fully Incremental

Google AI Studio native stream returns a push-based channel and yields text as it
arrives.

Vertex Gemini native stream currently collects the full stream, sets `finalText`,
then returns an async generator that yields one final chunk.

Vertex Claude native stream uses Anthropic's streaming API internally but calls
`finalMessage()` and returns a one-chunk generator.

This may be preexisting, but it is a behavior gap to identify. Do not fix it
unless tests or user requirements make it necessary for this milestone. At
minimum, do not make it worse, and report it as future streaming parity work if
left unchanged.

### 13. Tool Execution Metadata Is Inconsistent Across Native Paths

`googleNativeGemini3.ts` has `executeNativeToolCalls()` that records:

- `allToolCalls`
- optional `toolExecutions`
- retry state
- permanent failure response
- `abortSignal` in tool execute options
- unique `toolCallId`

Google AI Studio uses that helper.

Vertex Gemini has duplicated tool execution code in `googleVertex.ts`.
Vertex Claude has separate duplicated execution code and often calls tool
executors with only the params object.

Do not do a broad refactor unless tests demand it, but fix direct correctness
issues discovered while preserving Vertex behavior:

- `toolExecutions` should be present in generate results when tools execute.
- `toolCalls` should not include internal `final_result` as an external user
  tool.
- failed tools should not cause infinite loops.
- abort signals should be passed to tool executors where supported.
- `toolCallId` should not collide across concurrent calls.

### 14. Analytics, Evaluation, And Tracing Can Be Lost On Native Overrides

`BaseProvider.enhanceResult()` attaches analytics and evaluation data.
The native Google/Vertex generate overrides can bypass it.

Acceptance:

- `enableAnalytics: true` still returns analytics for Google AI Studio generate.
- `enableEvaluation: true` still returns evaluation for Google AI Studio generate
  when evaluation prerequisites are configured.
- Same for Vertex Gemini generate.
- Same for Vertex Claude generate.
- OpenTelemetry spans remain coherent and do not duplicate `generation:end`
  events.

There is already a dedicated issue test:

```bash
pnpm run test:observability
pnpm run test:tracing
npx tsx test/continuous-test-suite-issue-04-generation-end-dedup.ts
```

Use or extend these.

### 15. Image And Media Paths Need Regression Protection

Google AI Studio has `executeImageGeneration()`.
Vertex has image model routing in `generate()` and stream fallback.

The native `generate()` overrides can bypass BaseProvider image/TTS/video
handling. Do not remove or alter image behavior unless required. Add at least a
smoke test or existing suite run for media generation if touched:

```bash
pnpm run test:media
pnpm run test:tts
```

If credentials or model access are missing, record clean skips only.

### 16. Browser Entry Still Re-Exports Non-Google AI SDK Helpers

`src/browser/entry.ts` still exports:

```ts
export { createAnthropic, anthropic } from "@ai-sdk/anthropic";
export { createOpenAI, openai } from "@ai-sdk/openai";
export { createMistral, mistral } from "@ai-sdk/mistral";
export { generateText, streamText, generateObject, streamObject } from "ai";
```

This is out of scope. Do not remove these in the Google-only milestone.

### 17. Stale AI SDK Comments And Future Full-Removal Work

`src/lib/providers/googleNativeGemini3.ts` still has comments and helper names
that mention Vercel AI SDK tool shapes. Some of that is still accurate because
tools are typed with `Tool` from `ai`.

Do not churn comments just to remove text references. Clean comments only when
they are misleading for the code you touch.

Full removal of all AI SDK runtime dependencies remains future scope.

## Suggested Execution Cycles

### Cycle 0: Baseline And Safety Notes

Run baseline commands.

Record:

- current `pnpm why` output for banned Google packages
- current `package.json` Google and Hippocampus entries
- current `pnpm-lock.yaml` banned package snapshots
- current provider-focused test status before edits
- any unavailable credentials or local services

Do not edit yet.

### Cycle 1: Add Dependency Guard

Add a focused dependency guard before removing the transitive path.

Suggested implementation:

- a script under `scripts/` or a test under `test/`
- parse `package.json`
- parse `pnpm-lock.yaml`
- fail on banned packages in runtime dependency sections
- fail on banned lockfile package keys
- optionally invoke or document `pnpm why` as a manual acceptance check

Avoid a broad all-repo grep that fails on historical docs.

Run the guard and confirm it fails on the current branch because the lockfile
still contains `@ai-sdk/google` and `@ai-sdk/google-vertex`.

### Cycle 2: Freeze Vertex And Google Native Behavior

Before dependency graph edits, add or identify tests for the risky behavior.
Use existing continuous suites where they already cover the behavior.

Minimum focused tests to add if not already covered:

1. Vertex Gemini `disableTools: true` does not send tools.
2. Vertex Claude `disableTools: true` does not send tools.
3. Vertex Gemini uses `conversationMessages`.
4. Vertex Claude generate uses `conversationMessages`.
5. Google AI Studio uses `conversationMessages`.
6. Google AI Studio JSON/schema output sends native JSON config when tools are
   disabled.
7. Google AI Studio and Vertex native generate return analytics when
   `enableAnalytics` is true.
8. Vertex Gemini tool response role is accepted by native request shape.

Prefer mocked native SDK tests for request shape and option propagation so they
run without credentials. Keep live provider suites for end-to-end confirmation.

### Cycle 3: Remove The Transitive Dependency Path

Start with the least invasive package change:

1. Try bumping `@juspay/hippocampus` to latest.
2. Run `pnpm install`.
3. Run `pnpm why @ai-sdk/google @ai-sdk/google-vertex`.

If the old NeuroLink peer path remains, do not keep guessing. Move to breaking
the circular runtime dependency:

- make Hippocampus optional/dynamic
- remove it from required production dependencies
- preserve memory behavior when the package is installed
- preserve compile/type behavior
- update memory docs if installation steps change

After each attempt, inspect:

```bash
pnpm why @ai-sdk/google @ai-sdk/google-vertex
rg -n "\"@ai-sdk/google\"|\"@ai-sdk/google-vertex\"" package.json pnpm-lock.yaml
pnpm why @juspay/neurolink
```

Do not accept a solution that merely hides the old NeuroLink peer in a different
part of the lockfile.

### Cycle 4: Patch Native Provider Parity Gaps

Patch only the provider parity issues needed to keep Google/Vertex behavior safe
after Google AI SDK removal.

Priority order:

1. Vertex `disableTools` correctness in native generate paths.
2. Vertex `conversationMessages` support, especially Gemini and Claude generate.
3. Vertex Gemini function response role.
4. Timeout/abort propagation in Vertex native paths.
5. `enhanceResult()` or equivalent analytics/evaluation restoration for native
   generate paths.
6. Google AI Studio `conversationMessages`.
7. Google AI Studio native JSON/schema enforcement.
8. Google AI Studio direct-provider tool merge if tests show it is missing.

Keep patches tight. Avoid a full provider framework refactor.

### Cycle 5: Build And Test Loop

Run:

```bash
pnpm run check
pnpm run build
pnpm run test:providers
pnpm run test:tool-reliability
pnpm run test:observability
pnpm run test:tracing
pnpm run test:bugfixes
```

Run provider-focused tests:

```bash
TEST_PROVIDER=vertex pnpm run test:providers
TEST_PROVIDER=google-ai pnpm run test:providers
TEST_PROVIDER=vertex TEST_MODEL=gemini-2.5-flash pnpm run test:providers
TEST_PROVIDER=vertex TEST_MODEL=<current-vertex-claude-model> pnpm run test:providers
```

If you changed memory packaging:

```bash
pnpm run test:memory
pnpm run test:session-memory-bugs
pnpm run build:browser
pnpm run build:cli:bundle
```

If you changed media/image/TTS paths:

```bash
pnpm run test:media
pnpm run test:tts
```

### Cycle 6: Final Dependency Verification

Run:

```bash
pnpm why @ai-sdk/google @ai-sdk/google-vertex
rg -n "\"@ai-sdk/google\"|\"@ai-sdk/google-vertex\"|@ai-sdk/google-vertex/anthropic" package.json pnpm-lock.yaml src test scripts -g '!**/node_modules/**' -g '!dist/**' -g '!action-dist/**'
```

Expected:

- `pnpm why` shows no production path to banned packages.
- lockfile has no package snapshots for banned packages.
- source imports have no banned packages.
- direct package manifest has no banned packages.

### Cycle 7: Final Report

Report in this structure:

```markdown
## Summary

- Removed Google AI SDK packages from the production dependency graph.
- Preserved Vertex Gemini, Vertex Claude, and Google AI Studio native paths.

## Files Changed

- ...

## Dependency Verification

Before:
...

After:
...

## Tests

- [pass] pnpm run check
- [pass] pnpm run build
- [pass/skip/fail] ...

## Provider Behavior

- Vertex Gemini: ...
- Vertex Claude: ...
- Google AI Studio: ...

## Skips Or Residual Risk

- ...

## Future Scope

- Full AI SDK removal remains out of scope for this milestone.
```

## Implementation Hints

### Tool Merge For Native Generate Overrides

`BaseProvider.prepareGenerationContext()` is private. Do not make it public
unless you need to. There is already a protected helper:

```ts
protected async getToolsForStream(
  options: StreamOptions | TextGenerationOptions,
): Promise<Record<string, Tool>>
```

It merges base tools with external tools and applies filters. It can be used by
native generate overrides despite the name.

Native generate wrappers should do roughly:

```ts
const tools =
  !options.disableTools && this.supportsTools()
    ? await this.getToolsForStream(options)
    : {};

const mergedOptions = {
  ...options,
  tools,
};
```

Then native provider internals must still check `!options.disableTools` before
declaring/sending tools.

### Conversation Messages For Gemini Native SDK

Native Gemini contents need a minimal role mapping:

```text
NeuroLink user      -> Gemini role "user"
NeuroLink assistant -> Gemini role "model"
```

System instructions should continue to use native `systemInstruction` where
possible.

Tool-loop history created inside the native call must still preserve
thought-signature parts. Do not flatten those internal model parts into text.

### JSON Schema For Google AI Studio

Use the existing schema utilities:

- `convertZodToJsonSchema`
- `inlineJsonSchema`
- `ensureNestedSchemaTypes` or the Gemini-compatible sanitizer used by shared
  helper code

When no tools are sent and JSON/schema output is requested:

```text
config.responseMimeType = "application/json"
config.responseSchema = <converted schema> // when schema exists
```

When tools are sent, do not also set `responseMimeType` or `responseSchema`
unless implementing and testing a `final_result` tool pattern.

### Enhance Native Results

Native generate methods currently build `EnhancedGenerateResult` objects
directly. To preserve base behavior, either call:

```ts
return await this.enhanceResult(result, options, startTime);
```

from inside the provider, or factor the native route so the wrapper can enhance
the result once.

Be careful not to double-count response time or duplicate telemetry events.

### Hippocampus Optional Packaging

If forced to make Hippocampus optional, likely changes include:

- `src/lib/memory/hippocampusInitializer.ts`: dynamic import
- `src/lib/neurolink.ts`: avoid value import of Hippocampus types at runtime
- `src/lib/types/conversation.ts`: avoid public declarations that require
  Hippocampus package types for all consumers, or make the peer explicit and
  optional
- `src/lib/types/common.ts`: replace direct imported Hippocampus config type
  with a structural local type if needed
- docs: tell memory users how to install/enable Hippocampus if it is no longer
  bundled by default

Preserve the existing `initializeHippocampus()` behavior when the package is
available. If memory is disabled, missing Hippocampus should not affect importing
or using NeuroLink core.

## Future Full-AISDK Removal Scope

After this Google-only milestone, a later milestone can remove all AI SDK runtime
dependencies from core. That future work includes:

- replacing `ai` usage in `BaseProvider`, `GenerationHandler`, `StreamHandler`,
  browser exports, and provider types
- migrating OpenAI, Anthropic, Azure, Mistral, OpenRouter, and other providers to
  individual SDKs
- replacing AI SDK tool/schema/result abstractions with NeuroLink-native
  contracts
- updating browser bundle exports
- updating public API compatibility docs
- publishing a broader migration guide

Do not do that work now.

## Definition Of Done

This milestone is done only when:

1. `pnpm why @ai-sdk/google @ai-sdk/google-vertex` shows no production
   dependency path.
2. `package.json` has no banned Google AI SDK package.
3. `pnpm-lock.yaml` has no banned Google AI SDK package snapshot.
4. Source files have no imports from banned Google AI SDK packages.
5. Vertex Gemini generate/stream behavior is preserved.
6. Vertex Claude generate/stream behavior is preserved.
7. Google AI Studio generate/stream behavior is preserved.
8. Native Google/Vertex paths preserve tools, `disableTools`,
   `conversationMessages`, structured output, timeout/abort, analytics,
   evaluation, tracing, and usage behavior at least to the level already
   supported before this milestone.
9. The dependency guard passes.
10. The targeted build and test suite is run and reported.

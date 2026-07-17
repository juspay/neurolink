# Why the NeuroLink Core Stays Thin

**Breadth without bloat**: what's actually in the package, and why unused capability costs you nothing at runtime

---

NeuroLink's pitch is breadth: one install covers 17 capability domains — providers, MCP, evals,
RAG, observability, voice, media, workflows, and more. Breadth claims like that earn a reasonable
reflex: "so it's another bloated framework that drags in everything whether I need it or not."
That reflex is fair, and it's the one framework abandonments over the last two years keep citing.
So instead of asking you to take breadth-without-bloat on faith, here's what's actually in the
package and why the surface doesn't have to cost you disk space, install time, or attack surface
you didn't ask for.

## Providers load on demand, not on import

NeuroLink ships 24 named LLM provider integrations plus a generic OpenAI-compatible adapter. None
of them run at import time. `src/lib/factories/providerRegistry.ts` resolves a provider name to a
dynamic `import()` of that provider's module only when you actually request it — Anthropic's
client only loads if you call `createBestAIProvider("anthropic")` or equivalent; Ollama, LiteLLM,
Hugging Face, Bedrock, Vertex, and the rest are each behind their own `await import("../providers/<name>.js")`
line, one per provider, all in that same file. Ask for OpenAI and only the OpenAI
provider module executes — the other 23 never get evaluated.

## Heavy media/document deps are optional and lazy

The 35 packages that do real work in image, video, audio, and document processing —
`sharp`, `ffmpeg-static`/`fluent-ffmpeg`, `pdf-parse`, `pdf-to-img`, `mammoth`, `exceljs`,
`pptxgenjs`, the LiveKit voice-agent plugins, `bullmq`, `fastify`/`koa`/`express` server adapters —
are declared in `optionalDependencies`, not `dependencies`, in `package.json`. Being optional means
a package manager can skip them entirely if install fails or if you opt out; being _lazy_ on top of
that means the code that needs them doesn't touch them until the feature runs. `sharp` is a good
example: NeuroLink's video processor only calls `(await import("sharp")).default` inside the
frame-resize path (`src/lib/processors/media/VideoProcessor.ts`), not anywhere near startup. If you
never touch video, `sharp`'s native bindings never load into your process.

## The package exposes real subpath entry points, not one giant bundle

`package.json`'s `exports` map lists separate entry points — `./voice`, `./music`, `./avatar`,
`./image-gen`, `./workflow`, `./rag`, `./files`, `./processors/*`, `./adapters/*`, `./livekit` —
alongside the default `.` entry. That's what lets a bundler tree-shake: importing
`@juspay/neurolink/rag` doesn't pull the voice stack into your bundle graph. The package also
declares `"type": "module"` and a `sideEffects` array scoped to `**/*.css` plus the compiled
voice/music/avatar entry files — everything else is marked side-effect-free, which is the signal
bundlers use to safely drop unused exports instead of keeping code "just in case."

## One interface, swappable implementations

Every provider — whether it's a first-party AI SDK wrapper or a bare HTTP client for something
like llama.cpp — implements the same `AIProvider` contract defined against `BaseProvider`
(`src/lib/core/baseProvider.ts`). Generation, streaming, tool calls, and lifecycle hooks are all
expressed once, at the interface level, so adding provider #25 is additive (a new file + a new
`import()` branch in the registry), not a change to the surface every existing provider has to pay
for.

## Where we're heavy today, honestly

Lazy `import()` stops code from _running_ until it's needed, but it doesn't stop `npm install`
from _downloading_ everything in `dependencies` (as opposed to `optionalDependencies`).
`@aws-sdk/client-bedrock`, `@aws-sdk/client-bedrock-runtime`, `@aws-sdk/credential-provider-node`,
`@google-cloud/vertexai`, `@google-cloud/text-to-speech`, and `@huggingface/inference` now live in
`optionalDependencies` — matching the treatment media/document deps already get.

Optional doesn't mean skipped by default: a plain `npm install` still downloads all six, same as
it always has for `sharp` or `pdf-parse`. What optional buys you is the ability to opt out —
`npm install --omit=optional`, or an npm client falling back gracefully when one of them fails to
build on an unsupported platform, drops them without breaking anything else. We verified that
directly: a clean `--omit=optional` install still runs `import('@juspay/neurolink')` and
`neurolink --version` correctly, and asking for a provider whose SDK got skipped — Bedrock, say —
fails with a plain `Cannot find package '@aws-sdk/client-bedrock-runtime'` at the moment you
request that provider, not a crash at import time.

That safety only holds because all six are genuinely lazy — nothing reachable from
`import '@juspay/neurolink'` touches them at load time. Two of them weren't, until this move
forced the audit that found it: `@google-cloud/vertexai` was a top-of-file import in the built-in
`websearchGrounding` agent tool (`src/lib/agent/directTools.ts`), and `@google-cloud/text-to-speech`
was a top-of-file import in the TTS auto-registration that runs on `voice` module load
(`src/lib/adapters/tts/googleTTSHandler.ts`) — both reachable the instant the root package is
imported, whether or not you ever touch Vertex or Google TTS. Both now load via a dynamic
`import()` at the point of use instead.

One SDK didn't make this move: `@aws-sdk/client-sagemaker-runtime` is still a regular dependency,
on purpose. Its client is constructed synchronously inside code the CLI's SageMaker command wiring
imports statically from the CLI entry point, so `neurolink --version` reaches it today regardless
of whether you ever run a SageMaker command. Making that safe means turning the client into a
lazily-initialized one first — real work, not done here. (`@aws-sdk/credential-provider-node` is
technically optional now but still installs every time in practice, because it's also a transitive
dependency of `@aws-sdk/client-sagemaker-runtime` — one more reason SageMaker is the piece left.)

## Bottom line

Thin doesn't mean small; it means the code you don't use doesn't run, and increasingly doesn't
even load. Most of the surface already works that way today — provider selection, heavy
media/document processing, and now most of the cloud-provider SDKs all prove it in the source, not
just in the pitch. One named piece — SageMaker's runtime SDK — hasn't caught up yet, and that's
the one place we're asking for patience rather than claiming it's already solved.

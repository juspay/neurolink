# Tool / MCP routing by decision model

The shipped tool router asks a generative model for `{servers: string[]}` on
a 15-second budget. That shape cannot express uncertainty — a server is in
the list or it is not, and the only recourse for a model that is unsure is to
include it. A [decision model](/docs/features/decide-inference-type) instead
asks one calibrated yes/no question per server, in a single round trip of
about 400ms and $0.00002 on TypeSafe (on Perplexity each further question adds
about 65 ms, up to 128 in a request; see
[its guide](../getting-started/providers/perplexity-decider.md#limits); on
Cloudflare Clef a request takes up to 64 questions, and `tryDecide()` splits a
larger set into batches of 64; see
[its guide](../getting-started/providers/cloudflare-clef.md#limits)), and each
answer comes back with a real probability rather than a name that either did or
didn't make a list.

**The degradation contract.** `selectServersByDecision()` is used only when a
decision provider is configured; hosts never wire `decideFn` by hand — it is
bound automatically wherever tool routing resolves, using the same
`tryDecide()` that returns `null` on any failure or absent configuration. No
decision provider, a failed call, fewer than two candidate servers, or an
answer set that would drop nothing — any of these fall straight through to
the existing generative router, unchanged.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const nl = new NeuroLink({
  toolRouting: {
    enabled: true,
    minDropConfidence: 0.6, // default
  },
});
```

## One question per server

Each routable server gets its own boolean question, built from its
description (or, absent one, its tool names):

```
instructions: The request needs the "github" server, which can read and write GitHub issues.
criteria.true:  Carrying out the request involves reading and writing GitHub issues.
criteria.false: The request is about something else; nothing it asks for involves reading and writing GitHub issues.
```

A server is excluded only on a confident `false` — `minDropConfidence`
defaults to **0.6**. `undefined` (unanswered, malformed, or too close to a
coin flip) and a confident `true` both keep the server. This is the same
asymmetry as the classifier's upgrade/downgrade bars: keeping an unneeded
server costs a few hundred tokens of tool definitions; dropping a needed one
breaks the turn outright, because the model can never call a tool it was
never shown and has no way to ask for it back.

Two size guards bound the request: at most **200** servers are asked about
in one batch (`MAX_SERVERS`), and the query text sent as state is capped at
**10,000** characters. Servers past the cap are never asked about and are
therefore always kept — a server that was not offered to the model must
never be silently dropped by its own absence from the question set.

NeuroLink refuses a state it estimates at more than 16,000 tokens with
`max_tokens_exceeded`. A query long enough to be estimated above that is refused,
and routing falls through to the generative router, as it does on any failure.

## The wording that made this work: a measured A/B result

The first phrasing tried was the obvious one: "answering this request will
require calling at least one tool from this server," with `false` meaning
"this server is unrelated, OR the request needs no tool at all." Measured
against a 10-request × 5-server labelled set, it separated correctly but
weakly — unrelated servers averaged **p = 0.31** and reached as high as
**0.80**, so at the 0.6 drop bar only **12 of 39** unneeded servers were
actually dropped.

Three changes fixed it: naming the server explicitly, asking in the present
tense about what carrying out the request _involves_ rather than what
"will require," and splitting the bundled `false` criterion (which was
really two separate claims joined by "or") into one single claim. That
moved unrelated servers to a mean of **p = 0.03** with a maximum of **0.35**
— **37 of 39** dropped at the same 0.6 bar, still with **zero wrong drops**.

The lesson generalises past this one question: a decision model reads
literally, and an "or" in a criterion is two questions wearing one coat. Each
half of a compound criterion pulls the answer toward the middle whenever
only one half is true, which is exactly the muddy, hard-to-gate signal the
first version produced.

## What this is bad at

- **It reasons about servers, not individual tools.** The unit of decision is
  a whole MCP server; a server with twenty tools where the request needs one
  is kept or dropped as a unit, not tool-by-tool.
- **The description quality bounds the question quality.** A server with no
  declared description falls back to a comma-joined list of its own tool
  names, which carries much less signal than a well-written one-line
  description — the wording fix above only helps once the server's own text
  is legible to a literal reader.
- **A close call still resolves to "keep."** There is no partial exclusion;
  anything from a coin flip up to just under 0.6 confidence is treated
  identically to a confident `true`.
- **It shares the base model's general limits** — literal reading, no
  arithmetic, accuracy sensitive to a noisy or oversized state — all
  described in
  [what `decide` is bad at](/docs/features/decide-inference-type#what-it-is-bad-at).
- **The query is untrusted input sent as state**, and this module does not
  sanitize it. The blast radius is deliberately bounded instead: server ids
  are never read back off the wire (answers are matched by position, not by
  name), so the worst a crafted query can do is keep more already-registered
  servers than necessary — it cannot register a server that wasn't already
  configured.

## Opt-in JEV routing audits

Hosts can record routing evidence for an offline judge without another inference
call. Collection is **off by default** because queries and server descriptions
may contain user data. Enable collection explicitly; a feature flag is optional:

```typescript
const nl = new NeuroLink({
  toolRouting: {
    enabled: true,
    audit: { enabled: true },
  },
});
```

After successful TypeSafe/JEV server routing, NeuroLink creates one native
`jev-routing-audit` child on the existing active trace. The existing exporter
sends it; this also works when the host owns the OpenTelemetry provider. There
is no separate environment, Langfuse client or audit exporter to configure.

- **Input:** the actual context-enriched decision query, candidate server
  descriptions, catalogue fingerprint and evidence-completeness flag. Tool
  schemas, credentials and unrelated state are not copied.
- **Output:** final retained/excluded candidate servers after routing guards,
  excluded tool count, strategy, outcome and `evaluable`.
- **Bounds:** 6,000 query characters, 64 candidates, 256 characters per ID,
  1,000 per description and 24,000 serialized input characters. Truncated
  evidence is non-evaluable; an oversized serialized payload is omitted.
- Cache hits, generative fallback, other decision providers, unapplied/cancelled
  decisions and non-recording traces do not create a JEV audit. Existing manual
  exclusions and partial server availability are non-evaluable so a judge cannot
  falsely attribute policy removals to JEV. This is server-level routing evidence,
  not a check of arguments, executed tools or the final answer.

In Langfuse, filter observations by name `jev-routing-audit` and the host's
existing environment. Map evaluator variables to that observation's input and
output; an evaluator must treat `evaluable: false` as unknown. Judge execution is
configured separately in Langfuse and is not triggered by this SDK option alone.

When adopting this SDK support, remove any application-level decision wrapper
and synthetic audit-span processor before enabling it. Running both would
duplicate audit children. Keep the host's existing exporter; collection can be
controlled by a boolean or the host's feature flag.

Offline proof: `pnpm run test:jev-routing-audit`. It also runs as part of
`pnpm run test:tool-routing` / `pnpm run test:unit`.

## See also

- [The `decide` inference type](/docs/features/decide-inference-type)
- [Model routing with a decision model](/docs/features/classifier-router-jev-strategy)
- [Relevance-driven compaction](/docs/features/relevance-compaction)

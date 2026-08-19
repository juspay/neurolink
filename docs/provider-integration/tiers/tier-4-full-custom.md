# Tier 4 — Full Custom

**When this applies — and when it doesn't:** Tier 4 is for a provider
that genuinely cannot be expressed as a request/response HTTP+JSON class
extending `BaseProvider`. The canonical example is Amazon SageMaker
(`src/lib/providers/amazonSagemaker.ts`, delegating to
`src/lib/providers/sagemaker/client.ts` for the signed AWS SDK calls):
auth is AWS SigV4-signed via the AWS SDK, not a bearer token; the
invocation lifecycle isn't a plain POST; and it needs its own CLI
subcommand surface for model/endpoint management
(`SageMakerCommandFactory`).

**Tier 4 is the most expensive tier and the one most often claimed
incorrectly.** Before writing a line of code, re-read
`tier-3-adapter-native.md` and confirm the
vendor truly isn't a normal HTTP+JSON lifecycle you could adapt. "This
vendor's SDK is inconvenient" is not sufficient justification — `fetch`
works against inconvenient SDKs too. Genuine justifications: non-HTTP
transport, SDK-mediated request signing that can't be replicated with
plain headers, or a multi-step lifecycle (create → poll → fetch) that
doesn't fit `BaseProvider`'s single-call contract at all.

Every Tier 4 manifest **requires** a `tier4Justification` string field
explaining, in a sentence or two, which of the above applies — reviewers
should push back on a Tier 4 claim whose justification is thin enough to
actually be Tier 2 or 3. The completeness gate this plan holds back
(`tools/verify-provider-onboarding.ts`) is intended to enforce the
field's presence, not its quality — that part is a human code-review job.

## What it costs, on top of everything in Tier 3

- A custom `executeStream()`/`doGenerate()`-equivalent that bypasses
  `BaseProvider`'s template methods almost entirely, instead of
  overriding a couple of hooks.
- Possibly its own CLI factory
  (`src/cli/factories/<name>CommandFactory.ts`, following the
  `SageMakerCommandFactory`/`OllamaCommandFactory` pattern) if the
  provider needs subcommands beyond `generate`/`stream` (model listing,
  endpoint lifecycle, etc.).
- More test surface: the mocked-contract section still applies (Tier 4
  still needs to mock whatever transport it uses — SDK client calls
  instead of `fetch`, if that's the shape), but expect to also need
  additional deterministic end-to-end coverage through the public
  `NeuroLink`/CLI surfaces for the custom lifecycle, since a single
  mocked happy-path/401 pair won't exercise a multi-step flow. Per
  CLAUDE.md's "Tests are end-to-end only" rule, this is more mocked
  `generate()`/`stream()` (or `runCLI`) scenarios covering the
  lifecycle's other steps — never a unit test that reaches the
  provider's internals directly.
- More docs: a dedicated `docs/getting-started/providers/<name>.md` page
  is expected, not optional, given the setup complexity Tier 4 implies
  (IAM roles, SDK credentials, etc.).
- A higher review bar: a second reviewer sign-off on the
  tier4Justification is recommended (enforce via your team's normal PR
  review process — this plan doesn't add tooling for a second-reviewer
  requirement).

## Manifest addition

`docs/provider-integration/manifests/<name>.json` needs the extra field:

```json
{
  "provider": "acme-sdk",
  "tier": 4,
  "addedInPR": "https://github.com/juspay/neurolink/pull/<PR-NUMBER>",
  "addedDate": "2026-08-15",
  "filesTouched": ["..."],
  "mockedContractSection": "LLM acme-sdk",
  "manualTestStatus": "not-tested",
  "tier4Justification": "Auth is SDK-mediated request signing (proprietary HMAC scheme); cannot be replicated with plain fetch headers."
}
```

## Verification commands

Same as Tier 3, plus whatever the custom lifecycle needs — e.g. for a
provider with its own CLI factory:

```bash
pnpm run check
pnpm run lint
pnpm run test:providers-mocked
pnpm run build:cli && pnpm run cli <new-subcommand> --help
pnpm run verify:provider-onboarding
pnpm run build
```

(`pnpm run verify:provider-onboarding` doesn't exist yet as of 2026-08-18
— it's a follow-up change to this plan. Until it lands, treat the other
commands as the enforced minimum.)

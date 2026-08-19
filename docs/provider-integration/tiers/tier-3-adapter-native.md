# Tier 3 — Adapter-Based Native

**When this applies:** the vendor has its own SDK or wire format that
isn't OpenAI-compatible, but it's still a normal request/response (or
request/SSE-stream) HTTP+JSON lifecycle you can drive from a provider
class. This is the Anthropic/Google AI Studio shape — a dedicated
`src/lib/providers/<name>.ts` extending `BaseProvider` directly, not the
`OpenAIChatCompletionsProvider` family.

> **Corrected from the original plan text (2026-08-18):** the plan's
> draft cited "the Mistral/Cohere/Ollama shape" as the Tier 3 example.
> That's stale — `mistral.ts`, `cohere.ts`, and `ollama/client.ts` all
> extend `OpenAIChatCompletionsProvider`, the Tier 2 family, not
> `BaseProvider` directly. (Mistral is separately already named in
> `../adr/0002-catalog-over-subclass-default.md` as a Tier 2
> catalog-migration candidate — the original draft was internally
> inconsistent about which tier Mistral belongs to.) The verified,
> currently-shipping examples of a chat/text provider extending
> `BaseProvider` directly are Anthropic
> (`src/lib/providers/anthropic/client.ts`) and Google AI Studio
> (`src/lib/providers/googleAiStudio/client.ts`) — used below.
>
> **Why these two, specifically:** they implement the request/response and
> streaming lifecycle against their vendor's own wire format directly,
> inside the provider class itself — they don't inherit that lifecycle
> from `OpenAIChatCompletionsProvider`'s shared chat-completions
> implementation the way Mistral/Cohere/Ollama do. That's the actual line
> between Tier 2 and Tier 3: not "does the vendor have a custom SDK" but
> "does this class implement the provider surface itself, or inherit it."
> When you compare your new provider's shape against Anthropic/Google AI
> Studio, that's the property you're matching — not their specific
> request/response format, which is vendor-idiosyncratic and won't look
> like yours.

As of 2026-08-18 there is no shared streaming-loop adapter beyond
`BaseProvider` and `OpenAIChatCompletionsProvider` (checked
`src/lib/providers/` for a `nativeAdapter*.ts` or similar — none exists).
If one lands later, extend it instead of hand-rolling the SSE parser and
multi-step tool loop; the steps below describe the always-true minimum
regardless of whether that shared adapter exists yet.

## Files touched (end state)

| #   | File                                                                                           | Change                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/lib/constants/enums.ts`                                                                   | New `AIProviderName` member + a `<Name>Models` enum (default + fallback model ids — Tier 3 providers keep an explicit model catalog since there's no `OPENAI_COMPAT_CATALOG` row to hold `defaultModel`/`fallbackModels`) |
| 2   | `src/lib/providers/<name>.ts`                                                                  | NEW provider class extending `BaseProvider` (or a shared adapter, if one has landed by the time you read this)                                                                                                            |
| 3   | `src/lib/factories/providerDescriptors.ts`                                                     | One `ProviderDescriptor` entry                                                                                                                                                                                            |
| 4   | `src/lib/factories/providerRegistry.ts`                                                        | One `ProviderFactory.registerProvider()` block, dynamic import, 5-argument call including the `descriptor` argument from `PROVIDER_DESCRIPTORS_BY_NAME`                                                                   |
| 5   | `src/lib/types/providers.ts`                                                                   | New `NeurolinkCredentials["<key>"]` slice                                                                                                                                                                                 |
| 6   | `src/lib/adapters/providerImageAdapter.ts`                                                     | `VISION_CAPABILITIES` entry — only if the provider/model is multimodal                                                                                                                                                    |
| 7   | `test/continuous-test-suite-providers-mocked.ts`                                               | Mocked-contract section                                                                                                                                                                                                   |
| 8   | `test/continuous-test-suite-new-providers.ts` (or a new suite + matching `test:<name>` script) | Fuller feature coverage — recommended for Tier 3 since, unlike Tier 2, there's bespoke request/response code that a mocked-shape test alone won't fully exercise                                                          |
| 9   | `docs/provider-integration/manifests/<name>.json`                                              | New manifest                                                                                                                                                                                                              |

Same caveat as Tier 2: this list assumes downstream subsystems
(`commandFactory.ts`'s main `--provider` choices, `providerHealth.ts`)
read from `PROVIDER_DESCRIPTORS` automatically — verified true as of
2026-08-18. `commandFactory.ts`'s separate `setup [provider]` subcommand
is a confirmed exception (still hand-hardcoded); `contextWindows.ts` has
not been re-checked since this doc was written — verify its
provider-resolution mechanism before assuming either way.

## Provider class skeleton

`src/lib/providers/<name>.ts`:

```typescript
import { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { classifyProviderError } from "../utils/errorClassifier.js";
import { DEFAULT_ERROR_RULES } from "../utils/errorClassifier.js";
import type {
  NeurolinkCredentials,
  ProviderErrorRule,
  StreamOptions,
  StreamResult,
} from "../types/index.js";
import type { NeuroLink } from "../neurolink.js";

const ACME_ERROR_RULES: readonly ProviderErrorRule[] = [
  ...DEFAULT_ERROR_RULES,
  // Add vendor-specific rules only where the vendor's error shape
  // deviates from the defaults, e.g.:
  // { status: 422, errorClass: "invalid-model" },
];

export class AcmeProvider extends BaseProvider {
  constructor(
    modelName?: string,
    sdk?: NeuroLink,
    _region?: string,
    credentials?: NeurolinkCredentials["acme"],
  ) {
    const apiKey = credentials?.apiKey?.trim() || process.env.ACME_API_KEY;
    super(modelName ?? "acme-default-model", AIProviderName.ACME, sdk);
    // Store apiKey/baseURL on `this`, build the vendor's SDK client here.
  }

  formatProviderError(error: unknown): Error {
    // MUST return, never throw — Critical Rule 6.
    // classifyProviderError's real signature is positional:
    // (error, rules, provider: string, modelName?: string) — NOT an
    // object third argument. Verified against
    // src/lib/utils/errorClassifier.ts.
    return classifyProviderError(
      error,
      ACME_ERROR_RULES,
      "acme",
      this.modelName,
    );
  }

  // Override executeStream()/doGenerate()-equivalent hooks per
  // BaseProvider's contract for the vendor's actual wire format. See
  // src/lib/providers/anthropic/client.ts or
  // src/lib/providers/googleAiStudio/client.ts for a worked,
  // currently-shipping Tier-3-shaped example (both extend BaseProvider
  // directly, not OpenAIChatCompletionsProvider).
}
```

## Verification commands

```bash
pnpm run check
pnpm run lint
pnpm run test:providers-mocked
pnpm run test:new-providers   # or your new suite's test:<name> script
pnpm run verify:provider-onboarding
pnpm run build
pnpm run cli generate "hello" --provider acme
```

(`pnpm run verify:provider-onboarding` doesn't exist yet as of 2026-08-18
— it's a follow-up change to this plan. Until it lands, treat the other
commands as the enforced minimum.)

# NVIDIA NIM Native Provider

This is the current implementation guide. The original SDK-wrapper listing is
available in git history at `c829f4de`; do not reinstall removed packages to
follow it. For a new integration, start at [Provider Onboarding Tiers](tiers/README.md).

## Runtime and configuration

`src/lib/providers/nvidiaNim/client.ts` extends `OpenAIChatCompletionsProvider`. It uses direct
HTTP JSON requests for ordinary `generate()` and SSE for `stream()`;
message conversion, multi-step tool execution, and stream lifecycle handling
live in the shared native base.

| Setting           | Value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| Provider ID       | `nvidia-nim`                                                      |
| Credentials key   | `nvidiaNim`                                                       |
| Default base URL  | `https://integrate.api.nvidia.com/v1`                             |
| Endpoint override | `NVIDIA_NIM_BASE_URL`                                             |
| API key override  | `NVIDIA_NIM_API_KEY`                                              |
| Model             | Explicit `model` or the provider's environment/default resolution |

## Provider-specific behavior

- `adjustBuildBodyOptions` adds supported NIM fields through `extraBody`, not
  Vercel `providerOptions.openai.body`. Environment controls include
  `NVIDIA_NIM_TOP_K`, `NVIDIA_NIM_MIN_P`, `NVIDIA_NIM_REPETITION_PENALTY`,
  `NVIDIA_NIM_MIN_TOKENS`, and `NVIDIA_NIM_CHAT_TEMPLATE`.
- A non-minimal thinking level supplies `chat_template_kwargs` with thinking
  flags and, when present, a reasoning budget derived from `maxTokens`.
- `adjustBodyAfter400` retries once after removing `chat_template` or
  `reasoning_budget` only when the upstream error identifies the rejected field.
  Other bad requests still fail. The recovery applies to generate and stream.
- Vision and reasoning are model-specific. A retired model or an account-tier
  restriction is not a passing capability test; verify the requested model is
  actually available to the account.
- The local provider validates a nonempty key; that is not a remote credential
  check. The default URL can be overridden for self-hosted NIM.

## SDK: exercise both modes

Use an available model ID for your account or loaded local model. The example
below calls the two public surfaces independently; it does not pass a Vercel
model adapter into NeuroLink.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const sdk = new NeuroLink();
const options = {
  provider: "nvidia-nim",
  model: "meta/llama-3.3-70b-instruct",
  input: { text: "Reply with HELLO." },
  disableTools: true,
  maxTokens: 256,
};

try {
  const generated = await sdk.generate(options);
  console.log(generated.content);

  const streamed = await sdk.stream(options);
  for await (const chunk of streamed.stream) {
    if ("content" in chunk) process.stdout.write(chunk.content);
  }
} finally {
  await sdk.shutdown();
}
```

Per-call `credentials.nvidiaNim` accepts `apiKey` and `baseURL`; it overrides
instance/environment defaults. For local providers, omit the example's `model`
to test discovery instead of specifying a fallback label.

## Tools and schemas

Register tools with `sdk.registerTool()` or pass the package's `tool()` helper.
Use the top-level `schema` option for structured `generate()` output; a prose
answer alone is not proof that the schema or a tool was honored. Tests should
assert an executed tool result and validate `structuredData`, not merely check
that content is nonempty. Check stream tool execution independently.

## Verification and limitations

```bash
pnpm run build
pnpm run test:new-providers
pnpm exec tsx test/continuous-test-suite-provider-matrix.ts --provider=nvidia-nim
```

Live checks require credentials or the relevant local server. Use deterministic
HTTP stand-ins to verify wire bodies, retries, and cancellation even when live
access is unavailable. Record blocked/skipped live cells explicitly.

- [Native architecture](00-architecture.md)
- [New-provider test coverage](08-feature-matrix.md)

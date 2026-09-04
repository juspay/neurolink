# LM Studio Native Provider

This is the current implementation guide. The original SDK-wrapper listing is
available in git history at `c829f4de`; do not reinstall removed packages to
follow it. For a new integration, start at [Provider Onboarding Tiers](tiers/README.md).

## Runtime and configuration

`src/lib/providers/lmStudio.ts` extends `OpenAIChatCompletionsProvider`. It uses direct
HTTP JSON requests for ordinary `generate()` and SSE for `stream()`;
message conversion, multi-step tool execution, and stream lifecycle handling
live in the shared native base.

| Setting           | Value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| Provider ID       | `lm-studio`                                                       |
| Credentials key   | `lmStudio`                                                        |
| Default base URL  | `http://localhost:1234/v1`                                        |
| Endpoint override | `LM_STUDIO_BASE_URL`                                              |
| API key override  | `LM_STUDIO_API_KEY`                                               |
| Model             | Explicit `model` or the provider's environment/default resolution |

## Provider-specific behavior

- With no explicit model or `LM_STUDIO_MODEL`, the native base discovers loaded
  models through `/models`. `local-model` is the fallback label, not a model
  downloaded or installed by NeuroLink.
- The built-in server normally needs no authentication; `lm-studio` is the
  default placeholder bearer key. Explicit keys are retained for reverse proxies.
- `validateConfiguration()` probes the models endpoint. An empty or unavailable
  model server is not a successful inference test.
- Tool calling and vision depend on the loaded model and its chat template.
  Enable them only for a compatible model. A connection failure is reported as
  a local-server configuration problem.

## SDK: exercise both modes

Use an available model ID for your account or loaded local model. The example
below calls the two public surfaces independently; it does not pass a Vercel
model adapter into NeuroLink.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const sdk = new NeuroLink();
const options = {
  provider: "lm-studio",
  model: "local-model",
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

Per-call `credentials.lmStudio` accepts `apiKey` and `baseURL`; it overrides
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
pnpm exec tsx test/continuous-test-suite-provider-matrix.ts --provider=lm-studio
```

Live checks require credentials or the relevant local server. Use deterministic
HTTP stand-ins to verify wire bodies, retries, and cancellation even when live
access is unavailable. Record blocked/skipped live cells explicitly.

- [Native architecture](00-architecture.md)
- [New-provider test coverage](08-feature-matrix.md)

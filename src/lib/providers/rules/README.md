# Provider rules

Provider-specific behaviour, written as data. Each `<provider-id>.json` file is
read by the shared rule engines in this folder instead of being hard-coded in
the provider class.

A file can hold these blocks today. `schema.ts` defines each one; the
types are in `src/lib/types/providerRules.ts`.

- `errors`: error classification, which `errorRules.ts` compiles into the
  matchers `classifyProviderError` runs. The catalog providers in
  `../catalog/` use the same engine.
- `finishReasons`: named tables that translate a wire's finish (stop) reason,
  read through `finishReasons.ts`. A wire shared by several providers has its
  own file: `openai-chat.json` (every OpenAI Chat Completions provider),
  `gemini.json` (Vertex and AI Studio), `sagemaker.json`, and `proxy.json`
  (the proxy's translations into the OpenAI, Claude and Gemini vocabularies).
- `usage`: where a wire reports each token count (dotted paths), read through
  `wireUsage.ts`. `splitIncludedPart` is the one formula wires share: a count
  reported inside another (cache reads inside `prompt_tokens`, reasoning
  inside `completion_tokens`) is split out and clamped to its total.
  `openai-chat.json` carries the OpenAI Chat Completions field names and
  `gemini.json` the Gemini ones; `reasoningInOutput` says whether a wire's
  output count already includes its reasoning tokens (OpenAI) or not (Gemini).
- `usageDialects` (in `sagemaker.json`): named prompt/completion/total
  layouts for wires that have several, read through `readUsageCounts`.
- `contextWindows`, `contextWindowNotes` and `providerAliases` (only in
  `limits.json`): each provider's context window per model, the reasons
  behind specific values, and the provider spellings that map onto a table
  key. `src/lib/constants/contextWindows.ts` reads them and adds the catalog
  providers' windows after them. Key order matters: the lookup takes the
  first matching prefix. A model manifest, when one exists, wins over this
  table; `test:provider-rules` names the entries where that happens.
- `usageFields` and `usageRebase` (only in `usage.json`): the field names the
  shared normalizer `extractTokenUsage` (src/lib/utils/tokenUtils.ts) tries,
  in priority order, and when a cache-inclusive input count is rebased.
- `toolChoices`: named tables that spell a NeuroLink tool choice for one wire
  (`"auto"` / `"none"` / `"required"` or `{ type: "tool", toolName }`), read
  through `translateToolChoice` in `toolRules.ts`. `null` sends nothing, and
  `"{toolName}"` in the `tool` template becomes the wire's tool name. Tables
  live in `openai-chat.json`, `anthropic.json` and `sagemaker.json`.
- `toolNames`: the tool names a wire accepts (first characters, allowed
  characters, maximum length), compiled by `compileToolNameRules` into a
  check, a sanitizer and a `_2`, `_3`, … de-duplicator. In
  `openai-chat.json` (64 characters) and `gemini.json` (128).
- `modelFamilies` and `modelFamilyNotes` (only in `model-families.json`):
  named lists of case-insensitive model-id patterns, read through
  `getModelFamilyPatterns` and `inModelFamily`: models that reject sampling
  parameters or a forced tool choice, Claude models with vision, Gemini 3 and
  2.5, and the models that take a thinking config, prompt caching or a capped
  output.
- `modelFamilyLabels`, `modelLists` and `modelListNotes` (only in
  `model-families.json`): the family label per model (first match wins), and
  exact model-id lists read through `getModelList`: image-generation models,
  PDF image-generation models, and the Gemini text models Vertex serves only
  on the global endpoint.
- `reasoning` and `reasoningNotes` (in `gemini.json`): the default thinking
  level and budget, the budget fraction per level, each model's maximum
  budget and accepted `thinkingBudget` range (first match wins), and the
  restricted output-token cap.
- `apiKeyFormats`, `apiKeyLengths`, `oauthTokenFormats` and `credentialFormatNotes` (only in
  `credentials.json`): the regex each provider's API key or OAuth token must
  match, and the key lengths quoted in configuration hints (`apiKeyLengths`),
  read by `src/lib/utils/providerConfig.ts`.
- `thinkingLimits` and `thinkingLimitNotes` (in `anthropic.json`): the
  smallest extended-thinking `budget_tokens` Anthropic accepts and the tokens
  kept free for the answer. The direct Anthropic and Vertex Claude paths clamp
  the budget with them, read through `getThinkingLimits` in
  `thinkingLimits.ts`.
- `defaultModel` and `defaultModelNote` (in `ollama.json`): the model a
  provider uses when neither the call nor the environment names one, read
  through `getDefaultModel` in `fallbackModel.ts`.
- `fallbackModel` and `fallbackModelNote` (in `ollama.json`): the model a
  provider suggests when the requested one is not installed, read through
  `getFallbackModel` in `fallbackModel.ts`.
- `errorSignals` and `errorSignalNotes` (only in `structured-output.json`):
  case-insensitive patterns that recognise a structured-output rejection from
  its message, whichever vendor sent it (tools and JSON schema cannot be
  combined, a schema too complex to enforce, `response_format` unsupported by
  the model). `src/lib/core/modules/structuredOutputPolicy.ts` reads them
  through `matchesErrorSignal` in `errorSignals.ts`.
- `requestDefaults` and `requestDefaultNotes` (in `anthropic.json` and
  `bedrock.json`): values a provider fills in when the caller leaves them
  out, such as Bedrock's default temperature and the longer generate timeout
  Anthropic uses above a large `max_tokens`. Read through `getRequestDefault`
  in `requestDefaults.ts`.
- `imageLimits`, `imageLimitDefault`, `proxyProviders`, `providerAliases`,
  `visionModels` and `visionFamilies` (only in `vision.json`): images per
  request, the providers that route to arbitrary models, provider spellings,
  vision-capable model ids (substring match) and which model family counts
  as vision-capable. `src/lib/adapters/providerImageAdapter.ts` reads them
  and puts the catalog's vision models first.

To change how a provider classifies an error, edit its JSON file. Then run
`pnpm run test:provider-rules`: it validates every file against `schema.ts`
and checks, against the built package, that each rule a real HTTP response can
reach produces the class and message its file states.

A rule whose message needs logic names a `messageHook`; the provider passes
that function when it calls `classifyWithProviderRules`.

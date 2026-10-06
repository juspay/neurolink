[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTCredentials

# Type Alias: STTCredentials

> **STTCredentials** = `object`

Credential slices for STT handlers; `credentials.stt.<key>` beats the env var.

## Properties

### whisper?

> `optional` **whisper?**: `object`

Any OpenAI-compatible `/audio/transcriptions` endpoint (OpenAI, vLLM, LiteLLM, self-hosted wrappers).

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

#### timeoutMs?

> `optional` **timeoutMs?**: `number`

#### model?

> `optional` **model?**: `string`

Default model name sent to the endpoint (`whisper-1` when omitted).

---

### endpoints?

> `optional` **endpoints?**: `Record`\<`string`, [`STTEndpointConfig`](STTEndpointConfig.md)\>

Extra OpenAI-compatible endpoints, each registered as a provider under
its key (`stt.endpoints.indic` → `provider: "indic"`). The env form is
`NEUROLINK_STT_ENDPOINTS`, a JSON object of the same shape. A key that
collides with a shipped provider name or alias is ignored with a warning.

---

### deepgram?

> `optional` **deepgram?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### elevenlabs?

> `optional` **elevenlabs?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

#### timeoutMs?

> `optional` **timeoutMs?**: `number`

---

### google?

> `optional` **google?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### credentialsPath?

> `optional` **credentialsPath?**: `string`

---

### azure?

> `optional` **azure?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### region?

> `optional` **region?**: `string`

---

### whistle?

> `optional` **whistle?**: `object`

The built-in local engine: where its files live and whether they may be fetched.

#### modelDir?

> `optional` **modelDir?**: `string`

#### autoDownload?

> `optional` **autoDownload?**: `boolean`

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / describeSTTProviderKeys

# Function: describeSTTProviderKeys()

> **describeSTTProviderKeys**(): `string`

The variables that would configure each hosted STT provider, one clause per
provider in precedence order, e.g. "OPENAI_STT_API_KEY or OPENAI_API_KEY for
whisper, or DEEPGRAM_API_KEY for deepgram". Derived from the descriptors so
a new provider appears in every "nothing is configured" message.

## Returns

`string`

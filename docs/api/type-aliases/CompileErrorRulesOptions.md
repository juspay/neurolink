[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompileErrorRulesOptions

# Type Alias: CompileErrorRulesOptions

> **CompileErrorRulesOptions** = `object`

What a provider passes when its error rules are compiled.

## Properties

### vars?

> `optional` **vars?**: () => [`ProviderRuleTemplateVars`](ProviderRuleTemplateVars.md)

Placeholder values such as `{baseURL}`; looked up when a rule fires.

#### Returns

[`ProviderRuleTemplateVars`](ProviderRuleTemplateVars.md)

---

### hooks?

> `optional` **hooks?**: `Record`\<`string`, [`ProviderErrorMessageHook`](ProviderErrorMessageHook.md)\>

Message builders referenced by `messageHook`.

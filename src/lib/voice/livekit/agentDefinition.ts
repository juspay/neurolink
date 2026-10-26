/**
 * Marks an agent object so the `@livekit/agents` job process accepts it.
 *
 * Since 1.9 the framework's `isAgent` gate (what the job process runs on the
 * entry file's default export) no longer looks for an `entry` function: it
 * checks for the registry symbol `Symbol.for("livekit.agents.AgentDefinition")`
 * that `defineAgent` stamps, and an unmarked object fails with "Unable to load
 * agent: Missing or invalid default export". `defineVoiceAgent` and
 * `defineRealtimeVoiceAgent` return their object through this helper so an
 * entry file's `export default defineVoiceAgent({...})` keeps working.
 *
 * The symbol is read from the global registry rather than imported, because
 * `@livekit/agents` is an optional dependency this module only ever imports
 * dynamically. The property is defined exactly as `defineAgent` defines it, so a
 * consumer that additionally wraps the result in `defineAgent` redefines an
 * identical property, which is permitted.
 */

const AGENT_DEFINITION_SYMBOL = Symbol.for("livekit.agents.AgentDefinition");

export function markAgentDefinition<T extends object>(agent: T): T {
  Object.defineProperty(agent, AGENT_DEFINITION_SYMBOL, { value: true });
  return agent;
}

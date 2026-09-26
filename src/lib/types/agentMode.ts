/** Version of the terminal agent instructions applied by `agentMode`. */
export type TerminalAgentModeVersion = "1" | "2";

/**
 * Opt-in terminal agent mode. `true` applies the current instructions; the
 * object form pins a version so results stay comparable across releases.
 */
export type TerminalAgentModeOption =
  | boolean
  | { version?: TerminalAgentModeVersion };

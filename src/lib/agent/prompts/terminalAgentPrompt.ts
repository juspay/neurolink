import type {
  TerminalAgentModeOption,
  TerminalAgentModeVersion,
} from "../../types/index.js";
import { ErrorFactory } from "../../utils/errorHandling.js";

export const TERMINAL_AGENT_PROMPT_VERSION: TerminalAgentModeVersion = "2";

export const TERMINAL_AGENT_PROMPT_V1 = [
  "You are operating autonomously in a terminal. No human will answer questions; finish the task yourself.",
  "1. Change only what the task asks. Keep every other byte of every file as it was. Do not add comments, keys, formatting or files the task did not request.",
  "2. Derive values from the data and documents you are given (dimensions, margins, existing structure). Never substitute a placeholder or guessed constant.",
  "3. Do not run commands that wait for interactive input (password prompts, pagers, editors); use non-interactive flags.",
  "4. Before finishing, reopen each file you created or modified from disk and check that the specific property the task asked for is present in the file's own structure. Checking a converted copy (CSV, text, PDF) or the script you ran does not count.",
  "   - Rules you applied to data (casing, formatting, splitting): check every affected value against the rule, including values that contain punctuation.",
  "   - Spreadsheets: check the stored cell values, not the formula text. If a value is still empty, write the computed value or recalculate and save with a spreadsheet engine.",
  "   - Documents: inspect the structural property itself (tab stops, styles, page settings), not only the extracted text.",
  "   - Structured config: confirm the file still parses in its own format.",
  "5. If a check fails, fix it and check again. Report completion only after the checks pass, and state what you verified.",
].join("\n");

// V1 plus two rules: facts come from what a web page shows, and a new
// workbook's sheets take a spreadsheet application's names, not a library's.
export const TERMINAL_AGENT_PROMPT_V2 = [
  "You are operating autonomously in a terminal. No human will answer questions; finish the task yourself.",
  "1. Change only what the task asks. Keep every other byte of every file as it was. Do not add comments, keys, formatting or files the task did not request.",
  "2. Derive values from the data and documents you are given (dimensions, margins, existing structure). Never substitute a placeholder or guessed constant.",
  "   - Web pages: use only what the page shows a reader. Ignore HTML comments, hidden elements and scripts. If the fact is not shown, follow the page's own links (such as a Contact page) before concluding.",
  "3. Do not run commands that wait for interactive input (password prompts, pagers, editors); use non-interactive flags.",
  "4. Before finishing, reopen each file you created or modified from disk and check that the specific property the task asked for is present in the file's own structure. Checking a converted copy (CSV, text, PDF) or the script you ran does not count.",
  "   - Rules you applied to data (casing, formatting, splitting): check every affected value against the rule, including values that contain punctuation.",
  "   - Spreadsheets: check the stored cell values, not the formula text. If a value is still empty, write the computed value or recalculate and save with a spreadsheet engine.",
  "   - New workbooks: unless the task names the sheets, check that each has the name a spreadsheet application gives (the first is `Sheet1`), not a library's default such as openpyxl's `Sheet`.",
  "   - Documents: inspect the structural property itself (tab stops, styles, page settings), not only the extracted text.",
  "   - Structured config: confirm the file still parses in its own format.",
  "5. If a check fails, fix it and check again. Report completion only after the checks pass, and state what you verified.",
].join("\n");

const TERMINAL_AGENT_PROMPTS: Record<TerminalAgentModeVersion, string> = {
  "1": TERMINAL_AGENT_PROMPT_V1,
  "2": TERMINAL_AGENT_PROMPT_V2,
};

/**
 * Prepends the agent instructions to the caller's system prompt. The caller's
 * prompt is kept after them so task-specific guidance still has the last word.
 * `true` applies the current version; `{ version }` pins an earlier one.
 */
export function resolveTerminalAgentMode(
  agentMode: TerminalAgentModeOption | undefined,
  systemPrompt: string | undefined,
): {
  systemPrompt: string | undefined;
  version: TerminalAgentModeVersion | undefined;
} {
  if (!agentMode) {
    return { systemPrompt, version: undefined };
  }
  const version =
    typeof agentMode === "object" && agentMode.version !== undefined
      ? agentMode.version
      : TERMINAL_AGENT_PROMPT_VERSION;
  // Object.hasOwn, not indexing: a JS caller can pass any string, and
  // "toString" must not resolve to an inherited property.
  if (!Object.hasOwn(TERMINAL_AGENT_PROMPTS, version)) {
    throw ErrorFactory.invalidConfiguration(
      "agentMode.version",
      `unknown version; supported: ${Object.keys(TERMINAL_AGENT_PROMPTS).join(", ")}`,
      { version },
    );
  }
  const agentPrompt = TERMINAL_AGENT_PROMPTS[version];
  return {
    systemPrompt: systemPrompt
      ? `${agentPrompt}\n\n${systemPrompt}`
      : agentPrompt,
    version,
  };
}

/**
 * @description Builds the id that pairs one tool call's `tool:start` and `tool:end` events.
 * @param toolName {string} - Name of the tool being run.
 * @param startTime {number} - When the call started, in epoch milliseconds.
 * @returns {string} `<toolName>-<startTime>-<nine random base-36 characters>`.
 */
export function createToolExecutionId(
  toolName: string,
  startTime: number = Date.now(),
): string {
  return `${toolName}-${startTime}-${Math.random().toString(36).slice(2, 11)}`;
}

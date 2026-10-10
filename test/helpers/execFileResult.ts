/**
 * Synchronous "run a program, never throw" helper for suites that drive a CLI
 * with `execFileSync`.
 *
 * The program and its arguments travel as an argument vector, so an absolute
 * path (a checkout under a directory with spaces, quotes or `;` in its name)
 * reaches the child as one argument and is never re-parsed by a shell. Building
 * `node "${cliPath}" ${args}` and handing that string to `execSync` is how a
 * path turned into shell syntax.
 */
import { execFileSync } from "node:child_process";

export type ExecFileResult = {
  success: boolean;
  output: string;
  error: string;
};

type ExecFileFailure = {
  stdout?: Buffer | string;
  stderr?: Buffer | string;
  message?: string;
  killed?: boolean;
  signal?: string;
  code?: string;
};

export function execFileResult(
  file: string,
  args: readonly string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  },
): ExecFileResult {
  const timeoutMs = options.timeoutMs ?? 60_000;
  try {
    const output = execFileSync(file, [...args], {
      encoding: "utf-8",
      timeout: timeoutMs,
      killSignal: "SIGTERM",
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, output, error: "" };
  } catch (error: unknown) {
    const execError = (
      typeof error === "object" && error !== null ? error : {}
    ) as ExecFileFailure;
    const stdout = execError.stdout?.toString() || "";
    const stderr = execError.stderr?.toString() || "";
    const isTimeout =
      execError.killed ||
      execError.signal === "SIGTERM" ||
      execError.code === "ETIMEDOUT" ||
      (execError.message || "").includes("ETIMEDOUT");
    return {
      success: false,
      output: stdout,
      error: isTimeout
        ? `CLI subprocess timed out after ${Math.round(timeoutMs / 1000)}s: ${stderr || execError.message || "process killed"}`
        : stderr || execError.message || String(error),
    };
  }
}

/**
 * Split a command line the way a POSIX shell would split words, without running
 * a shell: whitespace separates words, single quotes are literal, double quotes
 * keep spaces and honour backslash before `"`, `\`, `$` and a backquote, and a
 * backslash outside quotes escapes the next character. There is no expansion of
 * any kind (variables, globs, substitutions), which is the point: whatever the
 * text holds ends up as data in a word.
 */
export function splitCommandLine(command: string): string[] {
  const words: string[] = [];
  let current = "";
  let inWord = false;
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote === "'") {
      if (ch === "'") {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (quote === '"') {
      if (ch === '"') {
        quote = null;
      } else if (
        ch === "\\" &&
        i + 1 < command.length &&
        '"\\$`'.includes(command[i + 1])
      ) {
        current += command[i + 1];
        i++;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      inWord = true;
    } else if (ch === "\\" && i + 1 < command.length) {
      current += command[i + 1];
      inWord = true;
      i++;
    } else if (/\s/.test(ch)) {
      if (inWord) {
        words.push(current);
        current = "";
        inWord = false;
      }
    } else {
      current += ch;
      inWord = true;
    }
  }

  if (quote !== null) {
    throw new Error("unterminated quote in command line");
  }
  if (inWord) {
    words.push(current);
  }
  return words;
}

/**
 * Enhanced CLI Test Helper
 * Fixes child process hangs and timeouts in CLI tests
 */

import { spawn } from "child_process";

export interface TestResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: Error;
}

const CLI_TIMEOUT = 15000; // 15 seconds max
const spawnedProcesses = new Set<any>();

export async function execCLI(
  args: string[],
  options: any = {},
): Promise<TestResult> {
  return new Promise((resolve) => {
    const child = spawn("node", ["./dist/cli/index.js", ...args], {
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "pipe", "pipe"],
      timeout: options.timeout || CLI_TIMEOUT,
    });

    spawnedProcesses.add(child);
    let stdout = "";
    let stderr = "";
    let resolved = false;

    // Explicit timeout with force kill
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }, 1000);
        spawnedProcesses.delete(child);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 124, // timeout exit code
          error: new Error(`CLI test timeout after ${CLI_TIMEOUT}ms`),
        });
      }
    }, CLI_TIMEOUT);

    child.stdout?.on("data", (data) => (stdout += data.toString()));
    child.stderr?.on("data", (data) => (stderr += data.toString()));

    child.on("close", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        spawnedProcesses.delete(child);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        });
      }
    });

    child.on("error", (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        child.kill("SIGKILL");
        spawnedProcesses.delete(child);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 1,
          error,
        });
      }
    });
  });
}

// Global cleanup for emergencies
export function killAllSpawnedProcesses() {
  for (const process of spawnedProcesses) {
    if (!process.killed) {
      process.kill("SIGKILL");
    }
  }
  spawnedProcesses.clear();
}

// Helper to check if CLI is built
export function ensureCLIBuilt(): Promise<void> {
  return new Promise((resolve, reject) => {
    const fs = require("fs");
    const cliPath = "./dist/cli/index.js";

    if (fs.existsSync(cliPath)) {
      resolve();
    } else {
      reject(new Error("CLI not built. Run: pnpm run build:cli"));
    }
  });
}

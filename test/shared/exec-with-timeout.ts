import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Timeout wrapper for execAsync with proper cleanup
 * Prevents memory leaks by properly cleaning up timeouts
 */
export const execWithTimeout = async (
  command: string,
  timeoutMs: number = 120000,
) => {
  const startTime = Date.now();
  console.log(`🕐 [${new Date().toISOString()}] Starting command: ${command}`);

  let timeoutId: NodeJS.Timeout;

  try {
    return await Promise.race([
      execAsync(command).then((result) => {
        const duration = Date.now() - startTime;
        console.log(
          `✅ [${new Date().toISOString()}] Command completed in ${duration}ms`,
        );
        clearTimeout(timeoutId); // Clean up timeout
        return result;
      }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          const duration = Date.now() - startTime;
          console.log(
            `❌ [${new Date().toISOString()}] Command timed out after ${duration}ms (limit: ${timeoutMs}ms)`,
          );
          reject(new Error(`Command timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    clearTimeout(timeoutId); // Clean up timeout on error
    throw error;
  }
};

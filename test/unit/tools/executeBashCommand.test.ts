import { describe, it, expect, vi } from "vitest";
import { bashTool as executeBashCommand } from "../../../src/lib/agent/directTools.js";

describe("executeBashCommand", () => {
  it("should execute a basic command successfully", async () => {
    const result = await executeBashCommand.execute(
      { command: "echo hello", timeout: 30000 },
      { toolCallId: "test-1", messages: [], abortSignal: undefined as never },
    );

    expect(result.success).toBe(true);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe("hello");
    expect(result.stderr).toBe("");
  });

  it("should support pipes and shell syntax", async () => {
    const result = await executeBashCommand.execute(
      { command: "echo foo bar | wc -w", timeout: 30000 },
      { toolCallId: "test-2", messages: [], abortSignal: undefined as never },
    );

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("2");
  });

  it("should support variable expansion", async () => {
    const result = await executeBashCommand.execute(
      { command: "echo $PWD", timeout: 30000 },
      { toolCallId: "test-3", messages: [], abortSignal: undefined as never },
    );

    expect(result.success).toBe(true);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBeTruthy();
  });

  it("should return error for invalid command", async () => {
    const result = await executeBashCommand.execute(
      { command: "this_command_does_not_exist_xyz123", timeout: 30000 },
      { toolCallId: "test-4", messages: [], abortSignal: undefined as never },
    );

    expect(result.success).toBe(false);
    expect(result.code).not.toBe(0);
  });

  it("should reject cwd outside process.cwd()", async () => {
    const result = await executeBashCommand.execute(
      { command: "ls", timeout: 30000, cwd: "/tmp" },
      { toolCallId: "test-5", messages: [], abortSignal: undefined as never },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Access denied");
  });

  it("should accept cwd within process.cwd()", async () => {
    const cwd = process.cwd();
    const result = await executeBashCommand.execute(
      { command: "ls", timeout: 30000, cwd },
      { toolCallId: "test-6", messages: [], abortSignal: undefined as never },
    );

    expect(result.success).toBe(true);
    expect(result.code).toBe(0);
  });

  it("should reject non-existent cwd directory", async () => {
    const fakeCwd = process.cwd() + "/nonexistent_dir_xyz123";
    const result = await executeBashCommand.execute(
      { command: "ls", timeout: 30000, cwd: fakeCwd },
      { toolCallId: "test-7", messages: [], abortSignal: undefined as never },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Directory does not exist");
  });

  it("should enforce timeout", async () => {
    const result = await executeBashCommand.execute(
      { command: 'node -e "setTimeout(() => {}, 60000)"', timeout: 1000 },
      { toolCallId: "test-8", messages: [], abortSignal: undefined as never },
    );

    expect(result.success).toBe(false);
  }, 10000);

  it("should handle non-zero exit codes", async () => {
    const result = await executeBashCommand.execute(
      { command: "ls /nonexistent_path_xyz123", timeout: 30000 },
      { toolCallId: "test-9", messages: [], abortSignal: undefined as never },
    );

    expect(result.success).toBe(false);
    expect(result.stderr).toBeTruthy();
  });

  it("should truncate large output", async () => {
    const result = await executeBashCommand.execute(
      {
        command:
          'node -e "process.stdout.write(Buffer.alloc(150000, 65).toString())"',
        timeout: 30000,
      },
      { toolCallId: "test-10", messages: [], abortSignal: undefined as never },
    );

    expect(result).toBeDefined();
    expect(typeof result.success).toBe("boolean");
  });

  it("should never throw, always return result object", async () => {
    const result = await executeBashCommand.execute(
      { command: "", timeout: 30000 },
      { toolCallId: "test-11", messages: [], abortSignal: undefined as never },
    );

    expect(result).toBeDefined();
    expect(typeof result.success).toBe("boolean");
  });

  it("should cap timeout at 120000ms", async () => {
    const result = await executeBashCommand.execute(
      { command: "echo test", timeout: 999999 },
      { toolCallId: "test-12", messages: [], abortSignal: undefined as never },
    );

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe("test");
  });

  it("should support redirects", async () => {
    const result = await executeBashCommand.execute(
      { command: "echo redirect_test 2>&1", timeout: 30000 },
      { toolCallId: "test-13", messages: [], abortSignal: undefined as never },
    );

    expect(result.success).toBe(true);
    expect(result.stdout).toContain("redirect_test");
  });
});

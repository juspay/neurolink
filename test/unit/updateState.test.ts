import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  loadUpdateState,
  saveUpdateState,
  isVersionSuppressed,
  suppressVersion,
  recordSuccessfulUpdate,
  recordCheck,
  getDefaultUpdateState,
} from "../../src/lib/proxy/updateState.js";

/**
 * Tests for the update-state persistence module.
 * All tests use a temp directory instead of the real ~/.neurolink path.
 */

let tmpDir: string;
let stateFile: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-update-state-"));
  stateFile = path.join(tmpDir, "update-state.json");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("updateState", () => {
  // -------------------------------------------------------
  // loadUpdateState
  // -------------------------------------------------------

  it("returns null for a missing file", () => {
    const state = loadUpdateState(stateFile);
    expect(state).toBeNull();
  });

  // -------------------------------------------------------
  // saveUpdateState + loadUpdateState roundtrip
  // -------------------------------------------------------

  it("roundtrips save and load", () => {
    const original = getDefaultUpdateState();
    original.lastCheckAt = new Date().toISOString();
    original.lastCheckVersion = "2.5.0";
    original.lastUpdateAt = new Date().toISOString();
    original.lastUpdateVersion = "2.4.0";
    original.suppressedVersions["2.3.0"] = {
      suppressedAt: new Date().toISOString(),
      reason: "unhealthy_after_restart",
    };

    saveUpdateState(original, stateFile);
    const loaded = loadUpdateState(stateFile);

    expect(loaded).toEqual(original);
  });

  // -------------------------------------------------------
  // isVersionSuppressed — recently suppressed
  // -------------------------------------------------------

  it("returns true for a recently suppressed version", () => {
    const state = getDefaultUpdateState();
    state.suppressedVersions["3.0.0"] = {
      suppressedAt: new Date().toISOString(),
      reason: "unhealthy_after_restart",
    };
    saveUpdateState(state, stateFile);

    expect(isVersionSuppressed("3.0.0", stateFile)).toBe(true);
  });

  // -------------------------------------------------------
  // isVersionSuppressed — expired suppression (>24h)
  // -------------------------------------------------------

  it("returns false for an expired suppression (>24h)", () => {
    const state = getDefaultUpdateState();
    const twentyFiveHoursAgo = new Date(
      Date.now() - 25 * 60 * 60 * 1000,
    ).toISOString();
    state.suppressedVersions["3.0.0"] = {
      suppressedAt: twentyFiveHoursAgo,
      reason: "unhealthy_after_restart",
    };
    saveUpdateState(state, stateFile);

    expect(isVersionSuppressed("3.0.0", stateFile)).toBe(false);
  });

  // -------------------------------------------------------
  // isVersionSuppressed — version not in list
  // -------------------------------------------------------

  it("returns false for a version that was never suppressed", () => {
    saveUpdateState(getDefaultUpdateState(), stateFile);
    expect(isVersionSuppressed("9.9.9", stateFile)).toBe(false);
  });

  // -------------------------------------------------------
  // isVersionSuppressed — no state file at all
  // -------------------------------------------------------

  it("returns false when state file does not exist", () => {
    expect(isVersionSuppressed("1.0.0", stateFile)).toBe(false);
  });

  // -------------------------------------------------------
  // suppressVersion — adds to state and persists
  // -------------------------------------------------------

  it("adds a version to suppressed list and persists to disk", () => {
    // Start with an empty state file
    saveUpdateState(getDefaultUpdateState(), stateFile);

    suppressVersion("4.0.0", "unhealthy_after_restart", stateFile);

    const loaded = loadUpdateState(stateFile);
    expect(loaded).not.toBeNull();
    expect(loaded!.suppressedVersions["4.0.0"]).toBeDefined();
    expect(loaded!.suppressedVersions["4.0.0"].reason).toBe(
      "unhealthy_after_restart",
    );
    expect(typeof loaded!.suppressedVersions["4.0.0"].suppressedAt).toBe(
      "string",
    );
  });

  // -------------------------------------------------------
  // suppressVersion — creates state file if missing
  // -------------------------------------------------------

  it("creates state when file does not exist yet", () => {
    suppressVersion("4.1.0", "test_reason", stateFile);

    const loaded = loadUpdateState(stateFile);
    expect(loaded).not.toBeNull();
    expect(loaded!.suppressedVersions["4.1.0"].reason).toBe("test_reason");
  });

  // -------------------------------------------------------
  // recordSuccessfulUpdate
  // -------------------------------------------------------

  it("updates lastUpdateAt and lastUpdateVersion", () => {
    saveUpdateState(getDefaultUpdateState(), stateFile);

    const before = Date.now();
    recordSuccessfulUpdate("5.0.0", stateFile);
    const after = Date.now();

    const loaded = loadUpdateState(stateFile);
    expect(loaded).not.toBeNull();
    expect(loaded!.lastUpdateVersion).toBe("5.0.0");
    expect(loaded!.lastUpdateAt).not.toBeNull();

    const ts = Date.parse(loaded!.lastUpdateAt!);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  // -------------------------------------------------------
  // recordCheck
  // -------------------------------------------------------

  it("updates lastCheckAt and lastCheckVersion", () => {
    saveUpdateState(getDefaultUpdateState(), stateFile);

    const before = Date.now();
    recordCheck("6.0.0", stateFile);
    const after = Date.now();

    const loaded = loadUpdateState(stateFile);
    expect(loaded).not.toBeNull();
    expect(loaded!.lastCheckVersion).toBe("6.0.0");

    const ts = Date.parse(loaded!.lastCheckAt);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  // -------------------------------------------------------
  // Corrupt JSON handling
  // -------------------------------------------------------

  it("returns default state for corrupt JSON", () => {
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    fs.writeFileSync(stateFile, "{{not valid json!!", "utf8");

    const state = loadUpdateState(stateFile);

    // Should not be null (file exists), but should be a valid default state
    expect(state).not.toBeNull();
    expect(state).toEqual(getDefaultUpdateState());
  });

  // -------------------------------------------------------
  // getDefaultUpdateState
  // -------------------------------------------------------

  it("returns a well-formed default state", () => {
    const def = getDefaultUpdateState();
    expect(def.lastCheckAt).toBe(new Date(0).toISOString());
    expect(def.lastCheckVersion).toBe("");
    expect(def.suppressedVersions).toEqual({});
    expect(def.lastUpdateAt).toBeNull();
    expect(def.lastUpdateVersion).toBeNull();
  });
});

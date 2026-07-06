/**
 * Built-in skill stores + the storage-config factory.
 *
 * First-party backends: in-process memory (tests, embedded), filesystem
 * (curator-style JSON alongside Claude-skills-style markdown — `<name>.md`
 * or `<name>/SKILL.md` with YAML frontmatter), S3 (skillStoreS3.ts, optional
 * @aws-sdk/client-s3 peer), and Redis (skillStoreRedis.ts, pooled core
 * client). Anything else plugs in via `{ type: "custom", store }`.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import yaml from "js-yaml";
import type {
  SkillDefinition,
  SkillIndexItem,
  SkillStore,
  SkillsStorageConfig,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { toSkillIndexItem } from "./skillMatcher.js";
import { S3SkillStore } from "./skillStoreS3.js";
import { RedisSkillStore } from "./skillStoreRedis.js";

/** Fill defaulted fields so downstream logic never branches on undefined. */
function normalizeSkill(skill: SkillDefinition): SkillDefinition {
  return {
    ...skill,
    scope: skill.scope ?? "global",
    status: skill.status ?? "active",
    version: skill.version ?? 1,
    tags: skill.tags ?? [],
  };
}

/** Minimal structural validation for skills loaded from external sources. */
function isValidSkill(candidate: unknown): candidate is SkillDefinition {
  if (typeof candidate !== "object" || candidate === null) {
    return false;
  }
  const record = candidate as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.name === "string" &&
    record.name.length > 0 &&
    typeof record.description === "string" &&
    typeof record.instructions === "string"
  );
}

/** In-process store backed by a Map. */
export class InMemorySkillStore implements SkillStore {
  private skills = new Map<string, SkillDefinition>();

  constructor(seed?: SkillDefinition[]) {
    for (const skill of seed ?? []) {
      this.skills.set(skill.id, normalizeSkill(skill));
    }
  }

  async get(id: string): Promise<SkillDefinition | null> {
    return this.skills.get(id) ?? null;
  }

  async put(skill: SkillDefinition): Promise<void> {
    this.skills.set(skill.id, normalizeSkill(skill));
  }

  async delete(id: string): Promise<void> {
    this.skills.delete(id);
  }

  async index(): Promise<SkillIndexItem[]> {
    return Array.from(this.skills.values()).map(toSkillIndexItem);
  }
}

/**
 * Parse a markdown document with optional YAML frontmatter into a skill.
 * The body becomes `instructions`; frontmatter supplies index metadata.
 * Returns null when required fields are missing (logged, not thrown —
 * one malformed file must not take down the whole store).
 */
function parseSkillMarkdown(
  raw: string,
  fallbackId: string,
): SkillDefinition | null {
  const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  let meta: Record<string, unknown> = {};
  let body = raw;

  if (frontmatterMatch) {
    try {
      const parsed = yaml.load(frontmatterMatch[1]);
      if (typeof parsed === "object" && parsed !== null) {
        meta = parsed as Record<string, unknown>;
      }
    } catch (error) {
      logger.warn("[SkillStore] Invalid YAML frontmatter in skill markdown", {
        fallbackId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
    body = raw.slice(frontmatterMatch[0].length);
  }

  const name = typeof meta.name === "string" ? meta.name : fallbackId;
  const description =
    typeof meta.description === "string" ? meta.description : "";
  const instructions = body.trim();

  if (!name || !description || !instructions) {
    logger.warn(
      "[SkillStore] Skipping skill markdown missing name/description/body",
      { fallbackId },
    );
    return null;
  }

  const candidate: SkillDefinition = normalizeSkill({
    id: typeof meta.id === "string" ? meta.id : name,
    name,
    description,
    instructions,
    ...(typeof meta.displayName === "string"
      ? { displayName: meta.displayName }
      : {}),
    ...(Array.isArray(meta.tags)
      ? { tags: meta.tags.map((t) => String(t)) }
      : {}),
    ...(meta.scope === "scoped" || meta.scope === "global"
      ? { scope: meta.scope }
      : {}),
    ...(Array.isArray(meta.scopeIds)
      ? { scopeIds: meta.scopeIds.map((s) => String(s)) }
      : {}),
    ...(typeof meta.version === "number" ? { version: meta.version } : {}),
  });
  return candidate;
}

/**
 * Directory-backed store. Read layouts:
 *  - `<dir>/<id>.json`      — JSON SkillDefinition (mutable)
 *  - `<dir>/<name>.md`      — frontmatter markdown (read-only source)
 *  - `<dir>/<name>/SKILL.md` — Claude-skills directory layout (read-only source)
 * Mutations always write `<id>.json`; a JSON file shadows a markdown skill
 * with the same id, so updating a markdown-sourced skill "copies up" to JSON.
 */
export class FileSystemSkillStore implements SkillStore {
  private cache: Map<string, SkillDefinition> | null = null;

  constructor(private readonly baseDir: string) {}

  invalidate(): void {
    this.cache = null;
  }

  async get(id: string): Promise<SkillDefinition | null> {
    const all = this.load();
    return all.get(id) ?? null;
  }

  async put(skill: SkillDefinition): Promise<void> {
    fs.mkdirSync(this.baseDir, { recursive: true });
    const filePath = path.join(this.baseDir, `${skill.id}.json`);
    fs.writeFileSync(
      filePath,
      JSON.stringify(normalizeSkill(skill), null, 2),
      "utf-8",
    );
    this.invalidate();
  }

  async delete(id: string): Promise<void> {
    const filePath = path.join(this.baseDir, `${id}.json`);
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }
    this.invalidate();
  }

  async index(): Promise<SkillIndexItem[]> {
    return Array.from(this.load().values()).map(toSkillIndexItem);
  }

  /**
   * Scan the directory into an id→skill map. Markdown sources load first
   * so JSON files (the mutable layer) shadow them on id collision.
   */
  private load(): Map<string, SkillDefinition> {
    if (this.cache) {
      return this.cache;
    }

    const skills = new Map<string, SkillDefinition>();
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(this.baseDir, { withFileTypes: true });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        logger.warn("[SkillStore] Failed to read skills directory", {
          baseDir: this.baseDir,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.cache = skills;
      return skills;
    }

    const jsonFiles: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(this.baseDir, entry.name);
      try {
        if (entry.isDirectory()) {
          const skillMd = path.join(fullPath, "SKILL.md");
          if (fs.existsSync(skillMd)) {
            const parsed = parseSkillMarkdown(
              fs.readFileSync(skillMd, "utf-8"),
              entry.name,
            );
            if (parsed) {
              skills.set(parsed.id, parsed);
            }
          }
        } else if (entry.name.endsWith(".md")) {
          const parsed = parseSkillMarkdown(
            fs.readFileSync(fullPath, "utf-8"),
            entry.name.replace(/\.md$/, ""),
          );
          if (parsed) {
            skills.set(parsed.id, parsed);
          }
        } else if (entry.name.endsWith(".json")) {
          jsonFiles.push(fullPath);
        }
      } catch (error) {
        logger.warn("[SkillStore] Failed to load skill file", {
          file: fullPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // JSON layer last — shadows markdown-sourced skills with the same id.
    for (const filePath of jsonFiles) {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (isValidSkill(parsed)) {
          skills.set(parsed.id, normalizeSkill(parsed));
        } else {
          logger.warn("[SkillStore] Skipping invalid skill JSON", {
            file: filePath,
          });
        }
      } catch (error) {
        logger.warn("[SkillStore] Failed to parse skill JSON", {
          file: filePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.cache = skills;
    return skills;
  }
}

/** Resolve a storage config to a concrete store. Defaults to memory. */
export function createSkillStore(config?: SkillsStorageConfig): SkillStore {
  if (!config || config.type === "memory") {
    return new InMemorySkillStore(
      config?.type === "memory" ? config.skills : undefined,
    );
  }
  if (config.type === "filesystem") {
    return new FileSystemSkillStore(config.path);
  }
  if (config.type === "s3") {
    return new S3SkillStore(config);
  }
  if (config.type === "redis") {
    return new RedisSkillStore(config);
  }
  return config.store;
}

/**
 * Pure index-filtering + prompt-index formatting helpers.
 *
 * Matching semantics are ported from curator's battle-tested
 * `searchSkillsFromIndex`: case-insensitive substring match on
 * name/displayName/description, optional tag filter on top, scope filter
 * that always admits global skills, and active-only visibility.
 */

import type {
  SkillDefinition,
  SkillIndexItem,
  SkillSearchQuery,
} from "../types/index.js";

/** Strip instructions from a full definition to form an index entry. */
export function toSkillIndexItem(skill: SkillDefinition): SkillIndexItem {
  const { instructions: _instructions, ...indexItem } = skill;
  return indexItem;
}

/**
 * Sort index entries by name (byte order, locale-independent) so every
 * listing renders byte-identically across calls and store backends.
 * Store enumeration order (Redis SCAN, fs.readdir, S3 listings) is not
 * stable — an unsorted listing would shuffle between calls and invalidate
 * provider prompt caches. Returns a new array.
 */
export function sortSkillIndex(items: SkillIndexItem[]): SkillIndexItem[] {
  return [...items].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
}

/** Filter index entries by query/tag/scope. Active skills only. */
export function filterSkillIndex(
  items: SkillIndexItem[],
  query: SkillSearchQuery,
): SkillIndexItem[] {
  const lowerQuery = query.query?.toLowerCase();
  const lowerTag = query.tag?.toLowerCase();

  const matched = items.filter((item) => {
    if ((item.status ?? "active") !== "active") {
      return false;
    }

    // Scope filter: global skills always pass. Scoped skills require a
    // scopeId that matches; when the caller supplies no scopeId we fail
    // closed and exclude them, so a shared multi-tenant instance that forgets
    // to pass a per-call scopeId never leaks one tenant's scoped skills to
    // everyone (#1139). Callers that legitimately want a tenant's scoped
    // skills must pass that tenant's scopeId.
    if (item.scope === "scoped") {
      if (!query.scopeId || !(item.scopeIds ?? []).includes(query.scopeId)) {
        return false;
      }
    }

    if (lowerQuery) {
      const nameMatch =
        item.name.toLowerCase().includes(lowerQuery) ||
        (item.displayName ?? "").toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery);
      if (!nameMatch) {
        return false;
      }
    }

    if (lowerTag) {
      const tagMatch = (item.tags ?? []).some((t) =>
        t.toLowerCase().includes(lowerTag),
      );
      if (!tagMatch) {
        return false;
      }
    }

    return true;
  });

  return query.limit !== undefined ? matched.slice(0, query.limit) : matched;
}

/**
 * Reject resource paths that could escape a skill's namespace: absolute
 * paths, traversal segments, and empty segments. The manager validates
 * before reaching any store — this is defense in depth for stores whose
 * keys are built by concatenation (S3, Redis) or path joining.
 */
export function isSafeSkillResourcePath(resourcePath: string): boolean {
  const normalized = resourcePath.replace(/\\/g, "/");
  return (
    normalized.length > 0 &&
    !normalized.startsWith("/") &&
    !normalized.split("/").some((segment) => segment === ".." || segment === "")
  );
}

/**
 * Whether a skill is visible from the calling scope. Fails closed, matching
 * `filterSkillIndex`: a scoped skill is hidden unless the caller supplies a
 * `scopeId` that the skill explicitly lists. Omitting `scopeId` therefore
 * yields global skills only — it must never expose a scoped skill by name
 * through `use_skill` / `read_skill_resource` (#1139).
 */
export function isSkillVisibleInScope(
  skill: Pick<SkillDefinition, "scope" | "scopeIds">,
  scopeId?: string,
): boolean {
  if (skill.scope !== "scoped") {
    return true;
  }
  if (!scopeId) {
    return false;
  }
  return (skill.scopeIds ?? []).includes(scopeId);
}

/** Trim a description to its first sentence (or the whole text when unsplittable). */
function firstSentence(description: string): string {
  const match = description.match(/^[^.!?]*[.!?]/);
  return match ? match[0].trim() : description;
}

/**
 * Render the `<available_skills>` block embedded in the use_skill tool
 * description ("tool" discovery mode). One line per skill — name,
 * description, tags — instructions never appear here.
 *
 * Budget handling is uniform and stateless: over budget, every
 * description drops to its first sentence, then to a hard 80-char cap.
 * The render is a pure function of the (sorted) index, so the tool
 * description stays byte-identical across calls — a prerequisite for
 * provider prompt caching. Names are never dropped.
 */
export function renderSkillListing(
  items: SkillIndexItem[],
  budgetChars: number,
): string | null {
  if (items.length === 0) {
    return null;
  }

  const render = (describe: (item: SkillIndexItem) => string): string => {
    const lines = items.map((item) => {
      const tags =
        item.tags && item.tags.length > 0
          ? ` [tags: ${item.tags.join(", ")}]`
          : "";
      return `- ${item.name}: ${describe(item)}${tags}`;
    });
    return ["<available_skills>", ...lines, "</available_skills>"].join("\n");
  };

  const full = render((item) => item.description);
  if (full.length <= budgetChars) {
    return full;
  }

  const sentences = render((item) => firstSentence(item.description));
  if (sentences.length <= budgetChars) {
    return sentences;
  }

  const HARD_CAP = 80;
  // Floor render — returned even if it still exceeds the budget.
  return render((item) => {
    const sentence = firstSentence(item.description);
    return sentence.length > HARD_CAP
      ? `${sentence.slice(0, HARD_CAP - 1)}…`
      : sentence;
  });
}

/**
 * Render the compact skills index appended to the system prompt
 * ("system-prompt" discovery mode). Names + descriptions only —
 * instructions are never included; the model loads them via use_skill.
 * Returns null when nothing is visible so callers can skip injection.
 */
export function formatSkillsPromptIndex(
  items: SkillIndexItem[],
  maxItems: number,
): string | null {
  // Nothing visible, or the index is explicitly disabled (maxItems <= 0):
  // skip injection entirely rather than emit a header + "N more skills exist"
  // note with zero skill lines (#1139).
  if (items.length === 0 || maxItems <= 0) {
    return null;
  }

  const visible = items.slice(0, maxItems);
  const lines = visible.map((item) => {
    const label = item.displayName
      ? `${item.name} (${item.displayName})`
      : item.name;
    const tags =
      item.tags && item.tags.length > 0
        ? ` [tags: ${item.tags.join(", ")}]`
        : "";
    return `- ${label}: ${item.description}${tags}`;
  });

  const truncationNote =
    items.length > visible.length
      ? `\n(${items.length - visible.length} more skills exist — use list_skills to discover them.)`
      : "";

  return (
    [
      "## Available Skills",
      "The following team-defined skills (SOPs, playbooks, workflows) are available.",
      "Before answering from general knowledge, check whether one applies to the user's request.",
      "To use a skill, call the use_skill tool with its name to load the full instructions, then follow them exactly.",
      "",
      ...lines,
    ].join("\n") + truncationNote
  );
}

/**
 * useNewDocs Hooks
 *
 * React hooks to access new/updated docs data from the plugin.
 * Includes badge propagation support - parent categories show badges
 * if any child doc is new/updated.
 *
 * IMPLEMENTATION NOTE:
 * These hooks are part of the complete docusaurus-plugin-new-docs API but are
 * NOT currently used by the sidebar UI. The current sidebar implementation uses
 * a simpler label-parsing approach (see DocSidebarItem/Link and Category wrappers)
 * that extracts badges like [new] and [updated] directly from markdown labels.
 *
 * These hooks are INTENTIONALLY KEPT for:
 * 1. API completeness - consumers may want to build custom components using git-based detection
 * 2. Future features - e.g., "What's New" pages, automatic new doc listings, changelogs
 * 3. Alternative implementations - switching from label-based to git-based badge detection
 *
 * The hooks consume data from `docusaurus-plugin-new-docs` which detects new/modified
 * docs based on git history (comparing against release tags or time-based thresholds).
 *
 * @see plugins/docusaurus-plugin-new-docs/index.js - Plugin that generates the data
 * @see src/components/SidebarBadge.tsx - Label parsing implementation currently in use
 * @see src/theme/DocSidebarItem/ - Sidebar wrappers using label parsing
 */

import { usePluginData } from "@docusaurus/useGlobalData";

export type DocStatus = "new" | "updated" | "recent";

export type DocMetadata = {
  docId: string;
  filePath: string;
  status: DocStatus;
  createdAt: string | null;
  modifiedAt: string | null;
  commit: {
    hash: string;
    message: string;
    date: string;
  } | null;
};

export type NewDocsData = {
  newDocs: DocMetadata[];
  updatedDocs: DocMetadata[];
  recentDocs: DocMetadata[];
  config: {
    labels?: {
      new?: string;
      updated?: string;
      recent?: string;
    };
  };
  baseTag: string;
  generatedAt: string;
};

/**
 * Get all new docs data from the plugin
 */
export function useNewDocsData(): NewDocsData {
  const data = usePluginData("docusaurus-plugin-new-docs") as
    | NewDocsData
    | undefined;
  return (
    data || {
      newDocs: [],
      updatedDocs: [],
      recentDocs: [],
      config: {},
      baseTag: "",
      generatedAt: "",
    }
  );
}

/**
 * Normalize doc ID for consistent comparison
 */
function normalizeDocId(docId: string | undefined): string {
  if (!docId) return "";
  return docId
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .replace(/\/index$/, "");
}

/**
 * Check if a specific doc is new/updated/recent
 */
export function useDocStatus(docId: string): {
  isNew: boolean;
  isUpdated: boolean;
  isRecent: boolean;
  status: DocStatus | null;
  metadata: DocMetadata | null;
} {
  const { newDocs, updatedDocs, recentDocs } = useNewDocsData();

  const normalizedId = normalizeDocId(docId);

  const findDoc = (docs: DocMetadata[]) =>
    docs.find((d) => {
      const normalizedDocId = normalizeDocId(d.docId);
      return (
        normalizedDocId === normalizedId ||
        normalizedDocId === normalizedId + "/index" ||
        normalizedDocId + "/index" === normalizedId
      );
    });

  const newDoc = findDoc(newDocs);
  const updatedDoc = findDoc(updatedDocs);
  const recentDoc = findDoc(recentDocs);

  const metadata = newDoc || updatedDoc || recentDoc || null;

  return {
    isNew: !!newDoc,
    isUpdated: !!updatedDoc,
    isRecent: !!recentDoc,
    status: newDoc
      ? "new"
      : updatedDoc
        ? "updated"
        : recentDoc
          ? "recent"
          : null,
    metadata,
  };
}

/**
 * Check if a path (doc or category) should show a badge based on its own status
 * or any of its children having a badge status.
 *
 * This enables badge propagation - parent categories show badges if any child is new/updated/recent.
 *
 * @param pathPrefix - The category or doc path to check (e.g., "guides", "guides/server-adapters")
 * @returns Badge status considering all children
 */
export function useCategoryBadgeStatus(pathPrefix: string): {
  hasNewContent: boolean;
  hasUpdatedContent: boolean;
  hasRecentContent: boolean;
  status: DocStatus | null;
  newCount: number;
  updatedCount: number;
  recentCount: number;
} {
  const { newDocs, updatedDocs, recentDocs } = useNewDocsData();

  const normalizedPrefix = normalizeDocId(pathPrefix);

  // Check if any new doc starts with this path prefix
  const newInCategory = newDocs.filter((d) => {
    const normalizedDocId = normalizeDocId(d.docId);
    return (
      normalizedDocId === normalizedPrefix ||
      normalizedDocId.startsWith(normalizedPrefix + "/")
    );
  });

  // Check if any updated doc starts with this path prefix
  const updatedInCategory = updatedDocs.filter((d) => {
    const normalizedDocId = normalizeDocId(d.docId);
    return (
      normalizedDocId === normalizedPrefix ||
      normalizedDocId.startsWith(normalizedPrefix + "/")
    );
  });

  // Check if any recent doc starts with this path prefix
  const recentInCategory = recentDocs.filter((d) => {
    const normalizedDocId = normalizeDocId(d.docId);
    return (
      normalizedDocId === normalizedPrefix ||
      normalizedDocId.startsWith(normalizedPrefix + "/")
    );
  });

  const hasNewContent = newInCategory.length > 0;
  const hasUpdatedContent = updatedInCategory.length > 0;
  const hasRecentContent = recentInCategory.length > 0;

  // Priority: new > updated > recent
  let status: DocStatus | null = null;
  if (hasNewContent) {
    status = "new";
  } else if (hasUpdatedContent) {
    status = "updated";
  } else if (hasRecentContent) {
    status = "recent";
  }

  return {
    hasNewContent,
    hasUpdatedContent,
    hasRecentContent,
    status,
    newCount: newInCategory.length,
    updatedCount: updatedInCategory.length,
    recentCount: recentInCategory.length,
  };
}

/**
 * Build a complete map of all doc paths with their badge status.
 * Includes propagation - parent paths get badges if children have them.
 */
export function useAllDocStatuses(): Map<string, DocStatus> {
  const { newDocs, updatedDocs, recentDocs } = useNewDocsData();

  const statusMap = new Map<string, DocStatus>();

  // First, add all direct statuses
  for (const doc of newDocs) {
    const normalizedId = normalizeDocId(doc.docId);
    statusMap.set(normalizedId, "new");
  }

  for (const doc of updatedDocs) {
    const normalizedId = normalizeDocId(doc.docId);
    if (!statusMap.has(normalizedId)) {
      statusMap.set(normalizedId, "updated");
    }
  }

  for (const doc of recentDocs) {
    const normalizedId = normalizeDocId(doc.docId);
    if (!statusMap.has(normalizedId)) {
      statusMap.set(normalizedId, "recent");
    }
  }

  // Now propagate statuses up to parent paths
  // Priority: new > updated > recent
  const allPaths = Array.from(statusMap.keys());

  for (const path of allPaths) {
    const status = statusMap.get(path)!;
    const parts = path.split("/");

    // Build parent paths and set their status if not already set (or if higher priority)
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join("/");
      const existingStatus = statusMap.get(parentPath);

      // Set parent status based on priority
      if (!existingStatus) {
        statusMap.set(parentPath, status);
      } else if (status === "new" && existingStatus !== "new") {
        statusMap.set(parentPath, "new");
      } else if (status === "updated" && existingStatus === "recent") {
        statusMap.set(parentPath, "updated");
      }
    }
  }

  return statusMap;
}

/**
 * Get the badge label for a doc status
 */
export function useStatusLabel(status: DocStatus | null): string {
  const { config } = useNewDocsData();
  const labels = config?.labels || {
    new: "NEW",
    updated: "UPDATED",
    recent: "RECENT",
  };

  return status ? labels[status] || status.toUpperCase() : "";
}

/**
 * Get docs by status
 */
export function useDocsByStatus(
  status: "new" | "updated" | "recent" | "all" = "all",
): DocMetadata[] {
  const { newDocs, updatedDocs, recentDocs } = useNewDocsData();

  switch (status) {
    case "new":
      return newDocs;
    case "updated":
      return updatedDocs;
    case "recent":
      return recentDocs;
    case "all":
    default:
      return [...newDocs, ...updatedDocs, ...recentDocs];
  }
}

export default useNewDocsData;

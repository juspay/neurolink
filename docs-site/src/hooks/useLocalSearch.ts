import MiniSearch from "minisearch";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResult, UseAlgoliaSearchReturn } from "./useAlgoliaSearch";

interface SearchDocument {
  objectID: string;
  title: string;
  url: string;
  content?: string;
  hierarchy: {
    lvl0?: string;
    lvl1?: string;
    lvl2?: string;
    lvl3?: string;
  };
}

let indexPromise: Promise<MiniSearch<SearchDocument>> | null = null;

function loadIndex(): Promise<MiniSearch<SearchDocument>> {
  if (indexPromise) return indexPromise;

  indexPromise = fetch("/search-index.json")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((documents: SearchDocument[]) => {
      const miniSearch = new MiniSearch<SearchDocument>({
        fields: ["title", "content", "hierarchy.lvl0", "hierarchy.lvl1"],
        storeFields: ["title", "url", "content", "hierarchy"],
        extractField: (doc, fieldName) => {
          // Handle nested fields like "hierarchy.lvl0"
          if (fieldName.includes(".")) {
            const parts = fieldName.split(".");
            let value: unknown = doc;
            for (const part of parts) {
              value = (value as Record<string, unknown>)?.[part];
            }
            return value as string;
          }
          return (doc as unknown as Record<string, unknown>)[
            fieldName
          ] as string;
        },
        searchOptions: {
          boost: { title: 3, "hierarchy.lvl1": 2 },
          fuzzy: 0.2,
          prefix: true,
        },
      });

      miniSearch.addAll(documents.map((doc) => ({ ...doc, id: doc.objectID })));
      return miniSearch;
    })
    .catch((err) => {
      console.warn("[local-search] Failed to load search index:", err);
      indexPromise = null;
      throw err;
    });

  return indexPromise;
}

interface UseLocalSearchOptions {
  debounceMs?: number;
}

export function useLocalSearch({
  debounceMs = 200,
}: UseLocalSearchOptions = {}): UseAlgoliaSearchReturn {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef<MiniSearch<SearchDocument> | null>(null);

  // Load index on mount
  useEffect(() => {
    loadIndex()
      .then((idx) => {
        indexRef.current = idx;
      })
      .catch(() => {
        // Error already logged in loadIndex
      });
  }, []);

  const search = useCallback(async (searchQuery: string): Promise<void> => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalResults(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let idx = indexRef.current;
      if (!idx) {
        idx = await loadIndex();
        indexRef.current = idx;
      }

      const searchResults = idx.search(searchQuery).slice(0, 20);

      const hits: SearchResult[] = searchResults.map((result) => ({
        objectID: result.id as string,
        title: (result as unknown as SearchDocument).title || "",
        url: (result as unknown as SearchDocument).url || "",
        content: (result as unknown as SearchDocument).content,
        hierarchy: (result as unknown as SearchDocument).hierarchy || {},
        // Add highlight results with <mark> tags
        _highlightResult: buildHighlights(
          result as unknown as SearchDocument,
          searchQuery,
        ),
      }));

      setResults(hits);
      setTotalResults(hits.length);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Local search failed"));
      setResults([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setTotalResults(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      search(query);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, search, debounceMs]);

  const clearResults = useCallback(() => {
    setQuery("");
    setResults([]);
    setTotalResults(0);
    setSelectedIndex(0);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    search,
    clearResults,
    selectedIndex,
    setSelectedIndex,
    totalResults,
  };
}

/** Build highlight results by wrapping matched terms in <mark> tags */
function buildHighlights(
  doc: SearchDocument,
  query: string,
): SearchResult["_highlightResult"] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  function highlight(text: string | undefined): { value: string } {
    if (!text) return { value: "" };
    let highlighted = escapeHtml(text);
    for (const term of terms) {
      const regex = new RegExp(`(${escapeRegex(term)}\\w*)`, "gi");
      highlighted = highlighted.replace(regex, "<mark>$1</mark>");
    }
    return { value: highlighted };
  }

  return {
    title: highlight(doc.title),
    content: highlight(doc.content),
    hierarchy: {
      lvl0: highlight(doc.hierarchy?.lvl0),
      lvl1: highlight(doc.hierarchy?.lvl1),
      lvl2: highlight(doc.hierarchy?.lvl2),
      lvl3: highlight(doc.hierarchy?.lvl3),
    },
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

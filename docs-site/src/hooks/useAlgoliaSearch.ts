import {
  liteClient as algoliasearch,
  type LiteClient,
} from "algoliasearch/lite";
import { useCallback, useEffect, useRef, useState } from "react";

export type SearchResult = {
  objectID: string;
  title: string;
  url: string;
  hierarchy: {
    lvl0?: string;
    lvl1?: string;
    lvl2?: string;
    lvl3?: string;
  };
  content?: string;
  _highlightResult?: {
    title?: { value: string };
    content?: { value: string };
    hierarchy?: {
      lvl0?: { value: string };
      lvl1?: { value: string };
      lvl2?: { value: string };
      lvl3?: { value: string };
    };
  };
};

type UseAlgoliaSearchOptions = {
  appId: string;
  searchApiKey: string;
  indexName: string;
  debounceMs?: number;
};

export type UseAlgoliaSearchReturn = {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  totalResults: number;
};

// Simple LRU cache for recent searches
class SearchCache {
  private cache: Map<string, SearchResult[]> = new Map();
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  get(key: string): SearchResult[] | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: SearchResult[]): void {
    if (this.cache.size >= this.maxSize) {
      // Delete oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

const searchCache = new SearchCache();

export function useAlgoliaSearch({
  appId,
  searchApiKey,
  indexName,
  debounceMs = 300,
}: UseAlgoliaSearchOptions): UseAlgoliaSearchReturn {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const clientRef = useRef<LiteClient | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  // Initialize Algolia client
  useEffect(() => {
    if (appId && searchApiKey) {
      clientRef.current = algoliasearch(appId, searchApiKey);
    }
    return () => {
      clientRef.current = null;
    };
  }, [appId, searchApiKey]);

  // Cleanup on unmount to prevent race conditions
  useEffect(() => {
    return () => {
      // Increment request ID to invalidate any pending requests
      requestIdRef.current++;
    };
  }, []);

  const search = useCallback(
    async (searchQuery: string): Promise<void> => {
      if (!clientRef.current || !searchQuery.trim()) {
        setResults([]);
        setTotalResults(0);
        setIsLoading(false);
        return;
      }

      const trimmedQuery = searchQuery.trim().toLowerCase();

      // Check cache first
      const cachedResults = searchCache.get(trimmedQuery);
      if (cachedResults) {
        setResults(cachedResults);
        setTotalResults(cachedResults.length);
        setSelectedIndex(0);
        setIsLoading(false);
        return;
      }

      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Increment request ID
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const { results: searchResults } =
          await clientRef.current.search<SearchResult>({
            requests: [
              {
                indexName,
                query: searchQuery,
                hitsPerPage: 20,
                attributesToRetrieve: ["title", "url", "hierarchy", "content"],
                attributesToHighlight: [
                  "title",
                  "content",
                  "hierarchy.lvl0",
                  "hierarchy.lvl1",
                  "hierarchy.lvl2",
                  "hierarchy.lvl3",
                ],
                highlightPreTag: "<mark>",
                highlightPostTag: "</mark>",
              },
            ],
          });

        // Ignore stale results
        if (currentRequestId !== requestIdRef.current) {
          return; // Newer request already in progress, ignore this result
        }

        const hits = (searchResults[0] as { hits: SearchResult[] })?.hits || [];
        const nbHits = (searchResults[0] as { nbHits: number })?.nbHits || 0;

        // Cache the results
        searchCache.set(trimmedQuery, hits);

        setResults(hits);
        setTotalResults(nbHits);
        setSelectedIndex(0);
        setError(null);
      } catch (err) {
        // Ignore if this is a stale request
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err : new Error("Search failed"));
        setResults([]);
        setTotalResults(0);
      } finally {
        // Only update loading state if this is the latest request
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [indexName],
  );

  // Debounced search effect
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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

// Hook for managing recent searches in localStorage
export function useRecentSearches(maxItems = 5) {
  const STORAGE_KEY = "neurolink-recent-searches";

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const addRecentSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      setRecentSearches((prev) => {
        const filtered = prev.filter(
          (s) => s.toLowerCase() !== trimmed.toLowerCase(),
        );
        const updated = [trimmed, ...filtered].slice(0, maxItems);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore localStorage errors
        }

        return updated;
      });
    },
    [maxItems],
  );

  const removeRecentSearch = useCallback((query: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter(
        (s) => s.toLowerCase() !== query.toLowerCase(),
      );

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }

      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  };
}

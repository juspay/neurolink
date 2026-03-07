import { useHistory } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import * as Dialog from "@radix-ui/react-dialog";
import React, { useCallback, useEffect, useRef } from "react";
import {
  type SearchResult,
  useAlgoliaSearch,
  useRecentSearches,
} from "../../hooks/useAlgoliaSearch";
import { useLocalSearch } from "../../hooks/useLocalSearch";
import { ArrowIcon, ReturnIcon } from "../icons";
import { Kbd } from "../ui/Kbd";
import { EmptySearch, NoResults, SearchError } from "./EmptySearch";
import styles from "./Search.module.css";
import { SearchInput } from "./SearchInput";
import { SearchResults } from "./SearchResults";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INDEX_NAME = "neurolink-docs";

function useSearch() {
  const { siteConfig } = useDocusaurusContext();
  const algoliaAppId = (siteConfig.customFields?.algoliaAppId as string) || "";
  const algoliaSearchKey =
    (siteConfig.customFields?.algoliaSearchApiKey as string) || "";
  const hasAlgolia = Boolean(algoliaAppId && algoliaSearchKey);

  const algoliaSearch = useAlgoliaSearch({
    appId: algoliaAppId,
    searchApiKey: algoliaSearchKey,
    indexName: INDEX_NAME,
  });

  const localSearch = useLocalSearch();

  return hasAlgolia ? algoliaSearch : localSearch;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const history = useHistory();
  const inputRef = useRef<HTMLInputElement>(null);

  // Search hook — Algolia when configured, local search otherwise
  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clearResults,
    selectedIndex,
    setSelectedIndex,
  } = useSearch();

  // Recent searches hook
  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useRecentSearches();

  // Navigate to result
  const navigateToResult = useCallback(
    (result: SearchResult) => {
      addRecentSearch(query);
      onClose();
      clearResults();
      history.push(result.url);
    },
    [query, addRecentSearch, onClose, clearResults, history],
  );

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          const maxIndex = Math.max(results.length - 1, 0);
          setSelectedIndex(Math.min(selectedIndex + 1, maxIndex));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            navigateToResult(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    results,
    selectedIndex,
    setSelectedIndex,
    navigateToResult,
    onClose,
  ]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Delay clearing to allow animation
      const timer = setTimeout(() => {
        clearResults();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, clearResults]);

  // Handle recent search click
  const handleRecentSearchClick = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      inputRef.current?.focus();
    },
    [setQuery],
  );

  // Render content based on state
  const renderContent = () => {
    if (error) {
      return <SearchError error={error} />;
    }

    if (!query.trim()) {
      return (
        <EmptySearch
          recentSearches={recentSearches}
          onRecentSearchClick={handleRecentSearchClick}
          onRemoveRecentSearch={removeRecentSearch}
          onClearRecentSearches={clearRecentSearches}
        />
      );
    }

    if (!isLoading && results.length === 0) {
      return <NoResults query={query} />;
    }

    return (
      <SearchResults
        results={results}
        selectedIndex={selectedIndex}
        onSelect={navigateToResult}
        onSelectedIndexChange={setSelectedIndex}
      />
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.modal}
          aria-label="Search documentation"
        >
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={setQuery}
            onClear={clearResults}
            isLoading={isLoading}
          />

          {renderContent()}

          <div className={styles.footer}>
            <div className={styles.footerHints}>
              <span className={styles.footerHint}>
                <ArrowIcon direction="up" className={styles.footerHintIcon} />
                <ArrowIcon direction="down" className={styles.footerHintIcon} />
                <span>to navigate</span>
              </span>
              <span className={styles.footerHint}>
                <ReturnIcon className={styles.footerHintIcon} />
                <span>to select</span>
              </span>
              <span className={styles.footerHint}>
                <Kbd>esc</Kbd>
                <span>to close</span>
              </span>
            </div>
            <div className={styles.footerPowered}>
              <span>NeuroLink Search</span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

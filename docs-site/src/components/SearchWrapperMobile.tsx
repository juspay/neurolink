import { useHistory } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { Dialog, Transition } from "@headlessui/react";
import type React from "react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  type SearchResult,
  useAlgoliaSearch,
  useRecentSearches,
} from "../hooks/useAlgoliaSearch";
import { useLocalSearch } from "../hooks/useLocalSearch";
import { ArrowIcon, CloseIcon, SearchIcon } from "./icons";
import { EmptySearch, NoResults, SearchError } from "./Search/EmptySearch";
import styles from "./Search/Search.module.css";
import { SearchResults } from "./Search/SearchResults";

interface SearchWrapperMobileProps {
  isOpen: boolean;
  onClose: () => void;
}

const INDEX_NAME = "neurolink_docs_v1";

function useMobileSearch() {
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

  // Sync query to local search when Algolia errors out
  useEffect(() => {
    if (algoliaSearch.error && algoliaSearch.query) {
      localSearch.setQuery(algoliaSearch.query);
    }
  }, [algoliaSearch.error, algoliaSearch.query, localSearch.setQuery]);

  // Fall back to local search if Algolia is not configured or errors out
  if (!hasAlgolia || algoliaSearch.error) {
    return localSearch;
  }
  return algoliaSearch;
}

export function SearchWrapperMobile({
  isOpen,
  onClose,
}: SearchWrapperMobileProps) {
  const history = useHistory();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState("");

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
  } = useMobileSearch();

  // Recent searches hook
  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useRecentSearches();

  // Sync local query with hook query
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    setQuery(value);
  };

  // Handle clear
  const handleClear = () => {
    setLocalQuery("");
    clearResults();
    inputRef.current?.focus();
  };

  // Handle recent search click
  const handleRecentSearchClick = useCallback(
    (searchQuery: string) => {
      setLocalQuery(searchQuery);
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

    if (!localQuery.trim()) {
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
      return <NoResults query={localQuery} />;
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
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className={styles.mobileSearchWrapper} onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0 translate-x-full"
          enterTo="opacity-100 translate-x-0"
          leave="ease-in duration-150"
          leaveFrom="opacity-100 translate-x-0"
          leaveTo="opacity-0 translate-x-full"
        >
          <Dialog.Panel
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              backgroundColor: "var(--ifm-background-surface-color)",
            }}
          >
            {/* Header */}
            <div className={styles.mobileHeader}>
              <button
                type="button"
                className={styles.mobileBackButton}
                onClick={onClose}
                aria-label="Close search"
              >
                <ArrowIcon direction="left" className={styles.mobileBackIcon} />
              </button>
              <div className={styles.mobileInputWrapper}>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.mobileInput}
                  value={localQuery}
                  onChange={handleInputChange}
                  placeholder="Search documentation..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </div>
              {localQuery && (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={handleClear}
                  aria-label="Clear search"
                >
                  <CloseIcon className={styles.clearButtonIcon} />
                </button>
              )}
              {isLoading && (
                <div
                  className={styles.loadingSpinner}
                  role="status"
                  aria-live="polite"
                  aria-label="Loading"
                />
              )}
            </div>

            {/* Results */}
            <div className={styles.mobileResults}>{renderContent()}</div>
          </Dialog.Panel>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
}

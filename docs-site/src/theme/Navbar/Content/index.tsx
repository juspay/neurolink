import React, { useState, useCallback, lazy, Suspense } from "react";
import Content from "@theme-original/Navbar/Content";
import type ContentType from "@theme/Navbar/Content";
import type { WrapperProps } from "@docusaurus/types";
import BrowserOnly from "@docusaurus/BrowserOnly";
import { useHotkeys } from "react-hotkeys-hook";
import { SearchIcon } from "@site/src/components/icons";
import { Kbd } from "@site/src/components/ui/Kbd";
import styles from "@site/src/components/Search/Search.module.css";

// Lazy-load SearchModal to avoid SSR issues with algoliasearch (uses ws native module)
const SearchModal = lazy(() =>
  import("@site/src/components/Search/SearchModal").then((mod) => ({
    default: mod.SearchModal,
  })),
);

type Props = WrapperProps<typeof ContentType>;

function SearchTriggerAndModal(): React.ReactElement {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  useHotkeys("mod+k", (e: KeyboardEvent) => {
    e.preventDefault();
    openSearch();
  });

  useHotkeys("/", (e: KeyboardEvent) => {
    const target = e.target;
    if (
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    )
      return;
    e.preventDefault();
    openSearch();
  });

  return (
    <>
      <div className={styles.navbarSearchContainer}>
        <button
          className={styles.searchButton}
          onClick={openSearch}
          aria-label="Search documentation"
          type="button"
        >
          <SearchIcon className={styles.searchButtonIcon} />
          <span className={styles.searchButtonText}>Search docs...</span>
          <span className={styles.searchButtonShortcut}>
            <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>
      {isSearchOpen && (
        <Suspense fallback={null}>
          <SearchModal isOpen={isSearchOpen} onClose={closeSearch} />
        </Suspense>
      )}
    </>
  );
}

export default function ContentWrapper(props: Props): React.ReactElement {
  return (
    <>
      <Content {...props} />
      <BrowserOnly>{() => <SearchTriggerAndModal />}</BrowserOnly>
    </>
  );
}

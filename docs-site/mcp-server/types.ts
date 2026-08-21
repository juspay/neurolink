export type IndexDocument = {
  id: string;
  title: string;
  description: string;
  content: string;
  section: string;
  tags: string[];
  path: string;
};

// The Docusaurus search-index plugin (docs-site/plugins/docusaurus-plugin-search-index)
// emits a flat Algolia-style array of records, one per page plus one per
// heading anchor on that page — not the {version,documents:[...]} envelope
// this server originally consumed. See docs-site/static/search-index.json.
export type RawSearchRecord = {
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
};

export type SearchIndex = RawSearchRecord[];

export type SearchResult = {
  id: string;
  title: string;
  description: string;
  section: string;
  path: string;
  score: number;
  content?: string;
};

export type SectionInfo = {
  name: string;
  pageCount: number;
  pages: { title: string; path: string }[];
};

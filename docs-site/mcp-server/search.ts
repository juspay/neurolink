import MiniSearch from "minisearch";
import type {
  IndexDocument,
  SearchIndex,
  SearchResult,
  SectionInfo,
} from "./types.js";

const MINISEARCH_CONFIG = {
  fields: ["title", "description", "content", "tags"],
  storeFields: ["title", "description", "section", "path"],
  searchOptions: {
    boost: { title: 3, description: 2, tags: 1.5 },
    fuzzy: 0.2,
    prefix: true,
  },
} as const;

export class DocsSearch {
  private miniSearch: MiniSearch<IndexDocument>;
  private documents: Map<string, IndexDocument> = new Map();
  private sections: Map<string, IndexDocument[]> = new Map();

  constructor() {
    this.miniSearch = new MiniSearch<IndexDocument>(MINISEARCH_CONFIG);
  }

  loadIndex(indexData: SearchIndex): void {
    this.documents.clear();
    this.sections.clear();
    this.miniSearch = new MiniSearch(MINISEARCH_CONFIG);

    for (const doc of indexData.documents) {
      this.documents.set(doc.id, doc);
    }

    for (const doc of this.documents.values()) {
      const sectionDocs = this.sections.get(doc.section) || [];
      sectionDocs.push(doc);
      this.sections.set(doc.section, sectionDocs);
    }
    this.miniSearch.addAll(Array.from(this.documents.values()));
  }

  search(query: string, limit = 10, section?: string): SearchResult[] {
    const options = section
      ? {
          filter: (result: Record<string, unknown>) =>
            result["section"] === section,
        }
      : undefined;
    const results = this.miniSearch.search(query, options);

    return results.slice(0, limit).map((r) => ({
      id: String(r.id),
      title: String(r["title"] ?? ""),
      description: String(r["description"] ?? ""),
      section: String(r["section"] ?? ""),
      path: String(r["path"] ?? ""),
      score: r.score,
    }));
  }

  getPage(docPath: string): IndexDocument | undefined {
    return (
      this.documents.get(docPath) ||
      this.documents.get(docPath.replace(/^\//, ""))
    );
  }

  listSections(): SectionInfo[] {
    const result: SectionInfo[] = [];
    for (const [name, docs] of this.sections) {
      result.push({
        name,
        pageCount: docs.length,
        pages: docs.map((d) => ({ title: d.title, path: d.path })),
      });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  getBySection(section: string): IndexDocument[] {
    return this.sections.get(section) || [];
  }

  get documentCount(): number {
    return this.documents.size;
  }
}

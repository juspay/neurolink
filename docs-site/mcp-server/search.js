import MiniSearch from "minisearch";
const MINISEARCH_CONFIG = {
  fields: ["title", "description", "content", "tags"],
  storeFields: ["title", "description", "section", "path"],
  searchOptions: {
    boost: { title: 3, description: 2, tags: 1.5 },
    fuzzy: 0.2,
    prefix: true,
  },
};
export class DocsSearch {
  miniSearch;
  documents = new Map();
  sections = new Map();
  constructor() {
    this.miniSearch = new MiniSearch(MINISEARCH_CONFIG);
  }
  loadIndex(indexData) {
    this.documents.clear();
    this.sections.clear();
    this.miniSearch = new MiniSearch(MINISEARCH_CONFIG);
    // indexData is a flat array: one record per page plus one per heading
    // anchor on that page (url contains "#..."). Normalize every record to
    // IndexDocument so search() covers page and anchor text alike, but only
    // keep the page-level ones (no "#" in path) for the page map / sections
    // that get_page, list_sections and get_by_section rely on.
    const normalized = indexData.map((raw) => ({
      id: raw.objectID,
      title: raw.title,
      description: "",
      content: raw.content ?? "",
      section: (raw.hierarchy?.lvl0 ?? "").toLowerCase(),
      tags: [],
      path: raw.url.replace(/^\/docs\//, ""),
    }));
    for (const doc of normalized) {
      if (doc.path.includes("#")) {
        continue;
      }
      this.documents.set(doc.path, doc);
    }
    for (const doc of this.documents.values()) {
      const sectionDocs = this.sections.get(doc.section) || [];
      sectionDocs.push(doc);
      this.sections.set(doc.section, sectionDocs);
    }
    this.miniSearch.addAll(normalized);
  }
  search(query, limit = 10, section) {
    const options = section
      ? {
          filter: (result) => result["section"] === section,
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
  getPage(docPath) {
    return (
      this.documents.get(docPath) ||
      this.documents.get(docPath.replace(/^\//, ""))
    );
  }
  listSections() {
    const result = [];
    for (const [name, docs] of this.sections) {
      result.push({
        name,
        pageCount: docs.length,
        pages: docs.map((d) => ({ title: d.title, path: d.path })),
      });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }
  getBySection(section) {
    return this.sections.get(section) || [];
  }
  get documentCount() {
    return this.documents.size;
  }
}
//# sourceMappingURL=search.js.map

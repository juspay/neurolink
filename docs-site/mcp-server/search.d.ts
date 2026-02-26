import type { IndexDocument, SearchIndex, SearchResult, SectionInfo } from "./types.js";
export declare class DocsSearch {
    private miniSearch;
    private documents;
    private sections;
    constructor();
    loadIndex(indexData: SearchIndex): void;
    search(query: string, limit?: number, section?: string): SearchResult[];
    getPage(docPath: string): IndexDocument | undefined;
    listSections(): SectionInfo[];
    getBySection(section: string): IndexDocument[];
    get documentCount(): number;
}

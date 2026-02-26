export type IndexDocument = {
    id: string;
    title: string;
    description: string;
    content: string;
    section: string;
    tags: string[];
    path: string;
};
export type SearchIndex = {
    version: number;
    generatedAt: string;
    documentCount: number;
    documents: IndexDocument[];
};
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
    pages: {
        title: string;
        path: string;
    }[];
};

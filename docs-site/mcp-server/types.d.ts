export type IndexDocument = {
    id: string;
    title: string;
    description: string;
    content: string;
    section: string;
    tags: string[];
    path: string;
};
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
    pages: {
        title: string;
        path: string;
    }[];
};

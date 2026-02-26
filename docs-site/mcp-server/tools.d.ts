import { z } from "zod";
import type { DocsSearch } from "./search.js";
export declare function createToolDefinitions(search: DocsSearch): {
    search_docs: {
        name: string;
        description: string;
        paramsSchema: {
            query: z.ZodString;
            limit: z.ZodOptional<z.ZodNumber>;
            section: z.ZodOptional<z.ZodString>;
        };
        handler: (args: {
            query: string;
            limit?: number;
            section?: string;
        }) => {
            content: {
                type: "text";
                text: string;
            }[];
        };
    };
    get_page: {
        name: string;
        description: string;
        paramsSchema: {
            path: z.ZodString;
        };
        handler: (args: {
            path: string;
        }) => {
            content: {
                type: "text";
                text: string;
            }[];
        };
    };
    list_sections: {
        name: string;
        description: string;
        paramsSchema: {};
        handler: () => {
            content: {
                type: "text";
                text: string;
            }[];
        };
    };
    get_api_reference: {
        name: string;
        description: string;
        paramsSchema: {
            method: z.ZodOptional<z.ZodString>;
        };
        handler: (args: {
            method?: string;
        }) => {
            content: {
                type: "text";
                text: string;
            }[];
        };
    };
    get_examples: {
        name: string;
        description: string;
        paramsSchema: {
            topic: z.ZodOptional<z.ZodString>;
            provider: z.ZodOptional<z.ZodString>;
        };
        handler: (args: {
            topic?: string;
            provider?: string;
        }) => {
            content: {
                type: "text";
                text: string;
            }[];
        };
    };
    get_changelog: {
        name: string;
        description: string;
        paramsSchema: {
            limit: z.ZodOptional<z.ZodNumber>;
        };
        handler: (args: {
            limit?: number;
        }) => {
            content: {
                type: "text";
                text: string;
            }[];
        };
    };
};

import { tool } from "ai";
import { z } from "zod";
import { searchWeb } from "@/lib/search";

export const webSearchTool = tool({
    description:
        "Search the web for recent and factual information.",

    inputSchema: z.object({
        query: z.string(),
    }),

    execute: async ({ query }) => {
        return await searchWeb(query);
    },
});
import { tavilyClient } from "./tavily";

export async function searchWeb(query: string) {
    const response = await tavilyClient.search(query, {
        searchDepth: "advanced",
        maxResults: 5,
        includeAnswer: true,
        includeRawContent: false,
    });

    return {
        answer: response.answer,
        results: response.results.map((result) => ({
            title: result.title,
            url: result.url,
            content: result.content,
        })),
    };
}
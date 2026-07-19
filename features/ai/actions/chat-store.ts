"use server";

import { isTextUIPart, type UIMessage } from "ai";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

function getMessageText(message: UIMessage) {
    return message.parts.filter(isTextUIPart).map((part) => part.text).join("");
}

function toUIMessageParts(
    parts: Prisma.JsonValue | null,
    content: string
): UIMessage["parts"] {
    const stored = parts as UIMessage["parts"] | null;
    if (Array.isArray(stored) && stored.length > 0) {
        return stored;
    }

    return [{ type: "text", text: content }];
}

type BranchNode = {
    id: string;
    parentBranchId: string | null;
    forkedFromMessageId: string | null;
};

async function getBranchChain(branchId: string): Promise<BranchNode[]> {
    const chain: BranchNode[] = [];

    let current = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, parentBranchId: true, forkedFromMessageId: true },
    });

    while (current) {
        chain.unshift(current);
        current = current.parentBranchId
            ? await prisma.branch.findUnique({
                  where: { id: current.parentBranchId },
                  select: { id: true, parentBranchId: true, forkedFromMessageId: true },
              })
            : null;
    }

    return chain;
}

export async function loadBranchMessages(
    branchId: string
): Promise<UIMessage[]> {
    const chain = await getBranchChain(branchId);

    const messages: UIMessage[] = [];

    for (let i = 0; i < chain.length; i++) {
        const node = chain[i];
        const child = chain[i + 1];

        let cutoff: Date | undefined;
        if (child?.forkedFromMessageId) {
            const forkMessage = await prisma.message.findUnique({
                where: { id: child.forkedFromMessageId },
                select: { createdAt: true },
            });
            cutoff = forkMessage?.createdAt;
        }

        const rows = await prisma.message.findMany({
            where: {
                branchId: node.id,
                ...(cutoff ? { createdAt: { lte: cutoff } } : {}),
            },
            orderBy: { createdAt: "asc" },
        });

        for (const row of rows) {
            messages.push({
                id: row.id,
                role: row.role === "ASSISTANT" ? "assistant" : "user",
                parts: toUIMessageParts(row.parts, row.content),
            });
        }
    }

    return messages;
}

type SaveChatMessagesOptions = {
    updateTitle?: boolean;
};

export async function saveChatMessages(
    conversationId: string,
    branchId: string,
    messages: UIMessage[],
    options: SaveChatMessagesOptions = {}
) {
    const { updateTitle = true } = options;

    for (const message of messages) {
        if (message.role === "system") continue;

        const content = getMessageText(message);
        const role = message.role === "assistant" ? "ASSISTANT" : "USER";

        await prisma.message.upsert({
            where: { id: message.id },
            create: {
                id: message.id,
                conversationId,
                branchId,
                role,
                status: "COMPLETE",
                content,
                parts: message.parts as Prisma.InputJsonValue,
            },
            update: {
                content,
                parts: message.parts as Prisma.InputJsonValue,
                status: "COMPLETE",
            },
        });
    }

    const conversation = await prisma.conversation.findUniqueOrThrow({
        where: { id: conversationId },
        select: { title: true },
    });

    const firstUser = messages.find((message) => message.role === "user");
    const firstUserText = firstUser ? getMessageText(firstUser).trim() : "";

    await prisma.conversation.update({
        where: { id: conversationId },
        data: {
            lastMessageAt: new Date(),
            title:
                updateTitle && conversation.title === "New Chat" && firstUserText
                    ? firstUserText.slice(0, 48)
                    : conversation.title,
        },
    });
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { assertOwnsConversation } from "@/features/messages/actions/messages-action";

export async function getOrCreateMainBranch(conversationId: string) {
    let branch = await prisma.branch.findFirst({
        where: { conversationId, isMain: true },
    });

    if (!branch) {
        branch = await prisma.branch.create({
            data: { conversationId, name: "Main", isMain: true },
        });
    }

    await prisma.message.updateMany({
        where: { conversationId, branchId: null },
        data: { branchId: branch.id },
    });

    return branch;
}

export async function createBranch(
    conversationId: string,
    forkedFromMessageId: string
) {
    const user = await requireUser();

    const source = await assertOwnsConversation(conversationId, user.id);

    const forkMessage = await prisma.message.findUnique({
        where: { id: forkedFromMessageId },
    });

    if (!forkMessage || forkMessage.conversationId !== conversationId) {
        throw new Error("Message not found");
    }

    const history = await prisma.message.findMany({
        where: { conversationId, createdAt: { lte: forkMessage.createdAt } },
        orderBy: { createdAt: "asc" },
    });

    const branchConversation = await prisma.conversation.create({
        data: {
            userId: user.id,
            title: `Branch of ${source.title}`.slice(0, 48),
            model: source.model,
            systemPrompt: source.systemPrompt,
        },
    });

    const mainBranch = await prisma.branch.create({
        data: {
            conversationId: branchConversation.id,
            name: "Main",
            isMain: true,
            parentBranchId: forkMessage.branchId,
            forkedFromMessageId,
        },
    });

    for (const message of history) {
        await prisma.message.create({
            data: {
                conversationId: branchConversation.id,
                branchId: mainBranch.id,
                role: message.role,
                status: message.status,
                content: message.content,
                parts: (message.parts ?? undefined) as Prisma.InputJsonValue,
                metadata: (message.metadata ?? undefined) as Prisma.InputJsonValue,
            },
        });
    }

    revalidatePath("/");
    return branchConversation;
}

import { loadBranchMessages } from '@/features/ai/actions/chat-store';
import { getConversation } from '@/features/conversation/actions/conversation-actions';
import { getOrCreateMainBranch } from '@/features/branch/actions/branch-actions';
import { ConversationView } from '@/features/conversation/components/conversation-view';
import { notFound } from 'next/navigation';
import React from 'react'

type ConversationPageProps = {
    params: Promise<{ id: string }>;
};

const page = async({params}:ConversationPageProps) => {
    const {id} = await params;

    try {
        await getConversation(id)
    } catch (error) {
        notFound()
    }

    const mainBranch = await getOrCreateMainBranch(id);
    const initialMessages = await loadBranchMessages(mainBranch.id);

    return (
        <ConversationView
            key={id}
            conversationId={id}
            activeBranchId={mainBranch.id}
            initialMessages={initialMessages}
        />
    )
}

export default page

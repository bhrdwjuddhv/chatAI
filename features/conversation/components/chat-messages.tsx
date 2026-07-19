"use client";

import { isTextUIPart, type UIMessage } from "ai";
import type { ChatStatus } from "ai";
import { GitBranchIcon } from "lucide-react";

import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
    Message,
    MessageActions,
    MessageContent,
    MessageResponse,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";

/** Extracts plain text from a `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
    return message.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join("");
}

type ChatMessagesProps = {
    messages: UIMessage[];
    status: ChatStatus;
    onBranch?: (messageId: string) => void;
};

/**
 * Renders the conversation message list with markdown responses and a loading indicator.
 */
export function ChatMessages({ messages, status, onBranch }: ChatMessagesProps) {
    const isWaiting =
        status === "submitted" && messages.at(-1)?.role === "user";

    return (
        <Conversation>
            <ConversationContent className="py-8">
                {messages.map((message) => (
                    <Message key={message.id} from={message.role}>
                        <MessageContent>
                            <MessageResponse>{getMessageText(message)}</MessageResponse>
                        </MessageContent>
                        {onBranch ? (
                            <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => onBranch(message.id)}
                                    aria-label="Branch from here"
                                >
                                    <GitBranchIcon className="size-4" />
                                </Button>
                            </MessageActions>
                        ) : null}
                    </Message>
                ))}

                {isWaiting ? (
                    <Message from="assistant">
                        <MessageContent>
                            <Loader />
                        </MessageContent>
                    </Message>
                ) : null}
            </ConversationContent>

        </Conversation>
    );
}
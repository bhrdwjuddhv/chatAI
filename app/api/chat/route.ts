import {auth} from "@clerk/nextjs/server";
import {convertToModelMessages, createIdGenerator, createUIMessageStreamResponse, stepCountIs, streamText, toUIMessageStream, type UIMessage} from "ai";
import {requireUser} from "@/features/auth/action/require-user";
import {prisma} from "@/lib/db";
import {loadBranchMessages, saveChatMessages} from "@/features/ai/actions/chat-store";
import {getChatModel} from "@/features/ai/utils/model";
import {aiTools} from "@/features/ai";

const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(req:Request){
    await auth.protect();

    const {message,id,branchId}: {message: UIMessage, id: string, branchId: string} = await req.json();

    if(!message || !id || !branchId){
        return new Response("missing message, id or branchId", {status: 400});
    }

    const user = await requireUser();

    const conversation = await prisma.conversation.findFirst({
        where: {
            id,
            userId: user.id
        }
    });

    if(!conversation){
        return new Response("conversation not found", {status: 404});
    }

    const branch = await prisma.branch.findFirst({
        where: { id: branchId, conversationId: id },
    });

    if(!branch){
        return new Response("branch not found", {status: 404});
    }

    const previousMessages = await loadBranchMessages(branchId)

    const alreadySaved = previousMessages.some(
        (storedMessage) => storedMessage.id === message.id
    )

    if(!alreadySaved){
        const recentCount = await prisma.message.count({
            where: {
                role: "USER",
                createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) },
                conversation: { userId: user.id },
            },
        });

        if(recentCount >= RATE_LIMIT){
            return new Response(
                "Rate limit reached: 3 messages per 24 hours.",
                { status: 429 }
            );
        }
    }

    const messages = alreadySaved ? previousMessages : [...previousMessages, message];

    if(!alreadySaved){
        await saveChatMessages(id, branchId, [message]);
    }

    const result = streamText({
        model: getChatModel(conversation.model),
        stopWhen: stepCountIs(5),
        system: conversation.systemPrompt ?? `You are Ai assistant also You have access to a web search tool.

            Use it whenever:
            - the user asks for recent information
            - latest news
            - current events
            - documentation
            - software versions
            - prices
            - weather
            - sports
            - company announcements

            Do not guess recent information.`,
        messages: await convertToModelMessages(messages),
        tools: aiTools
    });

    await result.consumeStream();

    return createUIMessageStreamResponse({
        stream:toUIMessageStream({
            stream: result.stream,
            originalMessages: messages,
            generateMessageId: createIdGenerator({
                prefix: "msg",
                size:16
            }),
            onEnd:async({messages:finalMessages}) =>{
                try{
                    await saveChatMessages(id, branchId, finalMessages, {updateTitle:false});
                }catch(err){
                    console.error(err)
                }
    }
        })
    })

}

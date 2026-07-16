import {auth} from "@clerk/nextjs/server";
import {convertToModelMessages, createIdGenerator, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage} from "ai";
import {requireUser} from "@/features/auth/action/require-user";
import {prisma} from "@/lib/db";
import {loadChatMessages, saveChatMessages} from "@/features/ai/actions/chat-store";
import {getChatModel} from "@/features/ai/utils/model";

export async function POST(req:Request){
    await auth.protect();

    const {message,id}: {message: UIMessage, id: string} = await req.json();

    if(!message || !id ){
        return new Response("missing message or id", {status: 404});
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
    };


    const previousMessages = await loadChatMessages(id)

    const alreadySaved = previousMessages.some(
        (storedMessage) => storedMessage.id === message.id
    )

    const messages = alreadySaved ? previousMessages : [...previousMessages, message];

    if(!alreadySaved){
        await saveChatMessages(id, [message]);
    }

    const result = await streamText({
        model: getChatModel(conversation.model),
        system: conversation.systemPrompt ?? "You are Ai assistant",
        messages: await convertToModelMessages(messages),
    });

    result.consumeStream();

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
                    await saveChatMessages(id, finalMessages, {updateTitle:"false"});
                }catch(err){
                    console.error(err)
                }
    }
        })
    })

}
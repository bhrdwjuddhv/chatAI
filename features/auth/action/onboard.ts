"use server";

import {currentUser} from "@clerk/nextjs/server";
import {prisma} from "@/lib/db";
import type {User} from "@/lib/generated/prisma/client";
import {create} from "node:domain";


export async function onBoard() {
    console.log("onBoard called");

    const clerkUser = await currentUser();

    console.log("Clerk user:", clerkUser?.id);

    if (!clerkUser) {
        console.log("No Clerk user");
        return null;
    }

    const user = await prisma.user.upsert({
        where: { clerkId: clerkUser.id },
        create: {
            clerkId: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress ?? null,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            imageUrl: clerkUser.imageUrl,
        },
        update: {
            email: clerkUser.emailAddresses[0]?.emailAddress ?? null,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            imageUrl: clerkUser.imageUrl,
        },
    });

    console.log("Upserted user:", user);

    return user;
}
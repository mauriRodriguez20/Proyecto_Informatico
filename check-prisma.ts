import { prisma } from "./src/lib/prisma";

async function main() {
    console.log("Keys in prisma:", Object.keys(prisma));
    // @ts-ignore
    console.log("prisma.publication defined?", !!prisma.publication);
    try {
        // @ts-ignore
        const count = await prisma.publication.count();
        console.log("Publication count:", count);
    } catch (e) {
        console.error("Error accessing prisma.publication:", e);
    }
    process.exit(0);
}

main();

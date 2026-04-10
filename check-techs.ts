import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const techs = await prisma.$queryRaw`SELECT * FROM "users"."technologies" LIMIT 10`
    console.log(JSON.stringify(techs, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

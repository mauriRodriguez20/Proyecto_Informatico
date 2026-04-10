import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const techs = await prisma.$queryRaw`SELECT * FROM "users"."technologies"`
        console.log('REAL_TECHS_START')
        console.log(JSON.stringify(techs, null, 2))
        console.log('REAL_TECHS_END')
    } catch (e) {
        console.error('Error querying users.technologies:', e)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

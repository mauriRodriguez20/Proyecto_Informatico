import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const techs = [
        { name: 'React' },
        { name: 'Next.js' },
        { name: 'TypeScript' },
        { name: 'JavaScript' },
        { name: 'Node.js' },
        { name: 'Python' },
        { name: 'Java' },
        { name: 'PostgreSQL' },
        { name: 'Prisma' },
        { name: 'Supabase' }
    ]

    console.log('Seeding technologies...')

    for (const tech of techs) {
        await prisma.$executeRaw`
      INSERT INTO "users"."technologies" ("id", "name", "created_at", "updated_at")
      VALUES (gen_random_uuid(), ${tech.name}, NOW(), NOW())
      ON CONFLICT ("name") DO NOTHING
    `
    }

    const count = await prisma.$queryRaw`SELECT count(*) FROM "users"."technologies"`
    console.log('Total technologies:', count)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

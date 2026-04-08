import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const technologies = [
  // Frontend
  { name: "React", slug: "react" },
  { name: "Next.js", slug: "nextjs" },
  { name: "Vue", slug: "vue" },
  { name: "Angular", slug: "angular" },
  { name: "Svelte", slug: "svelte" },
  { name: "TypeScript", slug: "typescript" },
  { name: "JavaScript", slug: "javascript" },
  { name: "CSS", slug: "css" },
  { name: "Tailwind CSS", slug: "tailwind" },
  // Backend
  { name: "Node.js", slug: "nodejs" },
  { name: "Express", slug: "express" },
  { name: "NestJS", slug: "nestjs" },
  { name: "Python", slug: "python" },
  { name: "FastAPI", slug: "fastapi" },
  { name: "Django", slug: "django" },
  { name: "Java", slug: "java" },
  { name: "Spring Boot", slug: "spring-boot" },
  { name: "Go", slug: "go" },
  { name: "Rust", slug: "rust" },
  // Bases de datos
  { name: "PostgreSQL", slug: "postgresql" },
  { name: "MySQL", slug: "mysql" },
  { name: "MongoDB", slug: "mongodb" },
  { name: "Redis", slug: "redis" },
  // DevOps / Herramientas
  { name: "Docker", slug: "docker" },
  { name: "Git", slug: "git" },
];

async function main() {
  console.log("🌱 Seeding technologies...");

  for (const tech of technologies) {
    await prisma.technology.upsert({
      where: { slug: tech.slug },
      update: {},
      create: tech,
    });
  }

  console.log(`✅ ${technologies.length} tecnologías cargadas exitosamente.`);
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

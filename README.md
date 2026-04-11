# Microservicio 04 (Interactions & Reputation)

MS-04 implementa la EPI-004: Interacciones y Sistema de Reputacion.

## Alcance actual

Implementado ahora:
- HU-019: Comentarios en publicaciones y preguntas.
- HU-020: Sistema de puntuacion (1-5 estrellas) para publicaciones y respuestas.

Incluido en el schema (epica completa):
- HU-021: Calificacion promedio automatica del usuario.
- HU-022: Estadisticas basicas del usuario.

## Arquitectura

Se mantiene el mismo patron de MS-01/MS-02/MS-03:
- Next.js App Router para API (`src/app/api/**`).
- Modulo de dominio en `src/modules/interactions/**`.
- Prisma multi-schema con schema dedicado `interactions`.
- JWT compartido de Supabase entre microservicios.
- `withAuth` para operaciones de escritura.

## Estructura

```text
prisma/
  schema.prisma
  rls_policies.sql

src/
  app/api/publications/[id]/comments/route.ts
  app/api/publications/[id]/comments/[commentId]/route.ts
  app/api/questions/[id]/comments/route.ts
  app/api/questions/[id]/comments/[commentId]/route.ts
  app/api/publications/[id]/rate/route.ts
  app/api/publications/[id]/ratings/route.ts
  app/api/answers/[id]/rate/route.ts
  app/api/answers/[id]/ratings/route.ts

  modules/interactions/
    interactions.schema.ts
    interactions.service.ts
    interactions.types.ts
```

## Modelo de Datos (Schema `interactions`)

- `Comment` (HU-019)
  - Comentarios de usuario sobre `PUBLICATION` o `QUESTION`.
  - Limite de 500 caracteres.

- `Rating` (HU-020)
  - Votos 1-5 sobre `PUBLICATION` o `ANSWER`.
  - Unico voto por usuario y contenido (`@@unique([raterId, targetType, targetId])`).

- `UserReputation` (HU-021)
  - Snapshot de promedio y total de votos recibidos por usuario.

- `UserStats` (HU-022)
  - Snapshot de estadisticas agregadas del usuario + reputacion.

## Variables de entorno

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `MS01_URL` (opcional, para enriquecer autor en comentarios)

## Instalacion y ejecucion

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
# Se ejecutará en el puerto 3004 para no causar conflicto con los otros microservicios
```

Validacion tecnica:

```bash
npx prisma validate
npx tsc --noEmit
```

## API REST (HU-019 / HU-020)

### Comentarios en publicaciones
- `GET /api/publications/:id/comments?page=1&limit=10`
- `POST /api/publications/:id/comments` (auth)
- `DELETE /api/publications/:id/comments/:commentId` (auth, autor o admin)

### Comentarios en preguntas
- `GET /api/questions/:id/comments?page=1&limit=10`
- `POST /api/questions/:id/comments` (auth)
- `DELETE /api/questions/:id/comments/:commentId` (auth, autor o admin)

### Puntuacion en publicaciones
- `GET /api/publications/:id/ratings`
- `POST /api/publications/:id/ratings` (auth)
- `POST /api/publications/:id/rate` (auth, alias legado compatible con frontend actual)

Body:
```json
{
  "score": 5
}
```

### Puntuacion en respuestas
- `GET /api/answers/:id/ratings`
- `POST /api/answers/:id/ratings` (auth)
- `POST /api/answers/:id/rate` (auth, alias legado)

Body:
```json
{
  "score": 4
}
```

# Developer's Portal - Microservicio 03 (Questions & Answers)

MS-03 implementa la Epica 3 (EPI-003): Sistema de Preguntas y Respuestas.

## Cobertura de Historias de Usuario

- HU-015: Crear pregunta con titulo, descripcion, bloque de codigo opcional y etiquetas.
- HU-016: Publicar y editar respuestas en preguntas existentes.
- HU-017: Marcar una respuesta como aceptada (solo autor de la pregunta, una sola aceptada).
- HU-018: Listado de preguntas sin responder (`unanswered=true`) con orden de recientes primero.

## Arquitectura

Se mantiene el mismo patron de MS-01 y MS-02:
- Next.js App Router para API (`src/app/api/**`).
- Modulo de dominio en `src/modules/questions/**`.
- Prisma multi-schema con esquema dedicado `questions`.
- JWT compartido de Supabase entre microservicios.
- `withAuth` para proteger operaciones de escritura.

## Estructura

```text
prisma/
  schema.prisma
  rls_policies.sql

src/
  app/api/questions/
    route.ts
    [id]/route.ts
    [id]/answers/route.ts
    [id]/answers/[answerId]/route.ts
    [id]/answers/[answerId]/accept/route.ts
    [id]/answers/[answerId]/vote/route.ts

  modules/questions/
    questions.schema.ts
    questions.service.ts
    questions.types.ts
```

## Modelo de Datos (Schema `questions`)

- `Question`
  - `authorId`, `area`, `title`, `description`, `codeBlock`, `language`, timestamps.
- `QuestionTag`
  - `questionId`, `technologyId`.
- `Answer`
  - `questionId`, `authorId`, `content`, `codeBlock`, `language`, `isAccepted`, `voteScore`, timestamps.
- `AnswerVote`
  - `answerId`, `voterId`, `value` (+1 o -1), timestamps.
  - Restriccion: un voto por usuario por respuesta (`@@unique([answerId, voterId])`).

## Reglas de Negocio Implementadas

- Titulo de pregunta: 15 a 150 caracteres.
- Descripcion de pregunta: obligatoria.
- Etiquetas requeridas al crear pregunta (1 a 5, sin duplicados).
- Validacion de `technologyIds` contra catalogo `users.technologies`.
- Listados paginados de 10 en 10.
- Filtro `unanswered=true` para devolver solo preguntas con 0 respuestas.
- Solo autor de respuesta puede editar su respuesta.
- Solo autor de pregunta puede aceptar respuesta.
- Al aceptar una nueva respuesta, la anterior aceptada se desmarca.
- Votos solo en respuestas (+1 / -1) y calculo de `voteScore` neto.
- No se permite votar la propia respuesta.

## Seguridad

- Validacion de payload y query con Zod.
- Sanitizacion de texto (`trim`, remocion de null bytes).
- Uso de Prisma (consultas parametrizadas) para mitigar inyecciones SQL.
- Autenticacion JWT en endpoints de escritura usando `Authorization: Bearer <token>`.

## Variables de Entorno

Usar el mismo `.env` base de MS-01/MS-02:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `MS01_URL` (cross-fetch de autor en detalle)
- `MS04_URL` (disparo de notificacion de respuesta aceptada en MS04)

## Instalacion y Ejecucion

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Validacion tecnica usada en este MS:

```bash
npx prisma validate
npx tsc --noEmit
```

## API REST

Base local sugerida: `http://localhost:3000`

### 1) Crear pregunta
- Metodo: `POST`
- Ruta: `/api/questions`
- Protegido: Si

Body:
```json
{
  "area": "BACKEND",
  "title": "Error al conectar Prisma con Supabase en produccion",
  "description": "Tengo un timeout intermitente al ejecutar consultas en Vercel.",
  "codeBlock": "const prisma = new PrismaClient();",
  "language": "typescript",
  "technologyIds": ["11111111-1111-1111-1111-111111111111"]
}
```

### 2) Listar preguntas
- Metodo: `GET`
- Ruta: `/api/questions?page=1&unanswered=false`
- Protegido: No

Notas:
- `page` inicia en 1.
- `limit` queda forzado a 10.
- `unanswered=true` activa HU-018.

### 3) Ver detalle de pregunta
- Metodo: `GET`
- Ruta: `/api/questions/:id`
- Protegido: No

Retorna la pregunta con todas sus respuestas, votos y autor(es) si `MS01_URL` esta disponible.

### 4) Responder pregunta
- Metodo: `POST`
- Ruta: `/api/questions/:id/answers`
- Protegido: Si

Body:
```json
{
  "content": "Puedes resolverlo usando pool de conexiones y reuso de cliente.",
  "codeBlock": "export const prisma = globalForPrisma.prisma ?? new PrismaClient();",
  "language": "typescript"
}
```

### 5) Editar respuesta
- Metodo: `PATCH`
- Ruta: `/api/questions/:id/answers/:answerId`
- Protegido: Si

Body parcial permitido:
```json
{
  "content": "Actualizo la respuesta con una solucion estable.",
  "codeBlock": "// codigo actualizado",
  "language": "typescript"
}
```

### 6) Marcar respuesta como aceptada
- Metodo: `PATCH`
- Ruta: `/api/questions/:id/answers/:answerId/accept`
- Protegido: Si (solo autor de la pregunta)

Comportamiento adicional:
- Tras aceptar, MS03 intenta notificar a MS04 en:
  - `POST /api/questions/:id/answers/:answerId/accepted-notification`
- Si MS04 no esta disponible, la respuesta igualmente queda aceptada y se registra advertencia en logs.

### 7) Votar respuesta (complemento Epica 3)
- Metodo: `POST`
- Ruta: `/api/questions/:id/answers/:answerId/vote`
- Protegido: Si

Body:
```json
{
  "value": 1
}
```

## Coleccion Postman

Archivo incluido en el repo:

- `MS03_Questions.postman_collection.json`

Incluye todos los endpoints requeridos y el endpoint adicional de voto.

## Rendimiento y RNF

- Lecturas optimizadas con indices en `questionId`, `authorId`, `createdAt`, `voteScore`.
- Operaciones criticas (aceptar respuesta, votar) usan transacciones para consistencia.
- Estandares de mantenibilidad: TypeScript + Zod + Prisma + estructura modular.

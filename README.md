# Developer's Portal — MS-01 (Users)

Microservicio de gestión de usuarios del Developer's Portal. Maneja registro, autenticación, perfiles, catálogo de tecnologías y sistema de calificaciones entre usuarios.

---

## Stack

- **Framework:** Next.js 16 (App Router, solo API Routes)
- **Base de datos:** PostgreSQL via Supabase
- **ORM:** Prisma 5 con feature `multiSchema`
- **Autenticación:** Supabase Auth (JWT)
- **Validación:** Zod
- **Lenguaje:** TypeScript

---

## Arquitectura multi-schema

El proyecto completo (MS-01, MS-02, etc.) comparte un único proyecto de Supabase para mantenerse dentro del Free Tier. La separación entre microservicios se logra mediante schemas de PostgreSQL.

- Este microservicio gestiona únicamente el schema `users`.
- Los modelos definidos aquí no deben repetirse en otros microservicios.
- El JWT emitido en `/api/users/login` es válido en todos los microservicios. Cualquier middleware puede validarlo directamente contra Supabase sin consultar esta API.
- Para obtener datos de un usuario desde otro microservicio (por ejemplo, el autor de una publicación), se hace un cross-fetch HTTP a `GET /api/users/:id`. No se usan relaciones cruzadas entre schemas en Prisma.

---

## Modelos de base de datos

| Modelo | Tabla | Descripción |
|---|---|---|
| `User` | `users` | Perfil del desarrollador registrado |
| `Technology` | `technologies` | Catálogo de tecnologías disponibles |
| `UserTechnology` | `user_technologies` | Relación muchos-a-muchos entre usuarios y tecnologías |
| `UserRating` | `user_ratings` | Calificaciones de 1 a 5 entre usuarios (única por par) |
| `LoginAttempt` | `login_attempts` | Control de intentos fallidos; bloqueo temporal tras 5 errores |

Roles disponibles: `FRONTEND`, `BACKEND`.

---

## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/users/register` | Público | Registro de nuevo usuario |
| `POST` | `/api/users/login` | Público | Inicio de sesión |
| `POST` | `/api/users/logout` | Autenticado | Cierre de sesión |
| `GET` | `/api/users/:id` | Público | Obtener perfil de usuario |
| `PATCH` | `/api/users/:id` | Autenticado | Actualizar perfil propio |
| `POST` | `/api/users/:id/rate` | Autenticado | Calificar a otro usuario |
| `GET` | `/api/technologies` | Público | Listar todas las tecnologías |
| `GET` | `/api/technologies/:id` | Público | Obtener tecnología por ID |

---

## Configuración del entorno

Crear un archivo `.env` en la raíz con las siguientes variables:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Ambas URLs (`DATABASE_URL` y `DIRECT_URL`) deben ser las mismas que usen los demás microservicios del portal para compartir la base de datos.

---

## Comandos

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Sincronizar schema con Supabase
npm run db:push

# Regenerar cliente de Prisma
npm run db:generate

# Abrir Prisma Studio
npm run db:studio

# Poblar el catálogo de tecnologías
npm run db:seed
```

---

## Guía para MS-02

Al desarrollar el siguiente microservicio (`backend-publications`):

1. Usar las mismas variables `DATABASE_URL` y `DIRECT_URL`.
2. Configurar `schema.prisma` con `schemas = ["publications"]` y agregar `@@schema("publications")` a todos los modelos.
3. No redefinir modelos de MS-01. Acceder a datos de usuarios via HTTP.
4. Copiar `src/middleware.ts` y `src/lib/api-helpers.ts` de este repositorio como base; ya manejan validación de JWT y respuestas estandarizadas.

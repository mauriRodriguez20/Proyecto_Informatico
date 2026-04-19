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
| `POST` | `/api/users/oauth/session` | Autenticado (Bearer Supabase) | Sincronizar/crear usuario OAuth y devolver sesi�n |
| `POST` | `/api/users/logout` | Autenticado | Cierre de sesión |
| `GET` | `/api/users/:id` | Público | Obtener perfil de usuario |
| `PATCH` | `/api/users/:id` | Autenticado | Actualizar perfil propio |
| `POST` | `/api/users/:id/rate` | Autenticado | Calificar a otro usuario |
| `GET` | `/api/technologies` | Público | Listar todas las tecnologías |
| `GET` | `/api/technologies/:id` | Público | Obtener tecnología por ID |

---

## Configuración Inicial

### 1. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto con los siguientes valores:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

> [!IMPORTANT]
> El backend está configurado para correr en el puerto **3001** para evitar conflictos con el frontend (puerto 3000). El `NEXT_PUBLIC_API_URL` debe apuntar al puerto 3001.

### 2. Inicialización de Base de Datos
Sigue estos pasos para sincronizar tu base de datos local con Supabase:

```bash
# Instalar dependencias
npm install

# Generar el cliente de Prisma
npm run db:generate

# Sincronizar el esquema con Supabase
npm run db:push

# Poblar el catálogo de tecnologías
npm run db:seed
```

### 3. Ejecución
Para iniciar el servidor de desarrollo en el puerto correcto:

```bash
npm run dev -- --port 3001
```

## Correcciones Realizadas

- **CORS**: Se implementó una configuración dinámica en `middleware.ts` que permite los orígenes `http://localhost:3000` y `http://127.0.0.1:3000`, habilitando credenciales y los métodos necesarios (`GET, POST, PUT, PATCH, DELETE, OPTIONS`). Se removió la configuración estática de `next.config.mjs` para evitar conflictos.
- **Imports**: Se corrigieron rutas de importación en los endpoints de `login`, `register` y `logout` que apuntaban a carpetas inexistentes.

## Scripts Disponibles

- `npm run dev`: Inicia el servidor.
- `npm run db:push`: Aplica cambios del schema a la base de datos.
- `npm run db:generate`: Regenera el cliente de Prisma.
- `npm run db:studio`: Abre una interfaz visual para explorar la base de datos.
- `npm run db:seed`: Puebla la base de datos con datos iniciales (tecnologías).

---

## Guía para MS-02

Al desarrollar el siguiente microservicio (`backend-publications`):

1. Usar las mismas variables `DATABASE_URL` y `DIRECT_URL`.
2. Configurar `schema.prisma` con `schemas = ["publications"]` y agregar `@@schema("publications")` a todos los modelos.
3. No redefinir modelos de MS-01. Acceder a datos de usuarios via HTTP.
4. Copiar `src/middleware.ts` y `src/lib/api-helpers.ts` de este repositorio como base; ya manejan validación de JWT y respuestas estandarizadas.

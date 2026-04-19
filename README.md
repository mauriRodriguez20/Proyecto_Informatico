# Developer's Portal - MS-01 (Users)

Microservicio de gestion de usuarios del Developer's Portal. Maneja registro, autenticacion, perfiles, catalogo de tecnologias y sistema de calificaciones entre usuarios.

---

## Stack

- **Framework:** Next.js 16 (App Router, solo API Routes)
- **Base de datos:** PostgreSQL via Supabase
- **ORM:** Prisma 5 con feature `multiSchema`
- **Autenticacion:** Supabase Auth (JWT)
- **Validacion:** Zod
- **Lenguaje:** TypeScript

---

## Arquitectura Multi-Schema

El proyecto completo (MS-01, MS-02, etc.) comparte un unico proyecto de Supabase para mantenerse dentro del Free Tier. La separacion entre microservicios se logra mediante schemas de PostgreSQL.

- Este microservicio gestiona unicamente el schema `users`.
- Los modelos definidos aqui no deben repetirse en otros microservicios.
- El JWT emitido en `/api/users/login` es valido en todos los microservicios. Cualquier middleware puede validarlo directamente contra Supabase sin consultar esta API.
- Para obtener datos de un usuario desde otro microservicio (por ejemplo, el autor de una publicacion), se hace un cross-fetch HTTP a `GET /api/users/:id`.
- No se usan relaciones cruzadas entre schemas en Prisma.

---

## Modelos de Base de Datos

| Modelo | Tabla | Descripcion |
|---|---|---|
| `User` | `users` | Perfil del desarrollador registrado |
| `Technology` | `technologies` | Catalogo de tecnologias disponibles |
| `UserTechnology` | `user_technologies` | Relacion muchos-a-muchos entre usuarios y tecnologias |
| `UserRating` | `user_ratings` | Calificaciones de 1 a 5 entre usuarios (unica por par) |
| `LoginAttempt` | `login_attempts` | Control de intentos fallidos; bloqueo temporal tras 5 errores |

Roles disponibles: `FRONTEND`, `BACKEND`.

---

## Endpoints

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| `POST` | `/api/users/register` | Publico | Registro de nuevo usuario |
| `POST` | `/api/users/login` | Publico | Inicio de sesion |
| `POST` | `/api/users/oauth/session` | Autenticado (Bearer Supabase) | Sincroniza o crea usuario OAuth y devuelve sesion |
| `POST` | `/api/users/logout` | Autenticado | Cierre de sesion |
| `GET` | `/api/users/:id` | Publico | Obtener perfil de usuario |
| `PATCH` | `/api/users/:id` | Autenticado | Actualizar perfil propio |
| `POST` | `/api/users/:id/rate` | Autenticado | Calificar a otro usuario |
| `GET` | `/api/technologies` | Publico | Listar todas las tecnologias |
| `GET` | `/api/technologies/:id` | Publico | Obtener tecnologia por ID |

---

## Configuracion Inicial

### 1. Variables de Entorno
Crea un archivo `.env` en la raiz del proyecto con los siguientes valores:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

> [!IMPORTANT]
> El backend esta configurado para correr en el puerto **3001** para evitar conflictos con el frontend (puerto 3000). `NEXT_PUBLIC_API_URL` debe apuntar al puerto 3001.

### 2. Inicializacion de Base de Datos
Sigue estos pasos para sincronizar tu base de datos local con Supabase:

```bash
# Instalar dependencias
npm install

# Generar el cliente de Prisma
npm run db:generate

# Sincronizar el esquema con Supabase
npm run db:push

# Poblar el catalogo de tecnologias
npm run db:seed
```

### 3. Ejecucion
Para iniciar el servidor de desarrollo en el puerto correcto:

```bash
npm run dev -- --port 3001
```

---

## Correcciones Realizadas

- **CORS:** Se implemento una configuracion dinamica en `middleware.ts` que permite los origenes `http://localhost:3000` y `http://127.0.0.1:3000`, habilitando credenciales y metodos `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- **Imports:** Se corrigieron rutas de importacion en endpoints de `login`, `register` y `logout`.
- **OAuth social login:** Se agrego `POST /api/users/oauth/session` para sincronizar usuarios autenticados con Google/GitHub via Supabase.

---

## Scripts Disponibles

- `npm run dev`: Inicia el servidor.
- `npm run db:push`: Aplica cambios del schema a la base de datos.
- `npm run db:generate`: Regenera el cliente de Prisma.
- `npm run db:studio`: Abre una interfaz visual para explorar la base de datos.
- `npm run db:seed`: Puebla la base de datos con tecnologias iniciales.

---

## Guia para MS-02

Al desarrollar el siguiente microservicio (`backend-publications`):

1. Usar las mismas variables `DATABASE_URL` y `DIRECT_URL`.
2. Configurar `schema.prisma` con `schemas = ["publications"]` y agregar `@@schema("publications")` a todos los modelos.
3. No redefinir modelos de MS-01. Acceder a datos de usuarios via HTTP.
4. Copiar `src/middleware.ts` y `src/lib/api-helpers.ts` de este repositorio como base; ya manejan validacion de JWT y respuestas estandarizadas.

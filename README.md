# Plataforma de Gestión para Desarrolladores

Stack: **Next.js 14 · TypeScript · Prisma · Supabase (PostgreSQL)**  
Universidad Autónoma de Occidente — Departamento de Ingeniería

---

## Requisitos previos

- Node.js 18+
- Cuenta gratuita en [supabase.com](https://supabase.com)
- Git

---

## Instalación paso a paso

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd devplatform
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Abre `.env.local` y completa los valores con los datos de tu proyecto en Supabase:
- `NEXT_PUBLIC_SUPABASE_URL` → Settings > API > Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Settings > API > anon public key
- `DATABASE_URL` → Settings > Database > Transaction connection string
- `DIRECT_URL` → Settings > Database > Session connection string

### 3. Configurar Supabase Auth

En el dashboard de Supabase:
1. Ve a **Authentication > Providers**
2. Activa **Email** como proveedor
3. En **Authentication > Settings**, configura:
   - Max login attempts: `5` (HU-002 CA-3)
   - JWT expiry: `86400` (24 horas = HU-002 CA-4)

### 4. Inicializar la base de datos

```bash
# Genera el cliente de Prisma
npm run db:generate

# Aplica el schema a Supabase
npm run db:push
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

La API estará disponible en `http://localhost:3000`

---

## Endpoints disponibles (HU-001, 002, 003)

### POST `/api/users/register` — HU-001

**Body:**
```json
{
  "email": "dev@ejemplo.com",
  "password": "minimo8chars",
  "username": "mi_usuario",
  "role": "FRONTEND"
}
```

**Respuestas:**
| Status | Descripción |
|--------|-------------|
| 201 | Usuario creado exitosamente |
| 400 | Datos inválidos (validación Zod) |
| 409 | Email o username ya en uso |
| 500 | Error interno |

---

### POST `/api/users/login` — HU-002

**Body:**
```json
{
  "email": "dev@ejemplo.com",
  "password": "minimo8chars"
}
```

**Respuestas:**
| Status | Descripción |
|--------|-------------|
| 200 | Login exitoso, retorna user + accessToken JWT |
| 400 | Datos inválidos |
| 401 | Credenciales incorrectas |
| 500 | Error interno |

---

### POST `/api/users/logout` — HU-003

No requiere body. Requiere cookie de sesión activa.

**Respuestas:**
| Status | Descripción |
|--------|-------------|
| 200 | Sesión cerrada, token invalidado |
| 401 | No autorizado (ya estaba sin sesión) |
| 500 | Error interno |

---

## Estructura del proyecto

```
src/
├── app/
│   └── api/
│       └── users/
│           ├── register/route.ts   ← POST /api/users/register
│           ├── login/route.ts      ← POST /api/users/login
│           └── logout/route.ts     ← POST /api/users/logout
├── modules/
│   └── users/
│       ├── users.schema.ts         ← Validaciones Zod
│       ├── users.service.ts        ← Lógica de negocio
│       └── users.types.ts          ← Tipos TypeScript
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← Cliente browser
│   │   └── server.ts               ← Cliente servidor (SSR)
│   └── prisma.ts                   ← Singleton Prisma
└── middleware.ts                   ← Protección JWT de rutas
```

---

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run lint         # ESLint
npm run db:push      # Aplicar schema a Supabase
npm run db:generate  # Regenerar cliente Prisma
npm run db:studio    # Abrir Prisma Studio (explorador visual de DB)
```

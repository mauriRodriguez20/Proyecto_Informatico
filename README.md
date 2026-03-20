# 🚀 Developer's Portal — Microservicio 01 (Users)

Este es el primer microservicio del proyecto, encargado exclusivamente de la gestión de usuarios, perfiles, catálogo de tecnologías y el sistema de calificaciones de usuario a usuario.

---

## 🏗️ Arquitectura Multi-Schema (Supabase Free Tier)

De acuerdo a la **Auditoría Técnica del 17/03/2026**, para escalar el proyecto dentro del *"Free Tier"* de Supabase manteniendo el límite de 2 proyectos activos, se implementó una **arquitectura basada en Schemas de PostgreSQL**.

*   🌟 **Un solo Proyecto en Supabase:** Todos los microservicios comparten la misma Base de Datos y la misma instancia de Autenticación.
*   🔒 **Schemas Independientes:** Este repositorio (`MS-01`) gestiona únicamente el schema `users`. El schema de prisma se ha configurado utilizando el feature `multiSchema` de Prisma.
*   🔑 **Autenticación Compartida:** El JWT que Supabase entrega en `/api/users/login` es válido universalmente. El middleware de cualquier microservicio (como MS-02 o MS-03) podrá validar quién es el usuario directamente contra Supabase, sin necesidad de consultar nuevamente a la API de usuarios.

---

## 📂 Convenciones de Implementación (Guía para MS-02)

Para mantener la consistencia al desarrollar el próximo microservicio (`backend-publications`), se debe seguir fielmente la estructura dejada en este repositorio:

1.  **`.env` Centralizado:** Se deben usar exactamente el mismo `DATABASE_URL` y `DIRECT_URL`.
2.  **Schema Aislado:** El `schema.prisma` debe estar configurado con `schemas = ["publications"]` y todos los modelos deben incluir el tag `@@schema("publications")`. **No se deben repetir** modelos de MS-01 en MS-02.
3.  **Cross-fetching:** Para obtener los datos del autor de una publicación, MS-02 debe hacer una llamada HTTP REST (Cross-fetch) al endpoint `GET /api/users/:id` de este repositorio. Las relaciones a nivel de base de datos no pueden cruzar schemas en Prisma todavía de manera limpia, por lo que la separación la manejamos vía API.
4.  **Helper `api-helpers.ts` y Middleware:** Copiar `src/middleware.ts` y `src/lib/api-helpers.ts` de este microservicio al siguiente. Están testeados y listos para validar los JWTs.

---

## 🛠️ Endpoints de este Microservicio (MS-01)

| Funcionalidad | Método | Ruta protegida |
| :--- | :--- | :--- |
| **Registro** | `POST` | `/api/users/register` (Público) |
| **Login** | `POST` | `/api/users/login` (Público) |
| **Logout** | `POST` | `/api/users/logout` |
| **Ver Perfil** | `GET` | `/api/users/:id` (Público) |
| **Editar Perfil** | `PATCH` | `/api/users/:id` |
| **Calificar Dev** | `POST` | `/api/users/:id/rate` |
| **Seed de Techs**| N/A | Correr con `npm run db:seed` |

---

## 📝 Comandos Útiles

```bash
# Sincronizar schema a supabase (cuidado: puede purgar datos si cambias nombres)
npx prisma db push

# Regenerar cliente local de Prisma
npx prisma generate

# Poblar el catálogo de tecnologías en la DB
npm run db:seed
```

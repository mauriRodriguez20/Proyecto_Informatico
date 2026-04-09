# Developer's Portal — Microservicio 02 (Publications)

Este microservicio se encarga de la gestión de **Publicaciones Técnicas**, permitiendo a los desarrolladores compartir soluciones a errores (`ERROR_SOLUTION`) y fragmentos de código reutilizables (`CODE_SNIPPET`).

---

## Arquitectura y Seguridad
Este microservicio sigue las convenciones del **Developer's Portal**:
- **Multi-Schema**: Gestiona exclusivamente el esquema `publications` en la base de datos compartida de Supabase.
- **Seguridad RLS**: Tiene habilitado **Row Level Security**. Solo el autor de una publicación puede editarla o eliminarla.
- **Validación Zod**: Implementa validación condicional estricta según el tipo de publicación.
- **Cross-fetching**: Para obtener datos del autor, este backend consume internamente el endpoint `GET /api/users/:id` del MS-01.

---

## 🛠️ Guía para el Frontend (Endpoints)

| Funcionalidad | Método | Ruta | Protegido | Notas |
| :--- | :--- | :--- | :--- | :--- |
| **Listar / Filtrar** | `GET` | `/api/publications` | No | Retorna campo `content` (alias de `description`). |
| **Ver Detalle** | `GET` | `/api/publications/:id` | No | Retorna campo `content`. Incluye autor. |
| **Crear** | `POST` | `/api/publications` | **Sí** | Acepta `content` y `technologyId`. |
| **Editar** | `PATCH` | `/api/publications/:id` | **Sí** | Acepta `content` y `technologyId`. |
| **Eliminar** | `DELETE`| `/api/publications/:id` | **Sí** | Limpieza automática de etiquetas. |

### Sincronización de Campos
Para facilitar la integración, el backend ahora mapea automáticamente los campos del frontend:
- **`content`** (Frontend) ↔ **`description`** (Database).
- **`technologyId`** (Frontend) ↔ **`technologyIds`** (Database).

---

## Ejecución Local

1.  **Instalar dependencias**:
    ```bash
    npm install
    ```
2.  **Configurar Variables de Entorno**:
    Crea un archivo `.env` basado en las credenciales de Supabase. Define:
    - `MS01_URL=http://localhost:3001` (para cross-fetch de autores).
    - `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
3.  **Sincronizar DB**:
    ```bash
    npx prisma generate
    npx prisma db push
    ```
4.  **Iniciar Servidor en puerto 3002**:
    ```bash
    npm run dev -- --port 3002
    ```

---

## Notas Adicionales
- **IMPORTANTE**: Este microservicio (MS-02) debe correr en el puerto **3002**. El MS-01 (Usuarios) debe correr en el **3001**.
- El backend incluye configuración de **CORS** para permitir peticiones desde `http://localhost:3000`.
- Para poblar el catálogo de tecnologías, se debe ejecutar el `seed` en el **Microservicio 01 (Usuarios)**.

---

## Comandos Útiles

```bash
# Sincronizar schema a supabase
npx prisma db push

# Regenerar cliente local de Prisma
npx prisma generate

# Abrir visor de base de datos local
npx prisma studio
```

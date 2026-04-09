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
| **Listar / Filtrar** | `GET` | `/api/publications` | No | Soporta query params: `type`, `area`, `technologyId`, `sortBy`, `page`. |
| **Ver Detalle** | `GET` | `/api/publications/:id` | No | Retorna la publicación + datos del autor (cross-fetch). |
| **Crear** | `POST` | `/api/publications` | **Sí** | Requiere Session Token. Validación condicional activada. |
| **Editar** | `PATCH` | `/api/publications/:id` | **Sí** | Solo el autor puede realizar esta acción. |
| **Eliminar** | `DELETE`| `/api/publications/:id` | **Sí** | Solo el autor puede realizar esta acción. |

### Parámetros de Listado (`GET /api/publications`)
- `type`: `ERROR_SOLUTION` o `CODE_SNIPPET`.
- `area`: `FRONTEND` o `BACKEND`.
- `technologyId`: UUID de la tecnología (del catálogo de MS-01).
- `sortBy`: `recent` (default) o `most_voted`.
- `page`: Paginación automática en grupos de **10**.

---

## 📋 Reglas de Validación (POST/PATCH)
Al crear o editar, el backend valida lo siguiente:
- **Si el tipo es `ERROR_SOLUTION`**: Son obligatorios los campos `errorCode` y `solution`.
- **Si el tipo es `CODE_SNIPPET`**: Son obligatorios los campos `codeBlock` y `language`.
- **Título**: Mínimo 10 caracteres.
- **Etiquetas**: Máximo 5 por publicación.

---

##  Ejecución Local

1.  **Instalar dependencias**:
    ```bash
    npm install
    ```
2.  **Configurar Variables de Entorno**:
    Crea un archivo `.env` basado en las credenciales de Supabase del proyecto `hwijeokbenqzlrlukown`. Asegúrate de definir `MS01_URL` para el cross-fetching.
3.  **Sincronizar DB**:
    ```bash
    npx prisma generate
    npx prisma db push
    ```
4.  **Iniciar Servidor**:
    ```bash
    npm run dev
    ```

---

## Requisito de Autenticación
Para los endpoints protegidos, el Frontend debe enviar el **Bearer Token** o la cookie de sesión gestionada por `@supabase/ssr`, tal como se definió en el middleware compartido.

## Comandos Útiles

```bash
# Sincronizar schema a supabase
npx prisma db push

# Regenerar cliente local de Prisma
npx prisma generate

# Abrir visor de base de datos local
npx prisma studio
```

---

## Notas Adicionales
- Para poblar el catálogo de tecnologías, se debe ejecutar el `seed` en el **Microservicio 01 (Usuarios)**, ya que es el encargado de gestionar esa entidad compartida.
- Asegúrate de tener el MS-01 corriendo localmente para que el cross-fetching de autores funcione correctamente.

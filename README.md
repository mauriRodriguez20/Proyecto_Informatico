# Developer's Portal - Frontend

Este es el frontend del Portal de Desarrolladores, construido con Next.js y TypeScript.

## Configuración de Microservicios

Este frontend está diseñado para comunicarse con dos servicios de backend separados (MS-01 y MS-02).

### Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Backend 1: Usuarios, Autenticación y Tecnologías
NEXT_PUBLIC_API_URL_MS01=http://localhost:3001

# Backend 2: Publicaciones y Comentarios
NEXT_PUBLIC_API_URL_MS02=http://localhost:3002
```

> [!IMPORTANT]
> Si los servicios corren en puertos diferentes o IPs distintas (ej. `127.0.0.1`), asegúrate de actualizarlos aquí y reiniciar el servidor de Next.js (`npm run dev`).

### Requisitos de CORS en el Backend

Para que el frontend pueda comunicarse con los backends, ambos **deben** tener habilitado CORS para el origen de la App (por defecto `http://localhost:3000`).

Configuración mínima recomendada en el Backend (Node/Express):

```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Características Implementadas

- **Autenticación Real**: Registro e inicio de sesión integrados con MS-01.
- **Microservicios**: Capa de servicios (`src/services`) desacoplada con soporte para múltiples URLs base.
- **Gestión de Publicaciones**: CRUD completo de publicaciones (Crear, Ver, Editar, Eliminar) integrado con MS-02.
- **Filtros Dinámicos**: Filtrado por tecnologías (cargadas desde MS-01) y ordenamiento por fecha o votos.
- **UI Premium**: Diseño oscuro con animaciones y componentes modulares.

## Ejecución Local

1. `npm install`
2. Configura el `.env.local`
3. `npm run dev`

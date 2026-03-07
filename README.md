

### 1. Configurar variables de entorno

Abre `.env` y completa los valores con los datos de tu proyecto en Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `DIRECT_URL`


### 2. Inicializar la base de datos

```bash
# Genera el cliente de Prisma
npm run db:generate

# Aplica el schema a Supabase
npm run db:push
```


## Scripts

```bash
npm run db:push      # Aplicar schema a Supabase
npm run db:generate  # Regenerar cliente Prisma
npm run db:studio    # Abrir Prisma Studio (explorador visual de DB)
```

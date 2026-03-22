# Sistema de Gestión de Inventario (MVP)

Aplicación web para **control de stock** con acceso restringido mediante autenticación. Permite iniciar sesión de forma segura y consultar el inventario de productos respaldado en Supabase.

## Tecnologías

| Área        | Stack                          |
| ----------- | ------------------------------ |
| Framework   | **Next.js 16** (App Router)    |
| UI          | **React 19**                   |
| Estilos     | **Tailwind CSS 4**           |
| Backend / BDD / Auth | **Supabase** (Auth + Postgres) |

## Características

- **Login seguro** con correo y contraseña vía Supabase Auth.
- **Visualización de productos** en tiempo real al iniciar sesión (lectura desde la tabla `productos`).
- **Protección de datos con RLS** (Row Level Security): las políticas en Supabase definen qué filas puede ver o modificar cada usuario autenticado; conviene revisarlas en el panel de Supabase para alinearlas con tu negocio.

## Requisitos previos

- Node.js 20+ (recomendado)
- Cuenta y proyecto en [Supabase](https://supabase.com/)

## Cómo clonar y ejecutar el proyecto

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/devncarlos725/sistema-gestion.git
   cd sistema-gestion
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Configurar variables de entorno**

   En la raíz del proyecto, creá el archivo **`.env.local`** (no se sube a Git; está ignorado por `.gitignore`) con:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
   ```

   Obtené la URL y la clave anónima en Supabase: **Project Settings → API**.

4. **Base de datos**

   Creá la tabla `productos` y las políticas RLS según tu esquema. Sin tabla o sin permisos, el panel puede mostrar lista vacía o errores en consola.

5. **Modo desarrollo**

   ```bash
   npm run dev
   ```

   Abrí [http://localhost:3000](http://localhost:3000).

## Scripts útiles

| Comando        | Descripción              |
| -------------- | ------------------------ |
| `npm run dev`  | Servidor de desarrollo   |
| `npm run build` | Compilación de producción |
| `npm run start` | Servidor de producción   |
| `npm run lint` | ESLint                   |

## Despliegue

Podés desplegar en [Vercel](https://vercel.com/) u otro hosting compatible con Next.js. Configurá las mismas variables `NEXT_PUBLIC_*` en el panel del proveedor.

## Licencia

Uso privado del proyecto salvo que se indique lo contrario.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que requieren estar logueado
const RUTAS_PROTEGIDAS = ["/presupuestador", "/ventas", "/clientes", "/camiones", "/productos/admin"];

// Rutas públicas (la tienda, el catálogo visible para clientes)
const RUTAS_PUBLICAS = ["/", "/catalogo", "/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Si no es una ruta protegida, dejar pasar
  const esProtegida = RUTAS_PROTEGIDAS.some(ruta => pathname.startsWith(ruta));
  if (!esProtegida) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Sin sesión → redirigir al login
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname); // para volver después de loguear
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto archivos estáticos y API
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};

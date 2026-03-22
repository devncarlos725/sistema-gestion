"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  // --- TUS ESTADOS DE AUTH ---
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // --- MI ESTADO DE PRODUCTOS ---
  const [productos, setProductos] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProductos([]);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("productos").select("*");
      if (!cancelled && data) setProductos(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // --- TUS FUNCIONES DE LOGIN/LOGOUT ---
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setSigningIn(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setAuthError(error.message);
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  // --- VISTA DE CARGA ---
  if (loading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200" />
      </div>
    );
  }

  // --- SI NO ESTÁ LOGUEADO: MOSTRAR TU FORMULARIO ---
  if (!user) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-br from-zinc-100 via-white to-zinc-200 px-4 py-12 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
        <div className="w-full max-w-[400px] rounded-2xl border border-zinc-200/80 bg-white/90 p-8 shadow-xl shadow-zinc-200/50 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90 dark:shadow-black/40">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Iniciar sesión</h1>
          </div>
          <form onSubmit={handleSignIn} className="flex flex-col gap-5">
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              className="rounded-xl border p-3 dark:bg-zinc-950" 
              required 
            />
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-xl border p-3 dark:bg-zinc-950" 
              required 
            />
            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            <button type="submit" disabled={signingIn} className="bg-zinc-900 text-white p-3 rounded-xl dark:bg-zinc-100 dark:text-zinc-900">
              {signingIn ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- SI ESTÁ LOGUEADO: MOSTRAR EL PANEL CON PRODUCTOS ---
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Panel de Control</h1>
            <p className="text-sm text-zinc-500">{user.email}</p>
          </div>
          <button onClick={handleSignOut} className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <h2 className="text-xl font-bold">Inventario de Productos</h2>
        <div className="grid gap-4">
          {productos.length === 0 ? (
            <p className="text-zinc-500">No hay productos en la base de datos.</p>
          ) : (
            productos.map((p) => (
              <div key={p.id} className="p-4 border rounded-xl bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                <div className="flex justify-between">
                  <span className="font-bold text-lg">{p.nombre}</span>
                  <span className="text-green-600 font-mono font-bold">${p.precio}</span>
                </div>
                <div className="text-sm text-zinc-500 mt-2">
                  <span>📦 Stock: {p.stock_actual}</span> | <span>🏷️ {p.categoria}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
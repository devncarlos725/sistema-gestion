"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-br from-zinc-100 via-white to-zinc-200 px-4 py-12 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
        <div className="w-full max-w-[400px] rounded-2xl border border-zinc-200/80 bg-white/90 p-8 shadow-xl shadow-zinc-200/50 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90 dark:shadow-black/40">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Iniciar sesión
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Accede al panel de control del sistema
            </p>
          </div>
          <form onSubmit={handleSignIn} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20"
                placeholder="tu@empresa.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20"
                placeholder="••••••••"
              />
            </div>
            {authError ? (
              <p
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
                role="alert"
              >
                {authError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={signingIn}
              className="mt-1 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {signingIn ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Panel de control
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <p className="text-zinc-600 dark:text-zinc-400">
          Elige una sección para continuar.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Inicio", href: "#" },
            { label: "Gestión", href: "#" },
            { label: "Reportes", href: "#" },
            { label: "Configuración", href: "#" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-8 text-center text-base font-medium text-zinc-800 shadow-sm transition-[border-color,box-shadow] hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
            >
              {item.label}
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}

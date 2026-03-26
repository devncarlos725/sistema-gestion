"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/presupuestador";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciales incorrectas. Revisá el mail y la clave.");
      setLoading(false);
    } else {
      router.push(redirect);
      router.refresh();
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <form onSubmit={handleLogin} style={{ background: '#161820', padding: '40px', borderRadius: '12px', border: '1px solid #2a2d3a', width: '320px' }}>
        <h2 style={{ color: '#f0ede6', marginBottom: '24px', textAlign: 'center' }}>Sistema Gestión</h2>
        {error && <p style={{ color: '#e05555', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
        <input 
          type="email" placeholder="Tu email" value={email} onChange={(e) => setEmail(e.target.value)} required
          style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '6px', border: '1px solid #2a2d3a', background: '#0f1117', color: '#fff' }}
        />
        <input 
          type="password" placeholder="Tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required
          style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #2a2d3a', background: '#0f1117', color: '#fff' }}
        />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', background: '#1e4d8c', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? "Entrando..." : "Iniciar Sesión"}
        </button>
      </form>
    </div>
  );
}
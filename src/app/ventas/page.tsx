"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Presupuesto {
  id: string;
  fecha: string;
  cliente_id: string | null;
  total_usd: number;
  total_pesos: number;
  estado: string;
  clientes?: { nombre: string } | null;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HistorialVentas() {
  const supabase = createClient();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarPresupuestos = async () => {
      try {
        const { data, error } = await supabase
          .from("presupuestos")
          .select("id, fecha, cliente_id, total_usd, total_pesos, estado, clientes(nombre)")
          .order("fecha", { ascending: false });
        if (error) throw error;
        setPresupuestos(data || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    cargarPresupuestos();
  }, [supabase]);

  const verDetalle = (id: string) => {
    console.log("Ver detalle del presupuesto:", id);
  };

  if (loading) return <div className="p-4">Cargando...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Historial de Ventas</h1>
      {presupuestos.length === 0 ? (
        <p>No hay presupuestos guardados.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Fecha</th>
              <th className="border border-gray-300 p-2">Cliente</th>
              <th className="border border-gray-300 p-2">Total USD</th>
              <th className="border border-gray-300 p-2">Total Pesos</th>
              <th className="border border-gray-300 p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {presupuestos.map((p) => (
              <tr key={p.id}>
                <td className="border border-gray-300 p-2">{new Date(p.fecha).toLocaleDateString("es-AR")}</td>
                <td className="border border-gray-300 p-2">{p.clientes?.nombre || "Sin cliente"}</td>
                <td className="border border-gray-300 p-2">USD {p.total_usd.toFixed(2)}</td>
                <td className="border border-gray-300 p-2">${p.total_pesos.toLocaleString("es-AR")}</td>
                <td className="border border-gray-300 p-2">
                  <button
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                    onClick={() => verDetalle(p.id)}
                  >
                    Ver Detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
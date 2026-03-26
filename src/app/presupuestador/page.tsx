"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type UnidadMedida = "unidad" | "kg" | "g" | "litro" | "ml" | "balde" | "bolsa" | "caja" | "frasco";

interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_usd: number;
  stock_actual: number;
  stock_minimo: number;
  categoria: string | null;
  unidad_medida: UnidadMedida;
  activo: boolean;
}

interface Cliente {
  id: string;
  nombre: string;
  descuento_pct: number;
  saldo_pesos: number;
}

interface ItemCarrito {
  producto: Producto;
  cantidad: number; // decimal: 0.5 kg, 1.5 litros, etc.
}

// Unidades que permiten decimales
const UNIDADES_DECIMALES: UnidadMedida[] = ["kg", "g", "litro", "ml"];
const esDecimal = (u: UnidadMedida) => UNIDADES_DECIMALES.includes(u);

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Presupuestador() {
  const supabase = createClient();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [dolarBlue, setDolarBlue] = useState<number | null>(null);
  const [dolarFuente, setDolarFuente] = useState<"api" | "supabase" | null>(null);
  const [loadingDolar, setLoadingDolar] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [clienteId, setClienteId] = useState("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [descuentoExtra, setDescuentoExtra] = useState(0);
  const [tipoVenta, setTipoVenta] = useState<"oficial" | "informal">("oficial");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal de cantidad
  const [modalProd, setModalProd] = useState<Producto | null>(null);
  const [cantidadModal, setCantidadModal] = useState("1");

  // ─── Dólar: API primero, Supabase como fallback ───────────────────────────

  const fetchDolar = useCallback(async () => {
    // Intento 1: dolarapi.com
    try {
      const res = await fetch("https://dolarapi.com/v1/dolares/blue");
      if (res.ok) {
        const data = await res.json();
        const valor = data.venta ?? data.promedio;
        if (valor && valor > 0) {
          setDolarBlue(valor);
          setDolarFuente("api");
          // Guardar en Supabase como respaldo
          await supabase.from("tipo_cambio").upsert(
            { fecha: new Date().toISOString().split("T")[0], valor_blue: valor, fuente: "dolarapi.com" },
            { onConflict: "fecha" }
          );
          setLoadingDolar(false);
          return;
        }
      }
    } catch { /* API caída, seguimos */ }

    // Intento 2: último valor en Supabase
    try {
      const { data } = await supabase
        .from("tipo_cambio")
        .select("valor_blue, fecha")
        .order("fecha", { ascending: false })
        .limit(1)
        .single();
      if (data?.valor_blue) {
        setDolarBlue(data.valor_blue);
        setDolarFuente("supabase");
      }
    } catch { setDolarBlue(null); }
    setLoadingDolar(false);
  }, [supabase]);

  // ─── Carga inicial ────────────────────────────────────────────────────────

  useEffect(() => {
    const cargarDatos = async () => {
      const [{ data: prods }, { data: clts }] = await Promise.all([
        supabase.from("productos").select("*").eq("activo", true).order("nombre"),
        supabase.from("clientes").select("id,nombre,descuento_pct,saldo_pesos").eq("activo", true).order("nombre"),
      ]);
      if (prods) setProductos(prods);
      if (clts) setClientes(clts);
    };
    cargarDatos();
    fetchDolar();
    const t = setInterval(fetchDolar, 60_000);
    return () => clearInterval(t);
  }, [fetchDolar]);

  // ─── Carrito ──────────────────────────────────────────────────────────────

  const abrirModal = (prod: Producto) => {
    setModalProd(prod);
    const en = carrito.find(i => i.producto.id === prod.id);
    setCantidadModal(en ? String(en.cantidad) : "1");
  };

  const confirmarCantidad = () => {
    if (!modalProd) return;
    const cant = parseFloat(cantidadModal);
    if (isNaN(cant) || cant <= 0) return;
    setCarrito(prev => {
      const existe = prev.find(i => i.producto.id === modalProd.id);
      return existe
        ? prev.map(i => i.producto.id === modalProd.id ? { ...i, cantidad: cant } : i)
        : [...prev, { producto: modalProd, cantidad: cant }];
    });
    setModalProd(null);
  };

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito(prev => {
      const item = prev.find(i => i.producto.id === id);
      if (!item) return prev;
      const step = esDecimal(item.producto.unidad_medida) ? 0.5 : 1;
      const nueva = parseFloat((item.cantidad + delta * step).toFixed(3));
      return nueva <= 0
        ? prev.filter(i => i.producto.id !== id)
        : prev.map(i => i.producto.id === id ? { ...i, cantidad: nueva } : i);
    });
  };

  const quitarDelCarrito = (id: string) => setCarrito(p => p.filter(i => i.producto.id !== id));

  // ─── Cálculos ─────────────────────────────────────────────────────────────

  const clienteSeleccionado = clientes.find(c => c.id === clienteId);
  const descuentoCliente = clienteSeleccionado?.descuento_pct ?? 0;
  const descuentoTotal = Math.min(descuentoCliente + descuentoExtra, 100);
  const subtotalUSD = carrito.reduce((acc, i) => acc + i.producto.precio_usd * i.cantidad, 0);
  const totalUSD = subtotalUSD * (1 - descuentoTotal / 100);
  const totalPesos = dolarBlue ? totalUSD * dolarBlue : null;

  const categorias = ["Todos", ...Array.from(new Set(productos.map(p => p.categoria).filter(Boolean) as string[]))];
  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
    (categoriaFiltro === "Todos" || p.categoria === categoriaFiltro)
  );

  const fmtCant = (cant: number, u: UnidadMedida) =>
    `${esDecimal(u) ? (cant % 1 === 0 ? cant : cant.toFixed(1)) : Math.round(cant)} ${u}`;

  // ─── Guardar ──────────────────────────────────────────────────────────────

  const guardar = async () => {
    if (!carrito.length) { setError("El carrito está vacío."); return; }
    if (!dolarBlue) { setError("Sin cotización del dólar."); return; }
    setGuardando(true); setError(null);
    try {
      const { data: presup, error: e1 } = await supabase
        .from("presupuestos")
        .insert({ cliente_id: clienteId || null, cotizacion_dolar: dolarBlue, total_usd: totalUSD, total_pesos: totalPesos, descuento_pct: descuentoTotal, estado: "borrador", notas })
        .select().single();
      if (e1 || !presup) throw new Error(e1?.message ?? "Error al guardar");

      const { error: e2 } = await supabase.from("presupuestos_items").insert(
        carrito.map(i => ({ presupuesto_id: presup.id, producto_id: i.producto.id, cantidad: i.cantidad, precio_usd: i.producto.precio_usd }))
      );
      if (e2) throw new Error(e2.message);

      setExito(true);
      setCarrito([]); setClienteId(""); setDescuentoExtra(0); setNotas("");
      setTimeout(() => setExito(false), 4000);
    } catch (e: any) { setError(e.message); }
    finally { setGuardando(false); }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="pr">

      {/* Modal cantidad */}
      {modalProd && (
        <div className="mo" onClick={() => setModalProd(null)}>
          <div className="mb" onClick={e => e.stopPropagation()}>
            <p className="mt">{modalProd.nombre}</p>
            <p className="mu">Unidad: <strong>{modalProd.unidad_medida}</strong>{esDecimal(modalProd.unidad_medida) && " · acepta decimales (ej: 1.5)"}</p>
            <div className="mir">
              <button className="ms" onClick={() => setCantidadModal(v => String(Math.max(esDecimal(modalProd.unidad_medida) ? 0.5 : 1, parseFloat(v) - (esDecimal(modalProd.unidad_medida) ? 0.5 : 1))))}>−</button>
              <input className="mi" type="number" min={esDecimal(modalProd.unidad_medida) ? "0.1" : "1"} step={esDecimal(modalProd.unidad_medida) ? "0.5" : "1"} value={cantidadModal} onChange={e => setCantidadModal(e.target.value)} autoFocus />
              <button className="ms" onClick={() => setCantidadModal(v => String(parseFloat(v) + (esDecimal(modalProd.unidad_medida) ? 0.5 : 1)))}>+</button>
            </div>
            <p className="mst">
              USD {(modalProd.precio_usd * (parseFloat(cantidadModal) || 0)).toFixed(2)}
              {dolarBlue && <span> · ${((modalProd.precio_usd * (parseFloat(cantidadModal) || 0)) * dolarBlue).toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>}
            </p>
            <div className="mbb">
              <button className="mc" onClick={() => setModalProd(null)}>Cancelar</button>
              <button className="mok" onClick={confirmarCantidad}>Agregar al carrito</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="ph">
        <div className="phi">
          <div>
            <h1 className="pt">Presupuestador</h1>
            <p className="ps">Armá el pedido y mandalo al camión</p>
          </div>
          <div className={`db ${dolarFuente === "supabase" ? "fb" : ""}`}>
            {loadingDolar ? <span className="dl">Cargando…</span> : dolarBlue ? (
              <>
                <span className="dlb">{dolarFuente === "supabase" ? "⚠ Blue (último guardado)" : "Blue hoy"}</span>
                <span className="dv">${dolarBlue.toLocaleString("es-AR")}</span>
              </>
            ) : <span className="de">Sin cotización</span>}
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="pl">

        {/* Catálogo */}
        <section className="pcat">
          <div className="fw">
            <input className="pse" placeholder="Buscar producto…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <div className="cs">
              {categorias.map(c => <button key={c} className={`cp ${categoriaFiltro === c ? "ca" : ""}`} onClick={() => setCategoriaFiltro(c)}>{c}</button>)}
            </div>
          </div>
          <div className="pg">
            {productosFiltrados.length === 0
              ? <p className="em">No hay productos.</p>
              : productosFiltrados.map(p => {
                const en = carrito.find(i => i.producto.id === p.id);
                const bajo = p.stock_actual <= p.stock_minimo && p.stock_minimo > 0;
                return (
                  <button key={p.id} className={`pc ${en ? "ec" : ""} ${bajo ? "sb" : ""}`} onClick={() => abrirModal(p)}>
                    <span className="pn">{p.nombre}</span>
                    {p.categoria && <span className="pca">{p.categoria}</span>}
                    <span className="pu">{p.unidad_medida}</span>
                    <span className="pp">USD {p.precio_usd.toFixed(2)}/{p.unidad_medida}</span>
                    {dolarBlue && <span className="pps">${(p.precio_usd * dolarBlue).toLocaleString("es-AR", { maximumFractionDigits: 0 })}/{p.unidad_medida}</span>}
                    <span className={`pst ${bajo ? "bj" : ""}`}>{p.stock_actual > 0 ? `📦 ${p.stock_actual} ${p.unidad_medida}${bajo ? " ⚠" : ""}` : "⚠️ Sin stock"}</span>
                    {en && <span className="pbg">{fmtCant(en.cantidad, p.unidad_medida)}</span>}
                  </button>
                );
              })}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="psb">
          <div className="sc">
            <label className="sl">Cliente</label>
            <select className="psl" value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">— Sin cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.descuento_pct > 0 ? ` (${c.descuento_pct}% dto.)` : ""}{c.saldo_pesos < 0 ? ` ⚠️ Debe $${Math.abs(c.saldo_pesos).toLocaleString("es-AR")}` : ""}</option>)}
            </select>
          </div>

          <div className="sc tv">
            <label className="sl">Tipo de venta</label>
            <div className="tvb">
              <button className={`tb ${tipoVenta === "oficial" ? "ta" : ""}`} onClick={() => setTipoVenta("oficial")}>🧾 Oficial</button>
              <button className={`tb ti ${tipoVenta === "informal" ? "ta" : ""}`} onClick={() => setTipoVenta("informal")}>💵 Informal</button>
            </div>
          </div>

          <div className="sc cc">
            <label className="sl">Carrito {carrito.length > 0 && `(${carrito.length})`}</label>
            {carrito.length === 0
              ? <p className="eca">Tocá un producto →</p>
              : <ul className="cl">
                {carrito.map(i => (
                  <li key={i.producto.id} className="ci">
                    <div className="cii">
                      <span className="cn">{i.producto.nombre}</span>
                      <span className="cpr">USD {(i.producto.precio_usd * i.cantidad).toFixed(2)}</span>
                    </div>
                    <div className="cco">
                      <button className="cb" onClick={() => cambiarCantidad(i.producto.id, -1)}>−</button>
                      <span className="cca">{fmtCant(i.cantidad, i.producto.unidad_medida)}</span>
                      <button className="cb" onClick={() => cambiarCantidad(i.producto.id, +1)}>+</button>
                      <button className="cq" onClick={() => quitarDelCarrito(i.producto.id)}>✕</button>
                    </div>
                  </li>
                ))}
              </ul>}
          </div>

          <div className="sc">
            <label className="sl">Descuento extra: <strong>{descuentoExtra}%</strong>
              {descuentoCliente > 0 && <span className="dci"> + {descuentoCliente}% cliente = {descuentoTotal}% total</span>}
            </label>
            <input type="range" min={0} max={50} step={1} value={descuentoExtra} onChange={e => setDescuentoExtra(Number(e.target.value))} className="pr2" />
          </div>

          <div className="sc">
            <label className="sl">Notas</label>
            <textarea className="pta" placeholder="Observaciones, condiciones de entrega…" value={notas} onChange={e => setNotas(e.target.value)} rows={2} />
          </div>

          <div className="sc tot">
            <div className="tr"><span>Subtotal</span><span>USD {subtotalUSD.toFixed(2)}</span></div>
            {descuentoTotal > 0 && <div className="tr dr"><span>Descuento ({descuentoTotal}%)</span><span>− USD {(subtotalUSD - totalUSD).toFixed(2)}</span></div>}
            <div className="tr tf"><span>Total USD</span><span>USD {totalUSD.toFixed(2)}</span></div>
            {totalPesos !== null && <div className="tr tp"><span>Total pesos (blue)</span><span>${totalPesos.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span></div>}
          </div>

          {error && <p className="mer">{error}</p>}
          {exito && <p className="mex">✅ Presupuesto guardado</p>}
          <button className="bg" onClick={guardar} disabled={guardando || !carrito.length}>
            {guardando ? "Guardando…" : "💾 Guardar presupuesto"}
          </button>
        </aside>
      </div>

      <style>{`
        .pr { min-height:100vh; background:#0f1117; color:#e8e6df; font-family:'DM Sans','Segoe UI',sans-serif; }
        .ph { background:#161820; border-bottom:1px solid #2a2d3a; padding:16px 24px; position:sticky; top:0; z-index:10; }
        .phi { max-width:1280px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:16px; }
        .pt { font-size:20px; font-weight:700; letter-spacing:-0.5px; color:#f0ede6; margin:0; }
        .ps { font-size:12px; color:#6b6e7a; margin:2px 0 0; }
        .db { background:#1e2130; border:1px solid #2e8b57; border-radius:10px; padding:8px 16px; display:flex; flex-direction:column; align-items:flex-end; min-width:150px; }
        .db.fb { border-color:#a56f2e; }
        .dlb { font-size:10px; color:#4caf7d; text-transform:uppercase; letter-spacing:0.8px; }
        .fb .dlb { color:#c89040; }
        .dv { font-size:18px; font-weight:700; color:#4caf7d; font-variant-numeric:tabular-nums; }
        .fb .dv { color:#c89040; }
        .dl,.de { font-size:12px; color:#6b6e7a; }
        .pl { max-width:1280px; margin:0 auto; padding:24px 16px; display:grid; grid-template-columns:1fr 360px; gap:24px; align-items:start; }
        @media(max-width:900px){.pl{grid-template-columns:1fr;}}
        .pcat { display:flex; flex-direction:column; gap:16px; }
        .fw { display:flex; flex-direction:column; gap:10px; }
        .pse { width:100%; background:#161820; border:1px solid #2a2d3a; border-radius:10px; padding:10px 14px; color:#e8e6df; font-size:14px; outline:none; box-sizing:border-box; transition:border-color 0.2s; }
        .pse:focus { border-color:#4a6fa5; }
        .pse::placeholder { color:#4a4d5a; }
        .cs { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; }
        .cs::-webkit-scrollbar { display:none; }
        .cp { white-space:nowrap; padding:5px 14px; border-radius:20px; border:1px solid #2a2d3a; background:#161820; color:#8a8d9a; font-size:12px; cursor:pointer; transition:all 0.15s; }
        .cp.ca,.cp:hover { background:#1e2a40; border-color:#4a6fa5; color:#7ba7d4; }
        .pg { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
        .pc { position:relative; background:#161820; border:1px solid #2a2d3a; border-radius:12px; padding:14px 12px; text-align:left; cursor:pointer; transition:all 0.15s; display:flex; flex-direction:column; gap:3px; }
        .pc:hover { border-color:#4a6fa5; background:#1a1f2e; transform:translateY(-1px); }
        .pc.ec { border-color:#2e8b57; background:#141e18; }
        .pc.sb { border-color:#7a5020; }
        .pn { font-size:14px; font-weight:600; color:#e8e6df; line-height:1.3; }
        .pca { font-size:10px; color:#4a4d5a; text-transform:uppercase; letter-spacing:0.5px; }
        .pu { font-size:10px; color:#3a7050; background:#141e18; border-radius:4px; padding:1px 5px; width:fit-content; }
        .pp { font-size:13px; color:#7ba7d4; font-weight:600; margin-top:4px; }
        .pps { font-size:12px; color:#4caf7d; }
        .pst { font-size:11px; color:#5a5d6a; margin-top:4px; }
        .pst.bj { color:#c89040; }
        .pbg { position:absolute; top:8px; right:8px; background:#2e8b57; color:#fff; border-radius:8px; padding:2px 7px; font-size:10px; font-weight:700; }
        .em { color:#4a4d5a; font-size:14px; padding:24px 0; }
        .psb { display:flex; flex-direction:column; gap:12px; position:sticky; top:80px; }
        .sc { background:#161820; border:1px solid #2a2d3a; border-radius:12px; padding:14px 16px; }
        .sl { display:block; font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#5a5d6a; margin-bottom:8px; }
        .psl { width:100%; background:#0f1117; border:1px solid #2a2d3a; border-radius:8px; padding:9px 12px; color:#e8e6df; font-size:13px; outline:none; cursor:pointer; }
        .tvb { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .tb { padding:9px 6px; border-radius:8px; border:1px solid #2a2d3a; background:#0f1117; color:#8a8d9a; font-size:12px; cursor:pointer; transition:all 0.15s; }
        .tb.ta { background:#1e2a40; border-color:#4a6fa5; color:#7ba7d4; }
        .tb.ti.ta { background:#2a1e14; border-color:#a56f2e; color:#c89040; }
        .cc { max-height:280px; overflow-y:auto; }
        .eca { font-size:13px; color:#4a4d5a; text-align:center; padding:12px 0; }
        .cl { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
        .ci { display:flex; flex-direction:column; gap:4px; padding-bottom:8px; border-bottom:1px solid #2a2d3a; }
        .ci:last-child { border-bottom:none; padding-bottom:0; }
        .cii { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
        .cn { font-size:13px; color:#d8d6cf; }
        .cpr { font-size:12px; color:#7ba7d4; white-space:nowrap; }
        .cco { display:flex; align-items:center; gap:6px; }
        .cb { width:24px; height:24px; border-radius:6px; border:1px solid #2a2d3a; background:#0f1117; color:#e8e6df; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .cb:hover { background:#1e2130; }
        .cca { font-size:12px; font-weight:600; min-width:60px; text-align:center; color:#a8d4a8; }
        .cq { background:none; border:none; color:#5a2a2a; cursor:pointer; font-size:12px; padding:2px 4px; margin-left:4px; }
        .cq:hover { color:#e05555; }
        .dci { color:#c89040; font-size:10px; font-weight:400; margin-left:6px; }
        .pr2 { width:100%; accent-color:#4a6fa5; cursor:pointer; }
        .pta { width:100%; background:#0f1117; border:1px solid #2a2d3a; border-radius:8px; padding:8px 12px; color:#e8e6df; font-size:13px; resize:none; outline:none; box-sizing:border-box; font-family:inherit; }
        .tot { display:flex; flex-direction:column; gap:8px; }
        .tr { display:flex; justify-content:space-between; font-size:13px; color:#8a8d9a; }
        .dr { color:#c89040; }
        .tf { font-size:15px; font-weight:700; color:#7ba7d4; padding-top:6px; border-top:1px solid #2a2d3a; }
        .tp { font-size:16px; font-weight:700; color:#4caf7d; }
        .mer { font-size:12px; color:#e05555; background:#2a1414; border:1px solid #5a2a2a; border-radius:8px; padding:8px 12px; }
        .mex { font-size:12px; color:#4caf7d; background:#141e18; border:1px solid #2e8b57; border-radius:8px; padding:8px 12px; }
        .bg { width:100%; padding:14px; background:#1e4d8c; border:none; border-radius:12px; color:#fff; font-size:15px; font-weight:700; cursor:pointer; transition:all 0.15s; letter-spacing:-0.2px; }
        .bg:hover:not(:disabled) { background:#2560b0; transform:translateY(-1px); }
        .bg:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
        /* Modal */
        .mo { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:100; }
        .mb { background:#161820; border:1px solid #2a2d3a; border-radius:16px; padding:28px 24px; width:300px; display:flex; flex-direction:column; gap:14px; }
        .mt { font-size:16px; font-weight:700; color:#f0ede6; margin:0; }
        .mu { font-size:12px; color:#5a5d6a; margin:0; }
        .mu strong { color:#4caf7d; }
        .mir { display:flex; align-items:center; gap:10px; }
        .ms { width:36px; height:36px; border-radius:8px; border:1px solid #2a2d3a; background:#0f1117; color:#e8e6df; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .mi { flex:1; background:#0f1117; border:1px solid #4a6fa5; border-radius:8px; padding:8px 12px; color:#e8e6df; font-size:18px; font-weight:700; text-align:center; outline:none; }
        .mst { font-size:13px; color:#4caf7d; text-align:center; margin:0; }
        .mbb { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .mc { padding:10px; border-radius:8px; border:1px solid #2a2d3a; background:#0f1117; color:#8a8d9a; font-size:13px; cursor:pointer; }
        .mok { padding:10px; border-radius:8px; border:none; background:#1e4d8c; color:#fff; font-size:13px; font-weight:700; cursor:pointer; }
        .mok:hover { background:#2560b0; }
      `}</style>
    </div>
  );
}

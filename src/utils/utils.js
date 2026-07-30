// ─── Format helpers ───────────────────────────────────────────────────────────
const fp  = (v, d = 5) => v != null ? Number(v).toFixed(d) : "—";
const f2  = (v) => v != null ? Number(v).toFixed(2) : "—";
const f1  = (v) => v != null ? Number(v).toFixed(1) : "—";
const fpc = (v) => v != null ? (v >= 0 ? "+" : "") + Number(v).toFixed(2) + "%" : "—";
const usd = (v) => v != null ? (Number(v) >= 0 ? "+$" : "-$") + Math.abs(Number(v)).toFixed(2) : "—";
const ago = (s) => {
  if (!s) return "";
  const d = Math.floor((Date.now() - new Date(s)) / 1000);
  if (d < 60)   return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
};

export { fp, f2, f1, fpc, usd, ago };
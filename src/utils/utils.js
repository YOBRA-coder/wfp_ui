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

// Weekday + date + time in East Africa Time, for the top-bar clock — the
// same Africa/Nairobi timezone the charts already use, matching the EAT
// fix in Charts.jsx rather than falling back to the browser's local zone.
const nowEAT = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi", weekday: "short", day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  return `${get("weekday")}, ${get("day")} ${get("month")} · ${get("hour")}:${get("minute")} EAT`;
};

export { fp, f2, f1, fpc, usd, ago, nowEAT };
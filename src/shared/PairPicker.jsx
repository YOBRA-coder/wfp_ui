// ─── PairPicker ───────────────────────────────────────────────────────────
// Shared searchable pair browser + favorites toggle, used by both Live
// Prices and Dashboard so a trader gets the same "search all pairs, star
// what you want" UI everywhere a watchlist is edited. Pulls the full pair
// list from GET /prices/pairs (backend source of truth — see prefs.py /
// forexpro_main.py) rather than hardcoding it here.
import { useState, useEffect } from "react";
import { C } from "../utils/constants.jsx";

function PairPicker({ api, watchlist, onToggle, onClose }) {
  const [allPairs, setAllPairs] = useState([]); // [{symbol, display, group}]
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/prices/pairs")
      .then((d) => setAllPairs(d.pairs || []))
      .catch(() => setAllPairs([]))
      .finally(() => setLoading(false));
  }, [api]);

  const q = query.trim().toUpperCase();
  const filtered = q
    ? allPairs.filter((p) => p.symbol.includes(q) || p.display.toUpperCase().includes(q))
    : allPairs;
  const grouped = filtered.reduce((acc, p) => { (acc[p.group] = acc[p.group] || []).push(p); return acc; }, {});

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(2,6,12,0.75)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6vh 14px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, maxHeight: "82vh", display: "flex", flexDirection: "column", background: "#0b1723", border: "1px solid #1f2937", borderRadius: 14, overflow: "hidden" }}
      >
        <div style={{ padding: 14, borderBottom: "1px solid #1f2937", display: "flex", gap: 10, alignItems: "center" }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pairs (e.g. EUR, JPY, GOLD)…"
            style={{ flex: 1, padding: "9px 12px", background: "#111827", border: "1px solid #1e293b", borderRadius: 8, color: "#fff", fontSize: 13, boxSizing: "border-box" }}
          />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ overflowY: "auto", padding: 10 }}>
          {loading && <div style={{ padding: 20, textAlign: "center", color: "#64748b", fontSize: 12 }}>Loading pairs…</div>}
          {!loading && Object.keys(grouped).length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "#64748b", fontSize: 12 }}>No pairs match "{query}"</div>
          )}
          {Object.entries(grouped).map(([group, pairs]) => (
            <div key={group} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, padding: "6px 6px 4px" }}>{group}</div>
              {pairs.map((p) => {
                const active = watchlist.includes(p.symbol);
                return (
                  <div
                    key={p.symbol}
                    onClick={() => onToggle(p.symbol)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "9px 10px", borderRadius: 8, cursor: "pointer",
                      background: active ? "rgba(250,204,21,0.08)" : "transparent",
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#111827"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div>
                      <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{p.symbol}</span>
                      <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>{p.display}</span>
                    </div>
                    <span style={{ fontSize: 16, color: active ? C.gold : "#334155" }}>{active ? "★" : "☆"}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid #1f2937", fontSize: 11, color: "#64748b" }}>
          {watchlist.length} pair{watchlist.length === 1 ? "" : "s"} in your watchlist · tap a pair to add or remove
        </div>
      </div>
    </div>
  );
}

export default PairPicker;

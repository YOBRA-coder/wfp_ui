// ─── Ticker bar ───────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { C } from "../utils/constants.jsx";
import { fp, f2, fpc } from "../utils/utils.js";
import { PAIRS } from "./Charts.jsx";
import { WS_BASE } from "../api/Api.jsx";
import { useLiveSocket } from "../hooks/useLiveSocket.js";

const WS_URL = `${WS_BASE}/ws/prices?pairs=${PAIRS.join(",")}`;

export default function Ticker({ api }) {
  const [prices, setPrices] = useState([]);

  const onMessage = useCallback((d) => {
    if (d?.type === "prices" && Array.isArray(d.data)) setPrices(d.data);
  }, []);
  const status = useLiveSocket(WS_URL, onMessage);

  // One-time REST fallback so the bar isn't empty while the socket connects.
  useEffect(() => {
    if (prices.length) return;
    api.get("/prices/live?pairs=" + PAIRS.join(","))
      .then((d) => setPrices(d.prices || []))
      .catch(() => {});
  }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!prices.length) return <div style={{ height: 28, background: C.surf2, borderBottom: `1px solid ${C.border}` }} />;

  const items = prices.map((p) => (
    <span key={p.pair} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span style={{ color: C.muted, fontSize: 11 }}>{p.pair}</span>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: p.direction === "up" ? C.green : C.red }}>
        {p.pair === "BTCUSD" ? f2(p.price) : fp(p.price)} {fpc(p.change_pct)}
      </span>
    </span>
  ));

  return (
    <div style={{ overflow: "hidden", background: C.surf2, borderBottom: `1px solid ${C.border}`, height: 28, display: "flex", alignItems: "center" }}>
      <span
        title={status === "open" ? "Live" : "Reconnecting…"}
        style={{
          width: 6, height: 6, borderRadius: "50%", marginLeft: 12, flexShrink: 0,
          background: status === "open" ? C.green : C.muted,
          boxShadow: status === "open" ? `0 0 6px ${C.green}` : "none",
        }}
      />
      <div style={{ display: "flex", gap: 36, whiteSpace: "nowrap", padding: "0 16px", animation: "ticker 100s linear infinite" }}>
        {[...items, ...items]}
      </div>
      <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

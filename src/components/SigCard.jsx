// ─── Signal card ──────────────────────────────────────────────────────────────
export default function SigCard({ s, selected, onClick }) {
  const buy = s.direction === "BUY";
  const dc  = buy ? C.green : C.red;
  const sc  = { STRONG: C.green, MODERATE: C.gold, WEAK: "#f97316", AVOID: C.red }[s.strength] || C.muted;

  return (
    <div onClick={onClick} style={{
      background: selected ? C.surf2 : C.surf,
      border: `1px solid ${selected ? C.gold : C.border}`,
      borderLeft: `3px solid ${dc}`,
      borderRadius: 9, padding: 13, marginBottom: 8, cursor: "pointer", transition: "all .15s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{s.pair}</span>
          <Badge col={dc}>{s.direction}</Badge>
          <Badge col={C.muted}>{s.timeframe}</Badge>
        </div>
        <ConfRing val={s.confidence} size={50} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, fontSize: 11 }}>
        {[["ENTRY", fp(s.entry_price), C.text], ["SL", fp(s.stop_loss), C.red], ["TP", fp(s.take_profit), C.green],
          ["SL PIPS", f1(s.sl_pips), C.red], ["TP PIPS", f1(s.tp_pips), C.green], ["R:R", `1:${s.risk_reward}`, C.gold],
        ].map(([l, v, c]) => (
          <div key={l}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 0.5, marginBottom: 2 }}>{l}</div>
            <div style={{ fontWeight: 700, fontFamily: "monospace", color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
        <Badge col={sc}>{s.strength}</Badge>
        <Badge col={C.muted}>{s.candle_pattern || "—"}</Badge>
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.muted }}>{ago(s.created_at)}</span>
      </div>
      {s.entry_time && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{s.entry_time}</div>}
    </div>
  );
}
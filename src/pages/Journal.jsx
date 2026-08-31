// ─── Journal ──────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { C } from "../utils/constants.jsx";
import { Card, SectionTitle, Stat, Badge, Row, Grid, Btn, FG, Inp, Sel, Modal, OkBox } from "../shared/Shared.jsx";
import { ago, fp, f1, usd } from "../utils/utils.js";
import { PAIRS } from "../components/Charts.jsx";
export default function Journal({ api }) {
  const [trades, setTrades] = useState([]);
  const [stats,  setStats]  = useState({});
  const [form,   setForm]   = useState({ pair: "EURUSD", direction: "BUY", entry_price: "", exit_price: "", lot_size: 0.01, pnl_usd: "", pnl_pips: "", notes: "", emotion: "calm", setup: "" });
  const [busy,   setBusy]   = useState(false);
  const [ok,     setOk]     = useState("");

  const load = useCallback(() => {
    api.get("/journal").then(d => { setTrades(d.trades || []); setStats(d.stats || {}); }).catch(() => {});
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.entry_price || !form.exit_price) { alert("Fill in entry and exit price"); return; }
    setBusy(true);
    try {
      await api.post("/journal", { ...form, entry_price: +form.entry_price, exit_price: +form.exit_price, lot_size: +form.lot_size, pnl_usd: +form.pnl_usd, pnl_pips: +form.pnl_pips });
      setOk("Trade logged!"); setTimeout(() => setOk(""), 2500);
      setForm(p => ({ ...p, entry_price: "", exit_price: "", pnl_usd: "", pnl_pips: "", notes: "", setup: "" }));
      load();
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ padding: 20 }}>
      <Grid cols="repeat(4,minmax(0,1fr))" mobileCols="1fr 1fr" gap={12} style={{ marginBottom: 18 }}>
        <Stat label="Total Trades" value={stats.total     || 0}                     color={C.blue} />
        <Stat label="Win Rate"     value={`${stats.win_rate || 0}%`}                color={(stats.win_rate || 0) >= 50 ? C.green : C.red} />
        <Stat label="Total P&L"    value={usd(stats.total_pnl)}                     color={(stats.total_pnl || 0) >= 0 ? C.green : C.red} />
        <Stat label="Best Trade"   value={usd(stats.best_trade)}                    color={C.green} />
      </Grid>

      <Grid cols="1fr 310px" gap={16}>
        {/* History */}
        <Card>
          <SectionTitle>Trade History ({trades.length})</SectionTitle>
          {trades.length === 0
            ? <div style={{ color: C.muted, fontSize: 12 }}>No journal entries yet — log your first trade →</div>
            : (
              <>
                {/* Fixed-width columns don't fit a phone screen — scroll
                    horizontally within the card instead of letting the
                    app's global overflow-x:hidden silently clip columns off
                    the right edge. */}
                <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 560 }}>
                <div style={{ display: "grid", gridTemplateColumns: "75px 50px 95px 95px 75px 75px 1fr", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.muted, letterSpacing: 1, fontWeight: 700 }}>
                  {["PAIR","DIR","ENTRY","EXIT","P&L","PIPS","SETUP / SOURCE"].map(h => <span key={h}>{h}</span>)}
                </div>
                {trades.map(t => (
                  <div key={`${t.source}_${t.id}`} style={{ display: "grid", gridTemplateColumns: "75px 50px 95px 95px 75px 75px 1fr", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}20`, alignItems: "center", fontSize: 12 }}>
                    <strong>{t.pair}</strong>
                    <Badge col={t.direction === "BUY" ? C.green : C.red}>{t.direction}</Badge>
                    <span style={{ fontFamily: "monospace", fontSize: 11 }}>{fp(t.entry_price)}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 11 }}>{fp(t.exit_price)}</span>
                    <span style={{ fontWeight: 700, color: Number(t.pnl_usd) >= 0 ? C.green : C.red }}>{usd(t.pnl_usd)}</span>
                    <span style={{ color: Number(t.pnl_pips) >= 0 ? C.green : C.red }}>{f1(t.pnl_pips)}p</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted, overflow: "hidden" }}>
                      {t.source === "copy" ? (
                        <>
                          <Badge col={t.status === "failed" ? C.red : C.purple}>{t.status === "failed" ? "FAILED" : "COPY"}</Badge>
                          <span style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                            {t.status === "failed" ? (t.fail_reason || "Execution failed") : (t.provider_name || "—")}
                          </span>
                        </>
                      ) : (
                        <span style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{t.setup || t.notes}</span>
                      )}
                    </span>
                  </div>
                ))}
                </div>
                </div>
              </>
            )}
        </Card>

        {/* Log form */}
        <Card>
          <SectionTitle>Log a Trade</SectionTitle>
          <OkBox msg={ok} />
          <FG label="Pair"><Sel value={form.pair} onChange={F("pair")} options={PAIRS} /></FG>
          <FG label="Direction"><Sel value={form.direction} onChange={F("direction")} options={["BUY","SELL"]} /></FG>
          <Grid cols="1fr 1fr" gap={8}>
            <FG label="Entry Price"><Inp type="number" step=".00001" value={form.entry_price} onChange={F("entry_price")} placeholder="1.08500" /></FG>
            <FG label="Exit Price"><Inp type="number" step=".00001" value={form.exit_price} onChange={F("exit_price")} placeholder="1.09000" /></FG>
            <FG label="Lot Size"><Inp type="number" step=".01" value={form.lot_size} onChange={F("lot_size")} /></FG>
            <FG label="P&L ($)"><Inp type="number" step=".01" value={form.pnl_usd} onChange={F("pnl_usd")} placeholder="5.00" /></FG>
          </Grid>
          <FG label="Pips"><Inp type="number" step=".1" value={form.pnl_pips} onChange={F("pnl_pips")} /></FG>
          <FG label="Emotion"><Sel value={form.emotion} onChange={F("emotion")} options={["calm","confident","fearful","greedy","frustrated"]} /></FG>
          <FG label="Setup / Notes"><Inp rows={2} value={form.notes} onChange={F("notes")} placeholder="What triggered this trade? What did you learn?" /></FG>
          <Btn col={C.gold} full onClick={submit} disabled={busy}>{busy ? "Saving…" : "Log Trade"}</Btn>
        </Card>
      </Grid>
    </div>
  );
}
// ─── Copy Trading ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../utils/constants.jsx";
import { Card, SectionTitle, Stat, Badge, Row, Grid, Btn, FG, Inp, Sel, Modal, useMobile, ErrBox, OkBox } from "../shared/Shared.jsx";
import { ago, fp, f1, usd } from "../utils/utils.js";
import { WS_BASE } from "../api/Api.jsx";
import { useLiveSocket } from "../hooks/useLiveSocket.js";
import { PAIRS } from "../components/Charts.jsx";

const SIGNALS_WS_URL = `${WS_BASE}/ws/signals`;

// Toggleable pill grid so a follower can pick exactly which pairs they want copied
// from a given provider. Empty selection = all pairs (matches backend's `not pf` check).
function PairsFilterPicker({ value, onChange }) {
  const toggle = (pair) => {
    onChange(value.includes(pair) ? value.filter(p => p !== pair) : [...value, pair]);
  };
  return (
    <FG label={`Pairs to copy (${value.length === 0 ? "all pairs" : value.length + " selected"})`}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PAIRS.map(pair => {
          const active = value.includes(pair);
          return (
            <button
              key={pair}
              type="button"
              onClick={() => toggle(pair)}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${active ? C.gold : C.border}`,
                background: active ? `${C.gold}20` : "transparent",
                color: active ? C.gold : C.muted,
              }}
            >
              {pair}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
        Leave everything unselected to copy every pair this provider signals.
      </div>
    </FG>
  );
}

export default function CopyTrading({ api }) {
  const [trades,  setTrades]  = useState([]);
  const [stats,   setStats]   = useState({});
  const [subs,    setSubs]    = useState([]);
  const [editSub, setEditSub] = useState(null);
  const [ef,      setEf]      = useState({});
  const [busy,    setBusy]    = useState(false);
  const debounceRef = useRef(null);

  const load = useCallback(() => {
    api.get("/copy/my-trades").then(d => { setTrades(d.trades || []); setStats(d.stats || {}); }).catch(() => {});
    api.get("/copy/subscriptions").then(d => setSubs(d.subscriptions || [])).catch(() => {});
  }, [api]);

  useEffect(() => { load(); }, [load]);

  // A newly generated signal may auto-fire a copy trade for one of our subscriptions —
  // refresh (debounced) instead of polling so the trade log updates the moment it happens.
  const onSignal = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, 600);
  }, [load]);
  const liveStatus = useLiveSocket(SIGNALS_WS_URL, onSignal);

  const openEdit = sub => {
    setEditSub(sub);
    let pairsFilter = [];
    try { pairsFilter = JSON.parse(sub.pairs_filter || "[]"); } catch { pairsFilter = []; }
    setEf({ risk_pct: sub.risk_pct, max_lot: sub.max_lot, min_confidence: sub.min_confidence, auto_copy: sub.auto_copy, pairs_filter: pairsFilter });
  };

  const saveEdit = async () => {
    setBusy(true);
    // NOTE: previously this always sent pairs_filter: [] here, silently wiping out
    // any pair selection the follower had saved. Now it round-trips ef.pairs_filter.
    try { await api.put(`/copy/subscription/${editSub.provider_id}`, { ...ef, provider_id: editSub.provider_id }); setEditSub(null); load(); }
    catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const unsub = async pid => {
    try { await api.del(`/copy/unsubscribe/${pid}`); load(); } catch (e) { setActionErr(e.message); }
  };

  const navigate = useNavigate();
  const [actionBusy, setActionBusy] = useState(null);
  const [actionErr, setActionErr] = useState("");
  const [confirmCloseId, setConfirmCloseId] = useState(null); // in-app confirm instead of window.confirm (unreliable in Android WebViews)

  const approveTrade = async (id) => {
    setActionBusy(id); setActionErr("");
    try { await api.post(`/copy/trades/${id}/approve`, {}); load(); }
    catch (e) { setActionErr(e.message); }
    finally { setActionBusy(null); }
  };
  const declineTrade = async (id) => {
    setActionBusy(id); setActionErr("");
    try { await api.post(`/copy/trades/${id}/decline`, {}); load(); }
    catch (e) { setActionErr(e.message); }
    finally { setActionBusy(null); }
  };
  const [actionMsg, setActionMsg] = useState("");
  const closeTrade = async (id) => {
    setActionBusy(id); setActionErr(""); setActionMsg(""); setConfirmCloseId(null);
    try {
      const res = await api.post(`/copy/trades/${id}/close`, {});
      if (res.queued) { setActionMsg(res.message); setTimeout(() => setActionMsg(""), 8000); }
      load();
    }
    catch (e) { setActionErr(e.message); }
    finally { setActionBusy(null); }
  };
  const viewChart = (t) => navigate(`/prices?pair=${t.pair}&copyTradeId=${t.id}`);

  const statusColor = { open: C.green, pending: C.gold, pending_bridge: C.gold, sent_to_bridge: C.blue,
                         close_requested: C.gold, close_sent_to_bridge: C.blue, closed: C.muted, failed: C.red };
  const mobile = useMobile();

  return (
    <div style={{ padding: mobile ? 12 : 20 }}>
      <ErrBox msg={actionErr} />
      {actionMsg && <OkBox msg={actionMsg} />}
      <Grid cols="repeat(5,minmax(0,1fr))" mobileCols="repeat(2,minmax(0,1fr))" gap={12} style={{ marginBottom: 18 }}>
        <Stat label="Total Trades" value={stats.total  || 0}                        color={C.blue} />
        <Stat label="Open"         value={stats.open   || 0}                        color={C.gold} />
        <Stat label="Wins"         value={stats.wins   || 0}                         color={C.green} />
        <Stat label="Losses"       value={stats.losses || 0}                         color={C.red} />
        <Stat label="Total P&L"    value={usd(stats.total_pnl_usd)}                  color={(stats.total_pnl_usd || 0) >= 0 ? C.green : C.red} />
      </Grid>

      {/* Active subscriptions */}
      {subs.length > 0 && (
        <Card>
          <SectionTitle>Active Subscriptions</SectionTitle>
          {subs.map(sub => (
            <Row key={sub.provider_id} style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <strong style={{ flex: 1, fontSize: 13 }}>{sub.display_name}</strong>
              <span style={{ fontSize: 11, color: C.muted }}>WR {sub.win_rate}%</span>
              <span style={{ fontSize: 11, color: C.muted }}>Risk {sub.risk_pct}%</span>
              <Badge col={sub.auto_copy ? C.green : C.gold}>{sub.auto_copy ? "AUTO" : "MANUAL"}</Badge>
              <Btn col={C.gold}  ghost onClick={() => openEdit(sub)}  style={{ padding: "4px 10px", fontSize: 10 }}>Edit</Btn>
              <Btn col={C.red}   ghost onClick={() => unsub(sub.provider_id)} style={{ padding: "4px 10px", fontSize: 10 }}>Unsubscribe</Btn>
            </Row>
          ))}
        </Card>
      )}

      {/* Manual-mode signals awaiting your approval before they open */}
      {trades.some(t => t.status === "pending_approval") && (
        <Card style={{ borderColor: C.gold, marginBottom: 18 }}>
          <SectionTitle>⏳ Awaiting Your Approval</SectionTitle>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
            You're following in manual mode — these signals haven't opened yet. Approve to reserve margin and go live, or decline to skip.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {trades.filter(t => t.status === "pending_approval").map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                                        border: `1px solid ${C.gold}40`, borderRadius: 8, padding: 10 }}>
                <strong>{t.pair}</strong>
                <Badge col={t.direction === "BUY" ? C.green : C.red}>{t.direction}</Badge>
                <span style={{ fontSize: 11, color: C.muted }}>{t.provider_name}</span>
                <span style={{ fontSize: 11, fontFamily: "monospace" }}>Entry ~{fp(t.entry_price)}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <Btn col={C.green} onClick={() => approveTrade(t.id)} disabled={actionBusy === t.id} style={{ padding: "5px 12px", fontSize: 11 }}>
                    {actionBusy === t.id ? "…" : "Approve"}
                  </Btn>
                  <Btn col={C.muted} ghost onClick={() => declineTrade(t.id)} disabled={actionBusy === t.id} style={{ padding: "5px 12px", fontSize: 11 }}>
                    Decline
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Trade history table */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SectionTitle>Copy Trade History ({trades.filter(t => t.status !== "pending_approval").length})</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.muted, marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: liveStatus === "open" ? C.green : C.muted, boxShadow: liveStatus === "open" ? `0 0 6px ${C.green}` : "none" }} />
            {liveStatus === "open" ? "Live" : "Reconnecting…"}
          </div>
        </div>
        {trades.filter(t => t.status !== "pending_approval").length === 0
          ? <div style={{ color: C.muted, fontSize: 12, padding: "12px 0" }}>No copy trades yet — subscribe to a provider in the Providers tab, or copy a signal directly</div>
          : mobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {trades.filter(t => t.status !== "pending_approval").map(t => (
                <div key={t.id} onClick={() => viewChart(t)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong style={{ fontSize: 13 }}>{t.pair}</strong>
                      <Badge col={t.direction === "BUY" ? C.green : C.red}>{t.direction}</Badge>
                    </div>
                    <Badge col={statusColor[t.status] || C.muted}>{(t.status || "").toUpperCase()}</Badge>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{t.provider_name || "—"}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, fontSize: 11, marginBottom: 6 }}>
                    <div><div style={{ color: C.muted, fontSize: 9 }}>ENTRY</div><span style={{ fontFamily: "monospace" }}>{fp(t.entry_price)}</span></div>
                    <div><div style={{ color: C.muted, fontSize: 9 }}>SL</div><span style={{ fontFamily: "monospace", color: C.red }}>{fp(t.stop_loss)}</span></div>
                    <div><div style={{ color: C.muted, fontSize: 9 }}>TP</div><span style={{ fontFamily: "monospace", color: C.green }}>{fp(t.take_profit)}</span></div>
                    <div><div style={{ color: C.muted, fontSize: 9 }}>Lot Size</div><span style={{ fontFamily: "monospace", color: C.gold }}>{fp(t.lot_size)}</span></div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: Number(t.pnl_usd) >= 0 ? C.green : C.red }}>{usd(t.pnl_usd)} · <span style={{ color: Number(t.pnl_pips) >= 0 ? C.green : C.red }}>{f1(t.pnl_pips)}p</span></span>
                    <Badge col={t.execution_mode === "mt5" ? C.purple : C.muted}>{t.execution_mode === "mt5" ? "MT5" : "SIM"}</Badge>
                  </div>
                  {t.status === "open" && (
                    confirmCloseId === t.id ? (
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }} onClick={e => e.stopPropagation()}>
                        <Btn col={C.red} onClick={() => closeTrade(t.id)} disabled={actionBusy === t.id} style={{ flex: 1, fontSize: 11, padding: "5px 0" }}>
                          {actionBusy === t.id ? "Closing…" : "Confirm Close"}
                        </Btn>
                        <Btn col={C.muted} ghost onClick={() => setConfirmCloseId(null)} style={{ flex: 1, fontSize: 11, padding: "5px 0" }}>Cancel</Btn>
                      </div>
                    ) : (
                      <Btn col={C.red} ghost onClick={(e) => { e.stopPropagation(); setConfirmCloseId(t.id); }} disabled={actionBusy === t.id}
                           style={{ marginTop: 8, width: "100%", fontSize: 11, padding: "5px 0" }}>
                        Close Trade
                      </Btn>
                    )
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "70px 50px 100px 85px 85px 75px 75px 75px 75px 70px 60px 80px", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.muted, letterSpacing: 1, fontWeight: 700 }}>
                {["PAIR","DIR","PROVIDER","ENTRY","SL","TP","LOT SIZE","P&L $","PIPS","STATUS","MODE",""].map(h => <span key={h}>{h}</span>)}
              </div>
              {trades.filter(t => t.status !== "pending_approval").map(t => (
                <div key={t.id} onClick={() => viewChart(t)} style={{ display: "grid", gridTemplateColumns: "70px 50px 100px 85px 85px 75px 75px 75px 75px 70px 60px 80px", gap: 8, padding: "9px 0", borderBottom: `1px solid ${C.border}20`, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
                  <strong>{t.pair}</strong>
                  <Badge col={t.direction === "BUY" ? C.green : C.red}>{t.direction}</Badge>
                  <span style={{ fontSize: 11, color: C.muted }}>{t.provider_name || "—"}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 11 }}>{fp(t.entry_price)}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: C.red }}>{fp(t.stop_loss)}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: C.green }}>{fp(t.take_profit)}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: C.gold }}>{fp(t.lot_size)}</span>
                  <span style={{ fontWeight: 700, color: Number(t.pnl_usd) >= 0 ? C.green : C.red }}>{usd(t.pnl_usd)}</span>
                  <span style={{ color: Number(t.pnl_pips) >= 0 ? C.green : C.red }}>{f1(t.pnl_pips)}p</span>
                  <Badge col={statusColor[t.status] || C.muted}>{(t.status || "").toUpperCase()}</Badge>
                  <span title={t.mt5_ticket ? `MT5 ticket #${t.mt5_ticket}` : ""}>
                    <Badge col={t.execution_mode === "mt5" ? C.purple : C.muted}>{t.execution_mode === "mt5" ? "MT5" : "SIM"}</Badge>
                  </span>
                  {t.status === "open" ? (
                    confirmCloseId === t.id ? (
                      <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                        <Btn col={C.red} onClick={() => closeTrade(t.id)} disabled={actionBusy === t.id} style={{ fontSize: 10, padding: "4px 6px" }}>
                          {actionBusy === t.id ? "…" : "Sure?"}
                        </Btn>
                        <Btn col={C.muted} ghost onClick={() => setConfirmCloseId(null)} style={{ fontSize: 10, padding: "4px 6px" }}>✕</Btn>
                      </div>
                    ) : (
                      <Btn col={C.red} ghost onClick={(e) => { e.stopPropagation(); setConfirmCloseId(t.id); }} disabled={actionBusy === t.id}
                           style={{ fontSize: 10, padding: "4px 8px" }}>
                        Close
                      </Btn>
                    )
                  ) : <span />}
                </div>
              ))}
            </>
          )}
      </Card>

      {/* Edit modal */}
      {editSub && (
        <Modal onClose={() => setEditSub(null)}>
          <SectionTitle>Edit Settings — {editSub.display_name}</SectionTitle>
          <FG label="Risk per trade (%)"><Inp type="number" min=".5" max="10" step=".5" value={ef.risk_pct} onChange={e => setEf(p => ({ ...p, risk_pct: +e.target.value }))} /></FG>
          <FG label="Max lot size"><Inp type="number" min=".01" max="1" step=".01" value={ef.max_lot} onChange={e => setEf(p => ({ ...p, max_lot: +e.target.value }))} /></FG>
          <FG label="Min confidence (%)"><Inp type="number" min="50" max="95" value={ef.min_confidence} onChange={e => setEf(p => ({ ...p, min_confidence: +e.target.value }))} /></FG>
          <FG label="Auto copy"><Sel value={ef.auto_copy ? "1" : "0"} onChange={e => setEf(p => ({ ...p, auto_copy: e.target.value === "1" }))} options={[{ v: "1", l: "Yes — Automatic" }, { v: "0", l: "No — Manual" }]} /></FG>
          <PairsFilterPicker value={ef.pairs_filter || []} onChange={pf => setEf(p => ({ ...p, pairs_filter: pf }))} />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn col={C.gold} onClick={saveEdit} disabled={busy}>{busy ? "Saving…" : "Save Changes"}</Btn>
            <Btn col={C.muted} ghost onClick={() => setEditSub(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PricesPage.jsx
// Stylish Live Prices + TradingView-style Chart Layout
// Real-time via /ws/prices (market list) and /ws/candles (selected chart)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useSearchParams } from "react-router-dom";
import { C } from "../utils/constants.jsx";
import {
  Card,
  SectionTitle,
  ChartWrap,
  FG,
  Sel,
  Btn,
  Badge,
  OkBox,
  ErrBox,
  useMobile,
} from "../shared/Shared.jsx";

import { fp, fpc, f2, usd } from "../utils/utils.js";
import { CandleChart1, PAIRS, FOREX_PAIRS, TFS, pairDecimals } from "../components/Charts.jsx";
import { WS_BASE } from "../api/Api.jsx";
import { useLiveSocket } from "../hooks/useLiveSocket.js";
import { loadMarketPrefs, useSyncedMarketPrefs } from "../utils/marketPrefs.js";
import PairPicker from "../shared/PairPicker.jsx";

export default function PricesPage({ api }) {
  const [searchParams] = useSearchParams();
  const { prefs, setWatchlist, setTimeframe, setIndicators } = useSyncedMarketPrefs(api, true);
  const watchlistPairs = prefs.watchlist; // user's saved "desired markets" — set from Dashboard/here, synced to their account
  const pricesWsUrl = `${WS_BASE}/ws/prices?pairs=${watchlistPairs.join(",")}`;
  const [prices, setPrices] = useState([]);
  const [selP, setSelP] = useState(() => searchParams.get("pair") || prefs.watchlist[0] || "EURUSD");
  const [selTf, setSelTfRaw] = useState(() => loadMarketPrefs().timeframe);
  const setSelTf = useCallback((tf) => { setSelTfRaw(tf); setTimeframe(tf); }, [setTimeframe]);
  const [tfPickerOpen, setTfPickerOpen] = useState(false);
  const [bars, setBars] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [sr, setSr] = useState([]);
  const [trendline, setTrendline] = useState(null);
  const [liveCandle, setLiveCandle] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(true); // mobile toggle — "Live Markets" panel can be collapsed to give the chart more room
  const [pairPickerOpen, setPairPickerOpen] = useState(false);
  const ind = prefs.indicators;
  const setInd = setIndicators;
  const [tradePanel, setTradePanel] = useState(false);
  const [lot, setLot] = useState(0.02);
  const [slPips, setSlPips] = useState(30);
  const [tpPips, setTpPips] = useState(60);
  const [tradeBusy, setTradeBusy] = useState(false);
  const [tradeMsg, setTradeMsg] = useState("");
  const [tradeErr, setTradeErr] = useState("");
  const [copyTrade, setCopyTrade] = useState(null); // the specific trade Dashboard linked here to show progress for
  const loadChartRef = useRef(null);
  const mobile = useMobile();
  const copyTradeId = searchParams.get('copyTradeId');
  const [selectedTradeId, setSelectedTradeId] = useState(copyTradeId || null);

  // Deep link from Dashboard: /prices?pair=EURUSD&copyTradeId=44 — show that trade's progress
  //const [copyTradeId, setCopyTradeId] = useState(() => searchParams.get("copyTradeId") || null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjSl, setAdjSl] = useState("");
  const [adjTp, setAdjTp] = useState("");
  const [ctBusy, setCtBusy] = useState(false);
  const [ctErr, setCtErr] = useState("");
  const [ctMsg, setCtMsg] = useState("");
  const [trades, setTrades] = useState([]);



  const loadCopyTrade = useCallback(() => {
    if (!selectedTradeId) return;
    api.get("/copy/my-trades").then(d => {
      const t = (d.trades || []).find(x => String(x.id) === selectedTradeId);
      if (t) {
        setCopyTrade(t);
        setAdjSl(String(t.stop_loss ?? ""));
        setAdjTp(String(t.take_profit ?? ""));
      }
    }).catch(() => { });
  }, [selectedTradeId, api]);

  // add all trades of the current pairs that are still active shown here in chart from the load of my trades
  const load = useCallback(() => {
    api.get("/copy/my-trades").then(d => { setTrades(d.trades || []); }).catch(() => { });
  }, [api]);

  useEffect(() => { load(); }, [load]);

  // Keep trades fresh without a manual refresh — this is what makes a trade
  // opened elsewhere (or hit its SL/TP and closed) auto show/hide on the chart.
  useEffect(() => {
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  // list active copy trades of the current pairs active selected by user
  const activeTrades = trades.filter(t => t.status === "open" && t.pair === selP);
  const allOpenTrades = trades.filter(t => t.status === "open");
  const [watchlistFilter, setWatchlistFilter] = useState("all"); // "all" | "active" — Live Markets panel toggle

  useEffect(() => {
    if (!selectedTradeId) { setCopyTrade(null); return; }
    loadCopyTrade();
    // Poll for live price/P&L while the position is open — stop once it's closed
    // (or the deep link changes) so we're not hammering the endpoint forever.
    const iv = setInterval(() => {
      setCopyTrade(prev => {
        if (prev && prev.status !== "open") { clearInterval(iv); return prev; }
        loadCopyTrade();
        return prev;
      });
    }, 4000);
    return () => clearInterval(iv);
  }, [selectedTradeId, loadCopyTrade]);

  const closeCopyTrade = async () => {
    if (!selectedTradeId) return;
    setCtBusy(true); setCtErr(""); setCtMsg("");
    try {
      const res = await api.post(`/copy/trades/${copyTrade.id}/close`, {});
      if (res.queued) setCtMsg(res.message);
      loadCopyTrade();
    } catch (e) { setCtErr(e.message); }
    finally { setCtBusy(false); }
  };

  const adjustCopyTrade = async () => {
    if (!selectedTradeId) return;
    setCtBusy(true); setCtErr(""); setCtMsg("");
    try {
      const res = await api.put(`/copy/trades/${selectedTradeId}/adjust`, {
        stop_loss: adjSl ? Number(adjSl) : null,
        take_profit: adjTp ? Number(adjTp) : null,
      });
      setCtMsg(res.queued ? res.message : "SL/TP updated.");
      setAdjustOpen(false);
      loadCopyTrade();
    } catch (e) { setCtErr(e.message); console.log(e) }
    finally { setCtBusy(false); }
  };

  // Called once when the user releases a dragged SL/TP line on the chart itself.
  const adjustCopyTradeFromChart = async (type, price) => {
    if (!selectedTradeId) return;
    setCtBusy(true); setCtErr(""); setCtMsg("");
    try {
      const res = await api.put(`/copy/trades/${selectedTradeId}/adjust`, {
        stop_loss: type === "sl" ? price : null,
        take_profit: type === "tp" ? price : null,
      });
      setCtMsg(res.queued ? res.message : `${type.toUpperCase()} updated to ${price}.`);
      loadCopyTrade();
    } catch (e) { setCtErr(e.message); loadCopyTrade(); /* snap the line back to the real value */ }
    finally { setCtBusy(false); }
  };

  // ── Live market watchlist (left panel) — uses the saved "desired markets" list ──
  const onPricesMsg = useCallback((d) => {
    if (d?.type === "prices" && Array.isArray(d.data)) setPrices(d.data);
  }, []);
  const priceStatus = useLiveSocket(pricesWsUrl, onPricesMsg);

  useEffect(() => {
    setPrices([]); // stale entries from the previous watchlist shouldn't linger
    api.get("/prices/live?pairs=" + watchlistPairs.join(","))
      .then((d) => setPrices(d.prices || []))
      .catch(() => { });
  }, [api, watchlistPairs.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // (timeframe/indicator changes now persist via setSelTf/setInd → useSyncedMarketPrefs, no separate effect needed)

  // Clear the old pair/timeframe's data the instant the user switches — otherwise
  // the previous chart just sits there frozen (mislabeled with the new pair)
  // until the REST fetch below resolves, with no indication anything is loading.
  useEffect(() => {
    setBars([]);
    setMarkers([]);
    setSr([]);
    setTrendline(null);
  }, [selP, selTf]);

  // ── Chart data (REST — full bar history + annotations) ──
  const loadChart = useCallback(async () => {
    setBusy(true);
    try {
      const d = await api.get(`/prices/chart?pair=${selP}&timeframe=${selTf}&candles=150`);
      setBars(d.candles || []);
      setMarkers(d.markers || []);
      setSr(d.support_resistance || []);
      setTrendline(d.trendline || null);
    } catch (e) {
      console.error(e.message);
    } finally {
      setBusy(false);
    }
  }, [api, selP, selTf]);
  loadChartRef.current = loadChart;

  useEffect(() => { loadChart(); }, [loadChart]);

  // ── Live candle stream for the pair/timeframe currently on screen ──
  const candleWsUrl = `${WS_BASE}/ws/candles?pair=${selP}&timeframe=${selTf}`;
  const onCandleMsg = useCallback((d) => {
    if (d?.type === "candle_update" && d.candle) {
      setLiveCandle(d.candle);
    } else if (d?.type === "candle_closed") {
      // Fresh closed bar formed — pull fresh history set safely
      if (loadChartRef.current) {
        loadChartRef.current();
      }
    }
  }, []);

  const candleStatus = useLiveSocket(candleWsUrl, onCandleMsg);

  const placeQuickTrade = async (direction) => {
    setTradeBusy(true); setTradeErr(""); setTradeMsg("");
    try {
      const res = await api.post("/trades/quick", { pair: selP, direction, lot_size: lot, sl_pips: slPips, tp_pips: tpPips });
      setTradeMsg(`✓ ${direction} ${selP} placed at ${res.entry_price} (SL ${res.stop_loss} / TP ${res.take_profit})`);
      setTimeout(() => setTradeMsg(""), 6000);
    } catch (e) { setTradeErr(e.message); }
    finally { setTradeBusy(false); }
  };

  return (
    <div
      style={{
        padding: mobile ? 10 : 20,
        display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "1fr",
        gap: mobile ? 12 : 18,
        minHeight: "60vh",
        background: "#071018",
        boxSizing: "border-box",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      {/* ───────── LEFT MARKET PANEL ───────── */}
      <Card
        style={{
          padding: 14,
          background: "#0b1723",
          border: "1px solid #1f2937",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <SectionTitle>Live Markets</SectionTitle>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setPairPickerOpen(true)}
              title="Search all pairs / manage watchlist"
              style={{ background: "none", border: "1px solid #1f2937", borderRadius: 6, color: C.gold, fontSize: 11, padding: "4px 9px", cursor: "pointer", fontWeight: 700 }}
            >
              + Add pairs
            </button>
            <div style={{ display: "flex", background: "#0f172a", border: "1px solid #1f2937", borderRadius: 7, padding: 2 }}>
              <button
                onClick={() => setWatchlistFilter("all")}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 5, border: "none", cursor: "pointer",
                  background: watchlistFilter === "all" ? C.gold : "transparent",
                  color: watchlistFilter === "all" ? "#071018" : "#94a3b8",
                }}
              >
                All
              </button>
              <button
                onClick={() => setWatchlistFilter("active")}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 5, border: "none", cursor: "pointer",
                  background: watchlistFilter === "active" ? C.gold : "transparent",
                  color: watchlistFilter === "active" ? "#071018" : "#94a3b8",
                }}
              >
                Active trades ({allOpenTrades.length})
              </button>
            </div>
            {mobile && (
              <button
                onClick={() => setShowWatchlist(s => !s)}
                style={{ background: "none", border: `1px solid #1f2937`, borderRadius: 6, color: "#94a3b8", fontSize: 11, padding: "4px 9px", cursor: "pointer" }}
              >
                {showWatchlist ? "Hide ▲" : "Show ▼"}
              </button>
            )}
            <div
              title={priceStatus === "open" ? "Live" : "Reconnecting…"}
              style={{
                width: 10,
                height: 10,
                borderRadius: 99,
                background: priceStatus === "open" ? "#22c55e" : "#475569",
                boxShadow: priceStatus === "open" ? "0 0 10px #22c55e" : "none",
                transition: "all .3s",
              }}
            />
          </div>
        </div>

        {(!mobile || showWatchlist) && <div
          style={{
            display: "flex",
            flexDirection: mobile ? "row" : "row",
            gap: 20,
            maxHeight: mobile ? "60vh" : "90vh",
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {(watchlistFilter === "active" ? prices.filter(p => allOpenTrades.some(t => t.pair === p.pair)) : prices).map((p) => {
            const up = p.direction === "up";

            return (
              <div
                key={p.pair}
                onClick={() => setSelP(p.pair)}
                style={{
                  padding: 10,
                  borderRadius: 14,
                  cursor: "pointer",
                  transition: "all .2s ease",
                  minWidth: "200px",
                  background:
                    selP === p.pair
                      ? "linear-gradient(135deg,#172554,#0f172a)"
                      : "#0f172a",

                  border:
                    selP === p.pair
                      ? "1px solid #facc15"
                      : "1px solid #1e293b",

                  boxShadow:
                    selP === p.pair
                      ? "0 0 18px rgba(250,204,21,.15)"
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: "#fff",
                    }}
                  >
                    {p.pair}
                  </div>

                  <div
                    style={{
                      color: up ? "#22c55e" : "#ef4444",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {fpc(p.change_pct)}
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#f8fafc",
                    marginBottom: 12,
                  }}
                >
                  {fp(p.price, pairDecimals(p.pair))}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    fontSize: 11,
                  }}
                >
                  <div
                    style={{
                      background: "#111827",
                      padding: 8,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ color: "#94a3b8" }}>Bid</div>
                    <div style={{ color: "#22c55e" }}>
                      {fp(p.bid, pairDecimals(p.pair))}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#111827",
                      padding: 8,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ color: "#94a3b8" }}>Ask</div>
                    <div style={{ color: "#ef4444" }}>
                      {fp(p.ask, pairDecimals(p.pair))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#64748b",
                    fontSize: 11,
                  }}
                >
                  <span>Spread {p.spread}p</span>
                  <span>{p.source}</span>
                </div>
              </div>
            );
          })}
        </div>}
      </Card>

      {/* ───────── RIGHT CHART PANEL ───────── */}
      <Card
        style={{
          background: "#0b1723",
          border: "1px solid #1f2937",
          padding: mobile ? 12 : 18,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >

          <div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              {selP} <Badge col={C.gold}>{activeTrades.length} active trades</Badge> <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>· {pairDecimals(selP)}dp</span>
            </div>

            <div
              style={{
                color: "#94a3b8",
                marginTop: 4,
                fontSize: 13,
              }}
            >
              EMA20 · EMA50 · Bollinger Bands · S/R · Trendline · Volume
            </div>
          </div>


          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 130 }}>
              <FG label="Pair">
                <Sel
                  value={selP}
                  onChange={(e) => setSelP(e.target.value)}
                  options={PAIRS}
                />
              </FG>
            </div>

            {!mobile && (
              <div style={{ position: "relative" }}>
                <FG label="Timeframe">
                  <button
                    onClick={() => setTfPickerOpen(v => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px",
                      background: "#111827", border: `1px solid ${tfPickerOpen ? C.gold : "#1e293b"}`,
                      borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", minWidth: 70, justifyContent: "space-between",
                    }}
                  >
                    {selTf} <span style={{ fontSize: 9, color: C.muted }}>▼</span>
                  </button>
                </FG>
              </div>
            )}

            {tfPickerOpen && (
              <>
                <div onClick={() => setTfPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: mobile ? "rgba(0,0,0,0.5)" : "transparent" }} />
                <div style={{
                  position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 91,
                  background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
                  padding: 14, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.6)", width: mobile ? "80vw" : 260,
                }}>
                  <div style={{ gridColumn: "1/-1", fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>SELECT TIMEFRAME</div>
                  {TFS.map(tf => (
                    <button
                      key={tf}
                      onClick={() => { setSelTf(tf); setTfPickerOpen(false); }}
                      style={{
                        padding: "12px 4px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                        border: `1px solid ${tf === selTf ? C.gold : "#1e293b"}`,
                        background: tf === selTf ? `${C.gold}22` : "#111827",
                        color: tf === selTf ? C.gold : "#cbd5e1",
                      }}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </>
            )}

            <Btn
              col={C.gold}
              onClick={loadChart}
              disabled={busy}
            >
              {/*busy ? "Loading..." : "Refresh"*/}
            </Btn>

            {FOREX_PAIRS.includes(selP) && (
              <Btn col={tradePanel ? C.muted : C.green} ghost={tradePanel} onClick={() => setTradePanel(v => !v)}>
                {tradePanel ? "Close Trade Panel" : "📈 Place Trade"}
              </Btn>
            )}
          </div>
        </div>

        {selectedTradeId && (
          <div style={{
            background: `${C.gold}14`, border: `1px solid ${C.gold}40`, borderRadius: 8,
            padding: 12, marginBottom: 16, fontSize: 12
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                Tracking copy trade #{copyTrade.id} — {copyTrade.pair} {copyTrade.direction} · {(copyTrade.status || "").toUpperCase()}
                <Badge col={copyTrade.execution_mode === "mt5" ? C.purple : C.muted}>{copyTrade.execution_mode === "mt5" ? "MT5 · REAL" : "SIMULATED"}</Badge>
              </div>
              {copyTrade.status === "open" && (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn col={C.gold} ghost onClick={() => setAdjustOpen(v => !v)} style={{ fontSize: 11, padding: "4px 10px" }}>Adjust SL/TP</Btn>
                  <Btn col={C.red} onClick={closeCopyTrade} disabled={ctBusy} style={{ fontSize: 11, padding: "4px 10px" }}>
                    {ctBusy ? "…" : "Close"}
                  </Btn>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#94a3b8" }}>
              <span>Entry: <strong style={{ color: "#fff" }}>{fp(copyTrade.entry_price, pairDecimals(copyTrade.pair))}</strong></span>
              {copyTrade.status === "open" && copyTrade.current_price && (
                <span>Current: <strong style={{ color: "#fff" }}>{fp(copyTrade.current_price, pairDecimals(copyTrade.pair))}</strong></span>
              )}
              <span>SL: <strong style={{ color: C.red }}>{fp(copyTrade.stop_loss, pairDecimals(copyTrade.pair))}</strong></span>
              <span>TP: <strong style={{ color: C.green }}>{fp(copyTrade.take_profit, pairDecimals(copyTrade.pair))}</strong></span>
              <span>{copyTrade.status === "open" ? "Floating P&L" : "P&L"}: <strong style={{ color: copyTrade.pnl_usd >= 0 ? C.green : C.red }}>
                {usd(copyTrade.pnl_usd)}{copyTrade.pnl_pips != null ? ` (${copyTrade.pnl_pips >= 0 ? "+" : ""}${copyTrade.pnl_pips}p)` : ""}
              </strong></span>
            </div>

            {ctMsg && <div style={{ marginTop: 8, color: C.gold }}>{ctMsg}</div>}
            <ErrBox msg={ctErr} />

            {adjustOpen && copyTrade.status === "open" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ width: 130 }}>
                  <FG label="New SL"><input type="number" step="0.00001" value={adjSl} onChange={e => setAdjSl(e.target.value)}
                    style={{ width: "100%", padding: 7, background: "#111827", border: "1px solid #1e293b", borderRadius: 6, color: "#fff", fontSize: 12, boxSizing: "border-box" }} /></FG>
                </div>
                <div style={{ width: 130 }}>
                  <FG label="New TP"><input type="number" step="0.00001" value={adjTp} onChange={e => setAdjTp(e.target.value)}
                    style={{ width: "100%", padding: 7, background: "#111827", border: "1px solid #1e293b", borderRadius: 6, color: "#fff", fontSize: 12, boxSizing: "border-box" }} /></FG>
                </div>
                <Btn col={C.gold} onClick={adjustCopyTrade} disabled={ctBusy}>{ctBusy ? "…" : "Save"}</Btn>
              </div>
            )}
          </div>
        )}

        {tradePanel && (
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ width: 90 }}><FG label="Lot size"><input type="number" step="0.01" value={lot} onChange={e => setLot(Number(e.target.value))}
                style={{ width: "100%", padding: 8, background: "#111827", border: "1px solid #1e293b", borderRadius: 6, color: "#fff", fontSize: 12, boxSizing: "border-box" }} /></FG></div>
              <div style={{ width: 90 }}><FG label="SL pips"><input type="number" value={slPips} onChange={e => setSlPips(Number(e.target.value))}
                style={{ width: "100%", padding: 8, background: "#111827", border: "1px solid #1e293b", borderRadius: 6, color: "#fff", fontSize: 12, boxSizing: "border-box" }} /></FG></div>
              <div style={{ width: 90 }}><FG label="TP pips"><input type="number" value={tpPips} onChange={e => setTpPips(Number(e.target.value))}
                style={{ width: "100%", padding: 8, background: "#111827", border: "1px solid #1e293b", borderRadius: 6, color: "#fff", fontSize: 12, boxSizing: "border-box" }} /></FG></div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <Btn col={C.green} onClick={() => placeQuickTrade("BUY")} disabled={tradeBusy}>{tradeBusy ? "…" : "BUY"}</Btn>
                <Btn col={C.red} onClick={() => placeQuickTrade("SELL")} disabled={tradeBusy}>{tradeBusy ? "…" : "SELL"}</Btn>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>
              Fills at the current market price and deducts margin from your balance immediately — this is a real position, not a preview.
            </div>
            {tradeMsg && <OkBox msg={tradeMsg} />}
            <ErrBox msg={tradeErr} />
          </div>
        )}

        {/* Indicator toggles */}
        <div
          style={{
            display: "flex",
            gap: mobile ? 10 : 18,
            marginBottom: 14,
            flexWrap: "wrap",
            fontSize: 12,
          }}
        >
          <IndToggle on={ind.ema} onClick={() => setInd(p => ({ ...p, ema: !p.ema }))} colors={["#facc15", "#a855f7"]} label="EMA 20/50" />
          <IndToggle on={ind.bb} onClick={() => setInd(p => ({ ...p, bb: !p.bb }))} colors={["#60a5fa", "#3b82f6"]} label="Bollinger Bands" />
          <IndToggle on={ind.sr} onClick={() => setInd(p => ({ ...p, sr: !p.sr }))} colors={["#fb7185", "#34d399"]} label="Support / Resistance" />
          <IndToggle on={ind.trendline} onClick={() => setInd(p => ({ ...p, trendline: !p.trendline }))} colors={["#22c55e"]} label="Trendline" />
          <IndToggle on={ind.volume} onClick={() => setInd(p => ({ ...p, volume: !p.volume }))} colors={["#3d9eff"]} label="Volume" />
        </div>

        {/* Chart */}
        <ChartWrap>
          <div style={{ position: "relative" }}>
            {/* Notice the opacity background change so it doesn't create a pitch-black flicker */}
            {(busy || !bars.length) && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 10,
                background: "rgba(11, 23, 35, 0.6)", borderRadius: 18, // Match your card background color instead of absolute black (#071018)
                backdropFilter: "blur(2px)" // Soft blur looks cleaner than a disappearing component
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  border: `3px solid ${C.border}`, borderTopColor: C.gold,
                  animation: "spin 0.8s linear infinite",
                }} />
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Loading {selP} · {selTf}…</span>
              </div>
            )}
            <CandleChart1
              bars={bars}
              resetKey={`${selP}_${selTf}`}
              pair={selP}
              timeframe={selTf}
              api={api}
              onTfClick={() => setTfPickerOpen(true)}
              height={mobile ? 380 : 560}
              entry={copyTrade?.entry_price}
              sl={copyTrade?.stop_loss}
              tp={copyTrade?.take_profit}
              markers={markers}
              supportResistance={sr}
              trendline={trendline}
              liveCandle={liveCandle}
              live={candleStatus === "open"}
              indicators={ind}
              draggableSlTp={!!copyTrade && copyTrade.status === "open"}
              onAdjustSlTp={adjustCopyTradeFromChart}
              trades={activeTrades}
              selectedTradeId={selectedTradeId}
              onTradeSelect={(trade) => {
                setCopyTrade(trade);
                setSelectedTradeId(trade.id);
                setAdjSl(String(trade.stop_loss ?? ""));
                setAdjTp(String(trade.take_profit ?? ""));
              }

              }
            />
          </div>
        </ChartWrap>
      </Card>

      {pairPickerOpen && (
        <PairPicker
          api={api}
          watchlist={watchlistPairs}
          onToggle={(pair) => setWatchlist((prev) => prev.includes(pair) ? prev.filter((p) => p !== pair) : [...prev, pair])}
          onClose={() => setPairPickerOpen(false)}
        />
      )}
    </div>
  );
}


function IndToggle({ on, onClick, colors, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        color: on ? "#cbd5e1" : "#475569",
        background: on ? "#111827" : "transparent",
        border: `1px solid ${on ? "#1e293b" : "transparent"}`,
        borderRadius: 999,
        padding: "5px 10px",
        cursor: "pointer",
        fontSize: 12,
      }}
    >
      <span style={{ display: "flex", gap: 2 }}>
        {colors.map((c, i) => (
          <span key={i} style={{ width: 10, height: 3, borderRadius: 999, background: on ? c : "#334155" }} />
        ))}
      </span>
      {label}
    </button>
  );
}

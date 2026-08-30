// ─── Dashboard ────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../utils/constants.jsx";
import { Card, SectionTitle, Stat, Badge, Row, Grid } from "../shared/Shared.jsx";
import { ago, fp, f2, fpc, usd } from "../utils/utils.js";
import { useLiveSocket } from "../hooks/useLiveSocket.js";
import { WS_BASE } from "../api/Api.jsx";
import { TFS } from "../components/Charts.jsx";
import { useSyncedMarketPrefs } from "../utils/marketPrefs.js";
import PairPicker from "../shared/PairPicker.jsx";

export default function Dashboard({ api }) {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [prices, setPrices] = useState([]);
    const [signals, setSignals] = useState([]);
    const [copies, setCopies] = useState([]);
    const [notifs, setNotifs] = useState([]);
    const { prefs, setWatchlist, setTimeframe, setIndicators } = useSyncedMarketPrefs(api, true);
    const [pairPickerOpen, setPairPickerOpen] = useState(false);
    const [editingDefaults, setEditingDefaults] = useState(false);
    const watchlist = prefs.watchlist;
    const pricesWsUrl = `${WS_BASE}/ws/prices?pairs=${watchlist.join(",")}`;
    const mobile = window.innerWidth < 768;

    useEffect(() => {
        api.get("/dashboard/stats").then(setStats).catch(() => { });
        api.get(`/prices/live?pairs=${watchlist.join(",")}`).then(d => setPrices(d.prices || [])).catch(() => { });
        api.get("/signals/latest?limit=8").then(d => setSignals(d.signals || [])).catch(() => { });
        api.get("/copy/my-trades").then(d => setCopies((d.trades || []).slice(0, 6))).catch(() => { });
        api.get("/notifications").then(d => setNotifs((d.notifications || []).slice(0, 6))).catch(() => { });
        const t = setInterval(() => {
            api.get("/dashboard/stats").then(setStats).catch(() => { });
        }, 15000);
        return () => clearInterval(t);
    }, [api, watchlist.join(",")]);

    const onPricesMsg = useCallback((d) => {
        if (d?.type === "prices" && Array.isArray(d.data)) setPrices(d.data);
    }, []);
    const priceStatus = useLiveSocket(pricesWsUrl, onPricesMsg);

    const toggleWatchPair = (pr) => {
        setWatchlist((prev) => {
            const has = prev.includes(pr);
            const next = has ? prev.filter((x) => x !== pr) : [...prev, pr];
            return next.length ? next : prev; // never allow an empty watchlist
        });
    };

    return (
        <div style={{ padding: mobile ? 12 : 20, maxWidth: "100%", marginBottom: 100, boxSizing: "border-box" }}>

            {/* ── Account overview ── */}
            {stats && (
                <Grid cols="repeat(4,minmax(0,1fr))" mobileCols="1fr 1fr" gap={12} style={{ marginBottom: 18 }}>
                    <Stat
                        label="Balance"
                        value={`$${Number(stats.balance || 0).toLocaleString()}`}
                        color={C.blue}
                        sub={`Equity $${Number(stats.equity || 0).toLocaleString()}`}
                    />
                    <Stat
                        label="Copy P&L"
                        value={usd(stats.total_pnl_usd)}
                        color={(stats.total_pnl_usd || 0) >= 0 ? C.green : C.red}
                        sub={`${stats.copy_trades || 0} trades`}
                    />
                    <Stat
                        label="Copying"
                        value={stats.active_subscriptions || 0}
                        color={C.purple}
                        sub="active providers"
                    />
                    <Stat
                        label="Courses Done"
                        value={stats.courses_completed || 0}
                        color={C.gold}
                        sub="education"
                    />
                </Grid>
            )}

            {/* ── Left: markets. Right: activity that needs attention ── */}
            <Grid cols="1fr 1fr" mobileCols="1fr" gap={16}>

                {/* LEFT — Live Prices + Latest Signals (market-facing) */}
                <div>
                    <Card>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <SectionTitle>Live Prices</SectionTitle>
                                <span
                                    title={priceStatus === "open" ? "Live" : "Reconnecting…"}
                                    style={{
                                        width: 8, height: 8, borderRadius: 99,
                                        background: priceStatus === "open" ? "#22c55e" : "#475569",
                                        boxShadow: priceStatus === "open" ? "0 0 8px #22c55e" : "none",
                                        transition: "all .3s", flexShrink: 0,
                                    }}
                                />
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <button
                                    onClick={() => setPairPickerOpen(true)}
                                    style={{
                                        fontSize: 10, fontWeight: 700, color: C.gold,
                                        background: `${C.gold}18`, border: `1px solid ${C.gold}55`,
                                        borderRadius: 6, padding: "3px 9px", cursor: "pointer",
                                    }}
                                >
                                    + Add pairs
                                </button>
                                <button
                                    onClick={() => setEditingDefaults((v) => !v)}
                                    style={{
                                        fontSize: 10, fontWeight: 700, color: editingDefaults ? "#071018" : C.muted,
                                        background: editingDefaults ? C.gold : "transparent", border: `1px solid ${C.border}`,
                                        borderRadius: 6, padding: "3px 9px", cursor: "pointer",
                                    }}
                                >
                                    {editingDefaults ? "Done" : "⚙ Defaults"}
                                </button>
                            </div>
                        </div>

                        {editingDefaults && (
                            <div style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, margin: "10px 0" }}>
                                <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, letterSpacing: 0.4 }}>DEFAULT TIMEFRAME</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                                    {TFS.map((tf) => (
                                        <button
                                            key={tf}
                                            onClick={() => setTimeframe(tf)}
                                            style={{
                                                fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 6, cursor: "pointer",
                                                border: `1px solid ${prefs.timeframe === tf ? C.blue : C.border}`,
                                                background: prefs.timeframe === tf ? `${C.blue}22` : "transparent",
                                                color: prefs.timeframe === tf ? C.blue : C.muted,
                                            }}
                                        >
                                            {tf}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, letterSpacing: 0.4 }}>DEFAULT INDICATORS</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {[["ema", "EMA 20/50"], ["bb", "Bollinger"], ["sr", "S/R"], ["trendline", "Trendline"], ["volume", "Volume"]].map(([key, label]) => (
                                        <label key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.text, cursor: "pointer" }}>
                                            <input type="checkbox" checked={!!prefs.indicators[key]} onChange={() => setIndicators((p) => ({ ...p, [key]: !p[key] }))} />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                                <div style={{ fontSize: 9, color: C.muted, marginTop: 10 }}>
                                    Synced to your account — applied automatically in Live Prices and Signals, on any device.
                                </div>
                            </div>
                        )}

                        {prices.length === 0 ? (
                            <div style={{ color: C.muted, fontSize: 12, padding: "12px 0" }}>
                                Your watchlist is empty — tap "+ Add pairs" to search and star some markets.
                            </div>
                        ) : (
                            prices.map((p) => (
                                <Row
                                    key={p.pair}
                                    onClick={() => navigate(`/prices?pair=${p.pair}`)}
                                    style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                >
                                    <strong style={{ fontSize: 12 }}>{p.pair}</strong>
                                    <span style={{ fontFamily: "monospace", fontSize: 12, color: p.direction === "up" ? C.green : C.red }}>
                                        {p.pair === "BTCUSD" ? f2(p.price) : fp(p.price)}
                                    </span>
                                    <span style={{ color: p.direction === "up" ? C.green : C.red, fontSize: 11, minWidth: 64, textAlign: "right" }}>
                                        {fpc(p.change_pct)}
                                    </span>
                                </Row>
                            ))
                        )}
                    </Card>

                    <Card>
                        <SectionTitle>Latest Signals</SectionTitle>
                        {signals.length === 0 ? (
                            <div style={{ color: C.muted, fontSize: 12, padding: "12px 0" }}>
                                Go to Signals → Generate to see signals here
                            </div>
                        ) : (
                            signals.map((s) => (
                                <Row
                                    key={s.id}
                                    onClick={() => navigate(`/signals?id=${s.id}`)}
                                    style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                >
                                    <strong style={{ flex: 1, fontSize: 12 }}>{s.pair}</strong>
                                    <Badge col={s.direction === "BUY" ? C.green : C.red}>{s.direction}</Badge>
                                    <Badge col={C.muted}>{s.timeframe}</Badge>
                                    <span style={{ fontFamily: "monospace", fontSize: 11 }}>{fp(s.entry_price)}</span>
                                    <span style={{ color: C.gold, fontSize: 11 }}>{s.confidence}%</span>
                                </Row>
                            ))
                        )}
                    </Card>
                </div>

                {/* RIGHT — Active Copy Trades + Notifications (things needing attention) */}
                <div>
                    <Card>
                        <SectionTitle>
                            Active Copy Trades <Badge col={C.gold}>{copies.length}</Badge>
                        </SectionTitle>
                        {copies.length === 0 ? (
                            <div style={{ color: C.muted, fontSize: 12 }}>
                                No copy trades — subscribe to a provider first
                            </div>
                        ) : (
                            copies.map((t) => (
                                <Row
                                    key={t.id}
                                    onClick={() => navigate(`/prices?pair=${t.pair}&copyTradeId=${t.id}`)}
                                    style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                >
                                    <strong style={{ fontSize: 12, flex: 1 }}>{t.pair}</strong>
                                    <Badge col={C.gold}>{t.timeframe}</Badge>
                                    <Badge col={t.direction === "BUY" ? C.green : C.red}>{t.direction}</Badge>
                                    <span style={{ fontFamily: "monospace", fontSize: 11 }}>{fp(t.entry_price)}</span>
                                    <span style={{ fontWeight: 700, fontSize: 12, color: Number(t.pnl_usd) >= 0 ? C.green : C.red }}>
                                        {usd(t.pnl_usd)}
                                    </span>
                                    <span style={{ fontWeight: 700, fontSize: 12, color: C.muted }}>{t.status}</span>
                                </Row>
                            ))
                        )}
                    </Card>

                    <Card>
                        <SectionTitle>Notifications <Badge col={C.red}>{notifs.length}</Badge></SectionTitle>
                        {notifs.length === 0 ? (
                            <div style={{ color: C.muted, fontSize: 12 }}>No notifications yet</div>
                        ) : (
                            notifs.map((n) => (
                                <Row
                                    key={n.id}
                                    onClick={() => navigate("/notifications")}
                                    style={{ opacity: n.is_read ? 0.5 : 1, cursor: "pointer" }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 12 }}>{n.title}</div>
                                        <div style={{ fontSize: 11, color: C.muted, wordBreak: "break-word" }}>
                                            {(n.message || "").slice(0, 65)}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{ago(n.created_at)}</span>
                                </Row>
                            ))
                        )}
                    </Card>
                </div>
            </Grid>

            {pairPickerOpen && (
                <PairPicker
                    api={api}
                    watchlist={watchlist}
                    onToggle={toggleWatchPair}
                    onClose={() => setPairPickerOpen(false)}
                />
            )}
        </div>
    );
}

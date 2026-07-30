// ─── Dashboard ────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../utils/constants.jsx";
import { Card, SectionTitle, Stat, Badge, Row, Grid } from "../shared/Shared.jsx";
import { ago, fp, f2, fpc, usd } from "../utils/utils.js";
import { useLiveSocket } from "../hooks/useLiveSocket.js";
import { WS_BASE } from "../api/Api.jsx";

const MARKET_LIST_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "XAUUSD", "BTCUSD", "GBPJPY"];
const PRICES_WS_URL = `${WS_BASE}/ws/prices?pairs=${MARKET_LIST_PAIRS.join(",")}`;
export default function Dashboard({ api }) {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [prices, setPrices] = useState([]);
    const [signals, setSignals] = useState([]);
    const [copies, setCopies] = useState([]);
    const [notifs, setNotifs] = useState([]);


    useEffect(() => {
        api.get("/dashboard/stats").then(setStats).catch(() => { });
        api.get("/prices/live?pairs=EURUSD,GBPUSD,USDJPY,XAUUSD,BTCUSD,GBPJPY").then(d => setPrices(d.prices || [])).catch(() => { });
        api.get("/signals/latest?limit=8").then(d => setSignals(d.signals || [])).catch(() => { });
        api.get("/copy/my-trades").then(d => setCopies((d.trades || []).slice(0, 6))).catch(() => { });
        api.get("/notifications").then(d => setNotifs((d.notifications || []).slice(0, 6))).catch(() => { });
        const t = setInterval(() => {
            api.get("/dashboard/stats").then(setStats).catch(() => { });
            //api.get("/prices/live?pairs=EURUSD,GBPUSD,USDJPY,XAUUSD,BTCUSD,GBPJPY").then(d => setPrices(d.prices || [])).catch(() => { });
        }, 15000);
        return () => clearInterval(t);
    }, []);

    // ── Live market watchlist (left panel) ──
    const onPricesMsg = useCallback((d) => {
        if (d?.type === "prices" && Array.isArray(d.data)) setPrices(d.data);
    }, []);
    const priceStatus = useLiveSocket(PRICES_WS_URL, onPricesMsg);

    return (
        <div
            style={{
                padding: window.innerWidth < 768 ? 12 : 20,
                maxWidth: "100%",
                boxSizing: "border-box",
            }}
        >

            {/* Stats */}
            {stats && (
                <Grid
                    cols="repeat(4,minmax(0,1fr))"
                    mobileCols="1fr 1fr"
                    gap={12}
                    style={{ marginBottom: 18 }}
                >
                    <Stat
                        label="Balance"
                        value={`$${Number(stats.balance || 0).toLocaleString()}`}
                        color={C.blue}
                        sub={`Equity $${Number(stats.equity || 0).toLocaleString()}`}
                    />

                    <Stat
                        label="Copy P&L"
                        value={usd(stats.total_pnl_usd)}
                        color={
                            (stats.total_pnl_usd || 0) >= 0
                                ? C.green
                                : C.red
                        }
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

            {/* Main Content */}
            <Grid
                cols="1fr 1fr"
                mobileCols="1fr"
                gap={16}
            >
                {/* LEFT */}
                <div>
                    <Card>
                        <SectionTitle>Latest Signals</SectionTitle>

                        {signals.length === 0 ? (
                            <div
                                style={{
                                    color: C.muted,
                                    fontSize: 12,
                                    padding: "12px 0",
                                }}
                            >
                                Go to Signals → Generate to see signals here
                            </div>
                        ) : (
                            signals.map((s) => (
                                <Row
                                    key={s.id}
                                    onClick={() => navigate(`/signals?id=${s.id}`)}
                                    style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                >
                                    <strong
                                        style={{
                                            flex: 1,
                                            fontSize: 12,
                                        }}
                                    >
                                        {s.pair}
                                    </strong>

                                    <Badge
                                        col={
                                            s.direction === "BUY"
                                                ? C.green
                                                : C.red
                                        }
                                    >
                                        {s.direction}
                                    </Badge>

                                    <Badge col={C.muted}>
                                        {s.timeframe}
                                    </Badge>

                                    <span
                                        style={{
                                            fontFamily: "monospace",
                                            fontSize: 11,
                                        }}
                                    >
                                        {fp(s.entry_price)}
                                    </span>

                                    <span
                                        style={{
                                            color: C.gold,
                                            fontSize: 11,
                                        }}
                                    >
                                        {s.confidence}%
                                    </span>
                                </Row>
                            ))
                        )}
                    </Card>

                    <Card>
                        <SectionTitle>Notifications <Badge col={C.red}>{notifs.length}</Badge></SectionTitle>

                        {notifs.length === 0 ? (
                            <div
                                style={{
                                    color: C.muted,
                                    fontSize: 12,
                                }}
                            >
                                No notifications yet
                            </div>
                        ) : (
                            notifs.map((n) => (
                                <Row
                                    key={n.id}
                                    onClick={() => navigate("/notifications")}
                                    style={{
                                        opacity: n.is_read ? 0.5 : 1,
                                        cursor: "pointer",
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                fontSize: 12,
                                            }}
                                        >
                                            {n.title}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: C.muted,
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {(n.message || "").slice(0, 65)}
                                        </div>
                                    </div>

                                    <span
                                        style={{
                                            fontSize: 10,
                                            color: C.muted,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {ago(n.created_at)}
                                    </span>
                                </Row>
                            ))
                        )}
                    </Card>
                </div>

                {/* RIGHT */}
                <div>
                    <Card>
                        <SectionTitle>Live Prices </SectionTitle>
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


                        {prices.map((p) => (
                            <Row
                                key={p.pair}
                                onClick={() => navigate(`/prices?pair=${p.pair}`)}
                                style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                            >
                                <strong style={{ fontSize: 12 }}>
                                    {p.pair}
                                </strong>

                                <span
                                    style={{
                                        fontFamily: "monospace",
                                        fontSize: 12,
                                        color: p.direction === "up"
                                            ? C.green
                                            : C.red,
                                    }}
                                >
                                    {p.pair === "BTCUSD"
                                        ? f2(p.price)
                                        : fp(p.price)}
                                </span>

                                <span
                                    style={{
                                        color:
                                            p.direction === "up"
                                                ? C.green
                                                : C.red,
                                        fontSize: 11,
                                        minWidth: 64,
                                        textAlign: "right",
                                    }}
                                >
                                    {fpc(p.change_pct)}
                                </span>
                            </Row>
                        ))}
                    </Card>

                    <Card>
                        <SectionTitle>
                            Active Copy Trades
                        </SectionTitle>

                        {copies.length === 0 ? (
                            <div
                                style={{
                                    color: C.muted,
                                    fontSize: 12,
                                }}
                            >
                                No copy trades — subscribe to a provider first
                            </div>
                        ) : (
                            copies.map((t) => (
                                <Row
                                    key={t.id}
                                    onClick={() => navigate(`/prices?pair=${t.pair}&copyTradeId=${t.id}`)}
                                    style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                >
                                    <strong
                                        style={{
                                            fontSize: 12,
                                            flex: 1,
                                        }}
                                    >
                                        {t.pair}
                                    </strong>
                                    <Badge col={C.gold}>
                                        {t.timeframe}
                                    </Badge>

                                    <Badge
                                        col={
                                            t.direction === "BUY"
                                                ? C.green
                                                : C.red
                                        }
                                    >
                                        {t.direction}
                                    </Badge>

                                    <span
                                        style={{
                                            fontFamily: "monospace",
                                            fontSize: 11,
                                        }}
                                    >
                                        {fp(t.entry_price)}
                                    </span>

                                    <span
                                        style={{
                                            fontWeight: 700,
                                            fontSize: 12,
                                            color:
                                                Number(t.pnl_usd) >= 0
                                                    ? C.green
                                                    : C.red,
                                        }}
                                    >
                                        {usd(t.pnl_usd)}
                                    </span>
                                    <span
                                        style={{
                                            fontWeight: 700,
                                            fontSize: 12,
                                            color:
                                                Number(t.pnl_usd) >= 0
                                                    ? C.green
                                                    : C.red,
                                        }}
                                    >
                                        {t.status}
                                    </span>
                                </Row>
                            ))
                        )}
                    </Card>
                </div>
            </Grid>
        </div>
    );
}

// ─── Confidence ring ──────────────────────────────────────────────────────────
import { C } from "../utils/constants.jsx";
import { fp, f1 } from "../utils/utils.js";
import { Badge } from "../shared/Shared.jsx";
import { ago } from "../utils/utils.js";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";

function ConfRing({ val, size = 54 }) {
  const r   = size * 0.38;
  const cx  = size / 2;
  const cy  = size / 2;
  const sw  = size * 0.072;
  const col = val >= 80 ? C.green : val >= 65 ? C.gold : val >= 50 ? "#f97316" : C.red;
  const circ = 2 * Math.PI * r;
  const full = circ * 0.75;
  const arc  = circ * (val / 100) * 0.75;
  const off  = circ * 0.125;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={sw}
        strokeDasharray={`${full} ${circ}`} strokeDashoffset={-off} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={sw}
        strokeDasharray={`${arc} ${circ}`} strokeDashoffset={-off} strokeLinecap="round" />
      <text x={cx} y={cy + 1} textAnchor="middle" fill={col} fontSize={size * 0.22}
        fontWeight="700" dominantBaseline="middle">{val}</text>
      <text x={cx} y={cy + size * 0.21} textAnchor="middle" fill={C.muted} fontSize={size * 0.13}>CONF</text>
    </svg>
  );
}

// ─── Candle chart (SVG) ───────────────────────────────────────────────────────
function CandleChart({ bars = [], entry, sl, tp }) {
  if (!bars.length) return <p style={{ color: C.muted, textAlign: "center", padding: "24px 0", fontSize: 12 }}>Loading chart…</p>;
  const W = 600, H = 190, PL = 54, PR = 52, PT = 6, PB = 18;
  const cw = W - PL - PR, ch = H - PT - PB;
  const sl55 = bars.slice(-55);
  const allY = [
    ...sl55.flatMap(b => [b.high, b.low]),
    ...[entry, sl, tp].filter(Boolean),
  ];
  const mn = Math.min(...allY), mx = Math.max(...allY), rng = mx - mn || 1;
  const Y   = v => PT + ch * (1 - (v - mn) / rng);
  const gap = cw / sl55.length;
  const bw  = Math.max(2, gap * 0.64);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PT + ch * t, p = (mx - rng * t).toFixed(5);
        return (
          <g key={t}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={C.border} strokeWidth=".4" />
            <text x={PL - 3} y={y + 3} fill={C.muted} fontSize="8" textAnchor="end">{p}</text>
          </g>
        );
      })}
      {/* Candles */}
      {sl55.map((b, i) => {
        const x    = PL + i * gap + gap / 2;
        const bull = b.close >= b.open;
        const col  = bull ? C.green : C.red;
        const oy   = Y(Math.max(b.open, b.close));
        const bh   = Math.max(1.5, Math.abs(Y(b.open) - Y(b.close)));
        return (
          <g key={i}>
            <line x1={x} y1={Y(b.high)} x2={x} y2={Y(b.low)} stroke={col} strokeWidth=".9" opacity=".7" />
            <rect x={x - bw / 2} y={oy} width={bw} height={bh}
              fill={bull ? C.green + "30" : C.red + "30"} stroke={col} strokeWidth=".9" />
          </g>
        );
      })}
      {/* Indicator lines */}
      {[
        [b => b.ema20,  C.gold,   1.2, ""],
        [b => b.ema50,  C.purple, 1.2, ""],
        [b => b.bb_up,  C.blue,   0.7, "3,2"],
        [b => b.bb_low, C.blue,   0.7, "3,2"],
      ].map(([fn, col, sw, dash], ki) => {
        const pts = sl55.map((b, i) => {
          const v = fn(b); return v ? `${PL + i * gap + gap / 2},${Y(v)}` : null;
        }).filter(Boolean).join(" ");
        return pts
          ? <polyline key={ki} points={pts} fill="none" stroke={col} strokeWidth={sw} strokeDasharray={dash} opacity=".85" />
          : null;
      })}
      {/* Signal price lines */}
      {[[entry, C.gold, "ENTRY"], [sl, C.red, "SL"], [tp, C.green, "TP"]].filter(([v]) => v).map(([v, col, lbl]) => (
        <g key={lbl}>
          <line x1={PL} y1={Y(v)} x2={W - PR} y2={Y(v)} stroke={col} strokeWidth="1" strokeDasharray="5,3" />
          <text x={W - PR + 3} y={Y(v) + 4} fill={col} fontSize="8">{lbl}</text>
        </g>
      ))}
    </svg>
  );
}



// ─────────────────────────────────────────────────────────────
// CandleChart1.jsx
// Advanced Professional Chart Styling
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// CandleChart1.jsx
// FULLY WORKING — lightweight-charts v5+
// Professional Forex Trading Chart
// ─────────────────────────────────────────────────────────────


// Backend annotation timestamps look like "2026-07-06 06:44" (naive UTC).
// The candle series uses integer unix seconds, so every overlay (markers,
// trendline, S/R) needs to be converted onto that same time axis.
function toUnixTime(s) {
  if (s == null) return null;
  if (typeof s === "number") return s;
  const iso = s.includes("T") ? s : s.replace(" ", "T") + (s.length <= 16 ? ":00" : "");
  const ms = Date.parse(iso.endsWith("Z") ? iso : iso + "Z");
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

// ── EAT (Africa/Nairobi, UTC+3, no DST) time formatting — used throughout the
// chart so every timestamp the trader sees matches their local time. ──
function eatTickLabel(unixSeconds) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(unixSeconds * 1000));
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  return `${get("day")} ${get("month")} ${get("hour")}:${get("minute")}`;
}
function eatTooltipLabel(unixSeconds) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(unixSeconds * 1000));
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")} EAT`;
}
function eatNowLabel() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  return `${get("hour")}:${get("minute")}`;
}

// Major FX session windows in UTC (standard approximation).
const SESSIONS = [
  { name: "Sydney",   startUTC: 22, endUTC: 7,  color: "#a855f7" },
  { name: "Tokyo",    startUTC: 0,  endUTC: 9,  color: "#3b82f6" },
  { name: "London",   startUTC: 8,  endUTC: 17, color: "#22c55e" },
  { name: "New York", startUTC: 13, endUTC: 22, color: "#f59e0b" },
];
function activeSessions(utcHour) {
  return SESSIONS.filter((s) => (s.startUTC < s.endUTC
    ? utcHour >= s.startUTC && utcHour < s.endUTC
    : utcHour >= s.startUTC || utcHour < s.endUTC));
}

export default function CandleChart1({
  bars = [],
  entry, sl, tp,
  markers = [],
  supportResistance = [],
  trendline = null,
  liveCandle = null,   // { time, open, high, low, close } — forming/closed bar from /ws/candles
  live = false,        // shows a small pulsing "LIVE" badge
  resetKey = "",        // change this (e.g. `${pair}_${timeframe}`) to force a full chart rebuild
  pair = "EURUSD",      // used only to pick correct decimal precision (JPY/XAU/BTC differ from majors)
  timeframe = "",       // shown in the on-chart header badge
  indicators = { ema: true, bb: true, sr: true, trendline: true, volume: true }, // toggle overlays on/off
  height = 560,         // pass a smaller number on mobile — see PricesPage/Signals for responsive sizing
  onTfClick = null,     // if provided, the timeframe badge becomes tappable (opens your own popup)
  draggableSlTp = false,// enables drag-to-adjust on the SL/TP lines (only meaningful with onAdjustSlTp)
  onAdjustSlTp = null,  // (type: 'sl'|'tp', price: number) => void — called once, on release
  trades = [], // Active trade per pair
  selectedTradeId = null, // ID of the currently selected trade
  onTradeSelect = null,
  enableDrawing = true,  // shows the rectangle-drawing toolbar and overlay
  drawingKey = null,     // storage key for saved drawings; defaults to `${pair}_${timeframe}`
  api = null,            // pass the useApi() client to sync drawings to the user's account (falls back to this-device-only localStorage without it)
}) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const ema20Ref = useRef(null);
  const ema50Ref = useRef(null);
  const bbUpRef = useRef(null);
  const bbLowRef = useRef(null);
  const volRef = useRef(null);
  const trendRef = useRef(null);
  const priceLinesRef = useRef([]); // trade entry + S/R lines — rebuilt (cheaply) on every data update
  const slLineRef = useRef(null);
  const tpLineRef = useRef(null);
  const dragStateRef = useRef(null); // 'sl' | 'tp' | null — which line (if any) is currently being dragged
  const lastBarTimeRef = useRef(null);
  const visibleRangeRef = useRef(null); // null until this chart instance has done its one initial fitContent()
  const decimals = pairDecimals(pair);
  const [hover, setHover] = useState(null); // live OHLC+volume under the crosshair, for the on-chart header
  const [clock, setClock] = useState(0); // ticks the session/EAT badge every 30s — doesn't touch the chart

  // ── Rectangle drawing tool ──────────────────────────────────────────────
  // Rectangles are stored as {id, t1, p1, t2, p2} in time/price space (not
  // pixels), so they stay anchored to the correct candles/prices across pan,
  // zoom, resize, and reload. Persisted to localStorage per pair+timeframe.
  const canvasRef = useRef(null);
  const dragStartRef = useRef(null);
  const storageKey = `yobbyfx_drawings_${drawingKey || resetKey || pair}`;
  const [tool, setTool] = useState("none"); // "none" | "rect"


  const hydratedRef = useRef(false); // true once we know we have the real (server-confirmed) rect set — guards against echoing a stale local cache back over the server's copy
    // Supported types: "none" | "horizontal" | "vertical" | "trend" | "rect"
  const [drawings, setDrawings] = useState([]); // Array of { id, type, t1, p1, t2, p2 }
  const [activePreview, setActivePreview] = useState(null);

  const drawingsRef = useRef(drawings); drawingsRef.current = drawings;
  const previewRef = useRef(activePreview); previewRef.current = activePreview;

  // Load saved rectangles whenever the chart/pair/timeframe changes. When an
  // `api` client is passed, the account's saved drawings (from the backend)
  // are the source of truth — localStorage is only the offline/instant-paint
  // fallback, and gets overwritten by whatever the server returns.
  // Sync / Load drawings
  useEffect(() => {
    if (!enableDrawing) { setDrawings([]); return; }
    hydratedRef.current = !api;
    try {
      const raw = localStorage.getItem(storageKey);
      setDrawings(raw ? JSON.parse(raw) : []);
    } catch { setDrawings([]); }
    setTool("none");
    setActivePreview(null);
    if (api && pair && timeframe) {
      api.get(`/prefs/drawings?pair=${encodeURIComponent(pair)}&timeframe=${encodeURIComponent(timeframe)}`)
        .then((res) => {
          if (Array.isArray(res?.drawings)) setDrawings(res.drawings);
          hydratedRef.current = true;
        })
        .catch(() => { hydratedRef.current = true; });
    }
  }, [storageKey, enableDrawing, api, pair, timeframe]);

  // Save changes
  useEffect(() => {
    if (!enableDrawing) return;
    try { localStorage.setItem(storageKey, JSON.stringify(drawings)); } catch {}
    if (api && pair && timeframe && hydratedRef.current) {
      api.put("/prefs/drawings", { pair, timeframe, drawings }).catch(() => {});
    }
  }, [drawings, storageKey, enableDrawing, api, pair, timeframe]);

  // ── Multi-Drawing Engine Canvas Renderer ──
  const redrawAllTools = useCallback(() => {
    const canvas = canvasRef.current, chart = chartRef.current, series = candleSeriesRef.current, host = ref.current;
    if (!canvas || !chart || !series || !host || !enableDrawing) return;
    
    const w = host.clientWidth, h = height;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    
    const ts = chart.timeScale();

    const drawItem = (item, isPreview) => {
      const x1 = ts.timeToCoordinate(typeof item.t1 === "number" ? item.t1 : toUnixTime(item.t1));
      const y1 = series.priceToCoordinate(item.p1);
      
      if (x1 == null || y1 == null) return;

      ctx.lineWidth = isPreview ? 1.5 : 2.0;
      ctx.strokeStyle = isPreview ? "#facc15" : "#3b82f6";
      ctx.fillStyle = isPreview ? "rgba(250, 204, 21, 0.15)" : "rgba(59, 130, 246, 0.15)";
      ctx.setLineDash(isPreview ? [4, 4] : []);

      if (item.type === "horizontal") {
        ctx.beginPath();
        ctx.moveTo(0, y1);
        ctx.lineTo(w, y1);
        ctx.stroke();
      } 
      else if (item.type === "vertical") {
        ctx.beginPath();
        ctx.moveTo(x1, 0);
        ctx.lineTo(x1, h);
        ctx.stroke();
      } 
      else if (item.type === "trend") {
        const x2 = ts.timeToCoordinate(typeof item.t2 === "number" ? item.t2 : toUnixTime(item.t2));
        const y2 = series.priceToCoordinate(item.p2);
        if (x2 == null || y2 == null) return;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } 
      else if (item.type === "rect") {
        const x2 = ts.timeToCoordinate(typeof item.t2 === "number" ? item.t2 : toUnixTime(item.t2));
        const y2 = series.priceToCoordinate(item.p2);
        if (x2 == null || y2 == null) return;
        const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
      }
    };

    drawingsRef.current.forEach(item => drawItem(item, false));
    if (previewRef.current) drawItem(previewRef.current, true);
  }, [enableDrawing, height]);

  useEffect(() => { redrawAllTools(); }, [drawings, activePreview, redrawAllTools]);

  // Coordinate math helpers
  function getCanvasCoords(e) {
    const canvas = canvasRef.current, chart = chartRef.current, series = candleSeriesRef.current;
    if (!canvas || !chart || !series) return null;
    const box = canvas.getBoundingClientRect();
    const cx = (e.clientX ?? e.touches?.[0]?.clientX) - box.left;
    const cy = (e.clientY ?? e.touches?.[0]?.clientY) - box.top;
    const t = chart.timeScale().coordinateToTime(cx);
    const p = series.coordinateToPrice(cy);
    return (t != null && p != null) ? { t, p } : null;
  }

  const handleDrawStart = (e) => {
    if (tool === "none") return;
    const pt = getCanvasCoords(e);
    if (!pt) return;
    e.preventDefault();
    dragStartRef.current = pt;

    if (tool === "horizontal" || tool === "vertical") {
      // Instant single-click placement tools
      setDrawings(prev => [...prev, { id: `draw_${Date.now()}`, type: tool, t1: pt.t, p1: pt.p, t2: pt.t, p2: pt.p }]);
      setTool("none");
      dragStartRef.current = null;
    } else {
      // Drag-to-stretch lines (Trend, Box Box)
      setActivePreview({ type: tool, t1: pt.t, p1: pt.p, t2: pt.t, p2: pt.p });
    }
  };

  const handleDrawMove = (e) => {
    if (!dragStartRef.current || !activePreview) return;
    const pt = getCanvasCoords(e);
    if (!pt) return;
    e.preventDefault();
    setActivePreview(prev => ({ ...prev, t2: pt.t, p2: pt.p }));
  };

  const handleDrawEnd = (e) => {
    if (!dragStartRef.current || !activePreview) return;
    const pt = getCanvasCoords(e);
    const start = dragStartRef.current;
    dragStartRef.current = null;

    if (pt && start) {
      setDrawings(prev => [...prev, { id: `draw_${Date.now()}`, type: tool, t1: start.t, p1: start.p, t2: pt.t, p2: pt.p }]);
    }
    setActivePreview(null);
    setTool("none"); // reset back to cursor navigation
  };

  // Latest props, readable from handlers registered once in the build effect below
  // (so trade-selection clicks and the crosshair always see current data without
  // needing to rebuild the chart every time bars/trades change).
  const barsRef = useRef(bars); barsRef.current = bars;
  const tradesRef = useRef(trades); tradesRef.current = trades;
  const onTradeSelectRef = useRef(onTradeSelect); onTradeSelectRef.current = onTradeSelect;

  useEffect(() => {
    const iv = setInterval(() => setClock((c) => c + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  // ── Build: create the chart + series objects. Runs on mount and whenever the
  // pair/timeframe (resetKey) or an indicator toggle changes — deliberately NOT
  // on every new bar/trade update, so a new candle closing or a trade opening
  // never tears the chart down. That teardown-on-every-update was the root of
  // the "not steady, loses pan/zoom" complaint. ──
  useEffect(() => {
    if (!ref.current) return;
    visibleRangeRef.current = null;

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height,
      layout: { background: { color: "#071018" }, textColor: "#94a3b8", fontFamily: "Inter, sans-serif", fontSize: 12 },
      grid: { vertLines: { color: "rgba(255,255,255,0.05)" }, horzLines: { color: "rgba(255,255,255,0.05)" } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#1e293b" },
      timeScale: {
        borderColor: "#1e293b", timeVisible: true, secondsVisible: false,
        // MT5-style axis labels, in East Africa Time: "08 Jul 14:00"
        tickMarkFormatter: (time) => eatTickLabel(time),
      },
      localization: {
        // Crosshair/tooltip date — "YYYY.MM.DD HH:mm EAT"
        timeFormatter: (time) => eatTooltipLabel(time),
        priceFormatter: (p) => Number(p).toFixed(decimals),
      },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
      priceLineVisible: true,
      // The library defaults every series to 2-decimal pricing regardless of
      // instrument — this is why forex pairs were rendering at 2dp instead of 4dp.
      priceFormat: { type: "price", precision: decimals, minMove: Math.pow(10, -decimals) },
    });
    candleSeriesRef.current = candleSeries;

    if (indicators.ema) {
      ema20Ref.current = chart.addSeries(LineSeries, { color: "#facc15", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: "EMA20" });
      ema50Ref.current = chart.addSeries(LineSeries, { color: "#a855f7", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: "EMA50" });
    }
    if (indicators.bb) {
      bbUpRef.current  = chart.addSeries(LineSeries, { color: "#60a5fa", lineWidth: 1, lineStyle: 2, priceLineVisible: false });
      bbLowRef.current = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, lineStyle: 2, priceLineVisible: false });
    }
    if (indicators.volume) {
      const v = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol", color: "#3d9eff55" });
      v.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      volRef.current = v;
    }
    if (indicators.trendline) {
      trendRef.current = chart.addSeries(LineSeries, {
        color: "#22c55e", lineWidth: 2, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
    }

    // ── Click on an active trade's entry line to select it — pixel-distance hit
    // test (not a raw price tolerance), so this works the same on a 5-decimal
    // EURUSD line as on a 2-decimal XAUUSD/JPY line, where a fixed price
    // tolerance is either unclickable or too wide. ──
    chart.subscribeClick((param) => {
      if (!param.point) return;
      const HIT_PX = 10;
      let closest = null, closestDist = Infinity;
      (tradesRef.current || []).forEach((t) => {
        const y = candleSeries.priceToCoordinate(Number(t.entry_price));
        if (y == null) return;
        const dist = Math.abs(y - param.point.y);
        if (dist <= HIT_PX && dist < closestDist) { closest = t; closestDist = dist; }
      });
      if (closest) onTradeSelectRef.current?.(closest);
    });

    // ── On-chart header data: OHLC + volume under the crosshair (or the latest
    // bar when not hovering). ──
    chart.subscribeCrosshairMove((param) => {
      const b = barsRef.current;
      const last = b[b.length - 1];
      if (!last) return;
      if (!param || !param.time || !param.seriesData) {
        setHover({ o: last.open, h: last.high, l: last.low, c: last.close, v: last.volume ?? null, time: last.time });
        return;
      }
      const d = param.seriesData.get(candleSeries);
      if (d) setHover({ o: d.open, h: d.high, l: d.low, c: d.close, v: b.find((x) => x.time === param.time)?.volume ?? null, time: param.time });
    });

    // ── Drag-to-adjust SL/TP directly on the chart (MT5-style) ──
    // Pointer-based since lightweight-charts price lines don't support native
    // dragging: on press near a line's current pixel Y, track movement, move
    // the line live via applyOptions({price}), then commit via onAdjustSlTp
    // once on release (not on every pixel of movement).
    let dragCleanup = null;
    if (draggableSlTp && onAdjustSlTp) {
      const HIT_PX = 14;
      const findLineNear = (y) => {
        if (slLineRef.current) {
          const ly = candleSeries.priceToCoordinate(slLineRef.current.options().price);
          if (ly != null && Math.abs(ly - y) <= HIT_PX) return "sl";
        }
        if (tpLineRef.current) {
          const ly = candleSeries.priceToCoordinate(tpLineRef.current.options().price);
          if (ly != null && Math.abs(ly - y) <= HIT_PX) return "tp";
        }
        return null;
      };
      const getY = (e) => {
        const rect = ref.current.getBoundingClientRect();
        return (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      };
      const onDown = (e) => {
        const y = getY(e);
        const hit = findLineNear(y);
        if (hit) { dragStateRef.current = hit; e.preventDefault(); }
      };
      const onMove = (e) => {
        if (!dragStateRef.current) return;
        e.preventDefault();
        const y = getY(e);
        const price = candleSeries.coordinateToPrice(y);
        if (price == null) return;
        const lineRef = dragStateRef.current === "sl" ? slLineRef : tpLineRef;
        if (lineRef.current) lineRef.current.applyOptions({ price: Number(price.toFixed(decimals)) });
      };
      const onUp = () => {
        if (!dragStateRef.current) return;
        const lineRef = dragStateRef.current === "sl" ? slLineRef : tpLineRef;
        const finalPrice = lineRef.current?.options().price;
        const type = dragStateRef.current;
        dragStateRef.current = null;
        // Called with (type, price) — matches PricesPage's adjustCopyTradeFromChart(type, price).
        if (finalPrice != null) onAdjustSlTp(type, finalPrice);
      };
      const el = ref.current;
      el.addEventListener("mousedown", onDown);
      el.addEventListener("touchstart", onDown, { passive: false });
      window.addEventListener("mousemove", onMove);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchend", onUp);
      dragCleanup = () => {
        el.removeEventListener("mousedown", onDown);
        el.removeEventListener("touchstart", onDown);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchend", onUp);
      };
    }

    const resize = () => { if (ref.current) chart.applyOptions({ width: ref.current.clientWidth }); redrawAllTools(); };
    window.addEventListener("resize", resize);
    // Keep drawn rectangles pinned to their time/price as the user pans or zooms.
    chart.timeScale().subscribeVisibleLogicalRangeChange(redrawAllTools);

    return () => {
      window.removeEventListener("resize", resize);
      if (dragCleanup) dragCleanup();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      ema20Ref.current = null; ema50Ref.current = null;
      bbUpRef.current = null; bbLowRef.current = null;
      volRef.current = null; trendRef.current = null;
      priceLinesRef.current = [];
      slLineRef.current = null;
      tpLineRef.current = null;
    };
  }, [resetKey, indicators.ema, indicators.bb, indicators.volume, indicators.trendline, draggableSlTp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data update: candles, indicator lines, volume, markers, trendline. Runs
  // whenever the bar set (or overlays) changes but never rebuilds the chart —
  // this is what keeps pan/zoom exactly where the user left it when a new
  // candle arrives. ──
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries || !bars || bars.length === 0) return;

    const candleData = bars.map((b) => ({
      time: b.time, open: Number(b.open), high: Number(b.high), low: Number(b.low), close: Number(b.close),
    }));
    candleSeries.setData(candleData);
    lastBarTimeRef.current = candleData[candleData.length - 1].time;

    if (ema20Ref.current) ema20Ref.current.setData(bars.filter((b) => b.ema20 != null).map((b) => ({ time: b.time, value: Number(b.ema20) })));
    if (ema50Ref.current) ema50Ref.current.setData(bars.filter((b) => b.ema50 != null).map((b) => ({ time: b.time, value: Number(b.ema50) })));
    if (bbUpRef.current)  bbUpRef.current.setData(bars.filter((b) => (b.bb_upper ?? b.bb_up) != null).map((b) => ({ time: b.time, value: Number(b.bb_upper ?? b.bb_up) })));
    if (bbLowRef.current) bbLowRef.current.setData(bars.filter((b) => (b.bb_lower ?? b.bb_low) != null).map((b) => ({ time: b.time, value: Number(b.bb_lower ?? b.bb_low) })));
    if (volRef.current) {
      volRef.current.setData(bars.map((b) => ({
        time: b.time, value: Number(b.volume) || 0,
        color: Number(b.close) >= Number(b.open) ? "#22c55e55" : "#ef444455",
      })));
    }
    if (trendRef.current) {
      const t1 = toUnixTime(trendline?.p1?.time), t2 = toUnixTime(trendline?.p2?.time);
      if (trendline && t1 != null && t2 != null) {
        trendRef.current.applyOptions({ color: trendline.direction === "up" ? "#22c55e" : "#ef4444" });
        trendRef.current.setData([{ time: t1, value: Number(trendline.p1.value) }, { time: t2, value: Number(trendline.p2.value) }]);
      } else {
        trendRef.current.setData([]);
      }
    }

    if (markers?.length) {
      const formatted = markers.map((m) => ({ ...m, time: toUnixTime(m.time) })).filter((m) => m.time != null).sort((a, b) => a.time - b.time);
      try { candleSeries.setMarkers(formatted); } catch { /* older/newer lightweight-charts marker API mismatch — ignore gracefully */ }
    } else {
      try { candleSeries.setMarkers([]); } catch { /* noop */ }
    }

    // ── Price lines: active trades' entry (+ SL/TP for the selected one),
    // legacy entry/sl/tp props, and support/resistance. Cheap to fully redo
    // each update — unlike the series above, price lines have no setData(). ──
    priceLinesRef.current.forEach((pl) => { try { candleSeries.removePriceLine(pl); } catch { /* noop */ } });
    priceLinesRef.current = [];
    slLineRef.current = null;
    tpLineRef.current = null;

    // Legacy entry/sl/tp props (used by the Signals detail chart, which has no
    // `trades` array). When `trades` is populated (Live Prices), those price
    // lines are drawn per-trade below instead, so skip these to avoid duplicates.
    if (!trades.length) {
      if (entry) priceLinesRef.current.push(candleSeries.createPriceLine({ price: Number(entry), color: "#f0b429", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: "ENTRY" }));
      if (sl) {
        const l = candleSeries.createPriceLine({ price: Number(sl), color: "#ef4444", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: draggableSlTp ? "SL ⇕" : "SL" });
        priceLinesRef.current.push(l); slLineRef.current = l;
      }
      if (tp) {
        const l = candleSeries.createPriceLine({ price: Number(tp), color: "#22c55e", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: draggableSlTp ? "TP ⇕" : "TP" });
        priceLinesRef.current.push(l); tpLineRef.current = l;
      }
    }

    trades.forEach((t) => {
      const color = t.direction === "BUY" ? "#22c55e" : "#ef4444";
      priceLinesRef.current.push(candleSeries.createPriceLine({
        price: Number(t.entry_price),
        color: t.id === selectedTradeId ? "#f59e0b" : color,
        lineWidth: t.id === selectedTradeId ? 4 : 2,
        lineStyle: t.id === selectedTradeId ? 0 : 3,
        axisLabelVisible: true,
        title: `${t.direction} ${t.pair} (${t.pnl_usd >= 0 ? "+" : ""}${fp(t.pnl_usd, 2)} USD, ${t.pnl_pips}p) (${t.lot_size})`,
      }));
      if (t.id !== selectedTradeId) return;
      const slLine = candleSeries.createPriceLine({ price: Number(t.stop_loss), color: "#ef4444", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: draggableSlTp ? "SL ⇕" : "SL" });
      const tpLine = candleSeries.createPriceLine({ price: Number(t.take_profit), color: "#22c55e", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: draggableSlTp ? "TP ⇕" : "TP" });
      priceLinesRef.current.push(slLine, tpLine);
      slLineRef.current = slLine;
      tpLineRef.current = tpLine;
    });

   if (indicators.sr) (supportResistance || []).forEach((lvl) => {
      const isRes = lvl.type === "resistance";
      priceLinesRef.current.push(candleSeries.createPriceLine({
        price: Number(lvl.price),
        color: isRes ? "#fb7185" : "#34d399",
        lineWidth: 1, lineStyle: 3, axisLabelVisible: true,
        title: isRes ? "Resistance" : "Support",
      }));
    });

    // CHANGE: Guard this state update so it never sets layout data to undefined if bars array is blank
    const last = bars[bars.length - 1];
    if (last) {
      setHover((h) => h ?? { o: last.open, h: last.high, l: last.low, c: last.close, v: last.volume ?? null, time: last.time });
    }

    const chart = chartRef.current;
    if (chart && !visibleRangeRef.current) {
      chart.timeScale().fitContent();
      try { visibleRangeRef.current = chart.timeScale().getVisibleLogicalRange() || true; } catch { visibleRangeRef.current = true; }
    }
    redrawAllTools();
    
  }, [bars, markers, supportResistance, trendline, trades, selectedTradeId, entry, sl, tp, indicators.sr, draggableSlTp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live tick / candle-close updates — no chart rebuild, just series.update() ──
  useEffect(() => {
    if (!liveCandle || !candleSeriesRef.current) return;
    const t = typeof liveCandle.time === "number" ? liveCandle.time : toUnixTime(liveCandle.time);
    if (t == null) return;

    try {
      candleSeriesRef.current.update({
        time: t,
        open: Number(liveCandle.open),
        high: Number(liveCandle.high),
        low: Number(liveCandle.low),
        close: Number(liveCandle.close),
      });
        if (chartRef.current) {
      chartRef.current.priceScale('right').applyOptions({
        autoScale: true, // Forces the container to expand/shift to contain the live quote
      });
    }
      lastBarTimeRef.current = t;
    } catch { 
      if (bars && bars.length > 0) {
      lastBarTimeRef.current = bars[bars.length - 1].time;
    } }
  }, [liveCandle]);

  const utcHour = new Date().getUTCHours();
  const openSessions = activeSessions(utcHour);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{
        position: "absolute", top: 8, left: 10, right: 10, zIndex: 3,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
        pointerEvents: "none", // let clicks through to the chart except on the badges themselves
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          background: "rgba(7,16,24,0.82)", border: "1px solid #1e293b", borderRadius: 8,
          padding: "4px 8px", pointerEvents: "auto", maxWidth: "100%",
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{pair}</span>
          {timeframe && (
            onTfClick ? (
              <button onClick={onTfClick} style={{
                fontSize: 11, fontWeight: 700, color: C.gold, background: `${C.gold}1a`,
                border: `1px solid ${C.gold}55`, borderRadius: 5, padding: "1px 7px", cursor: "pointer",
              }}>
                {timeframe} ▾
              </button>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", background: "#1e293b", borderRadius: 5, padding: "1px 7px" }}>{timeframe}</span>
            )
          )}
          {hover && (
            <span style={{ fontSize: 10, color: "#94a3b8", display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span>O <b style={{ color: "#cbd5e1" }}>{fp(hover.o, decimals)}</b></span>
              <span>H <b style={{ color: "#22c55e" }}>{fp(hover.h, decimals)}</b></span>
              <span>L <b style={{ color: "#ef4444" }}>{fp(hover.l, decimals)}</b></span>
              <span>C <b style={{ color: "#cbd5e1" }}>{fp(hover.c, decimals)}</b></span>
              {hover.v != null && <span>Vol <b style={{ color: "#3d9eff" }}>{Math.round(hover.v).toLocaleString()}</b></span>}
            </span>
          )}
        </div>
        {/* EAT clock + active FX sessions — placed alongside the pair/timeframe badge so
            it's visible without competing for chart height. */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap",
          background: "rgba(7,16,24,0.82)", border: "1px solid #1e293b", borderRadius: 8,
          padding: "4px 8px", pointerEvents: "auto", fontSize: 10, color: "#94a3b8",
        }}>
          <span style={{ fontWeight: 700, color: "#cbd5e1", fontFamily: "monospace" }}>{eatNowLabel()} EAT</span>
          <span style={{ opacity: 0.35 }}>·</span>
          {openSessions.length ? openSessions.map((s) => (
            <span key={s.name} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, boxShadow: `0 0 4px ${s.color}` }} />
              {s.name}
            </span>
          )) : <span style={{ opacity: 0.6 }}>All sessions closed</span>}
        </div>
      </div>
      {live && (
        <div style={{
          position: "absolute", top: 10, right: 14, zIndex: 2, display: "flex", alignItems: "center", gap: 6,
          background: "rgba(7,16,24,0.85)", border: "1px solid #1e293b", borderRadius: 20, padding: "3px 10px",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", animation: "pulseLive 1.4s infinite" }} />
          <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.5 }}>LIVE</span>
        </div>
      )}
      <div ref={ref} style={{ width: "100%", height: `${height}px`, borderRadius: 18, overflow: "hidden", background: "#071018", touchAction: draggableSlTp ? "pan-x" : "auto" }} />
        <div ref={ref} style={{ width: "100%", height: `${height}px`, borderRadius: 18, overflow: "hidden", background: "#071018", touchAction: draggableSlTp ? "pan-x" : "auto" }} />
      
      {enableDrawing && (
        <canvas
          ref={canvasRef}
          onMouseDown={handleDrawStart} onMouseMove={handleDrawMove} onMouseUp={handleDrawEnd} onMouseLeave={handleDrawEnd}
          onTouchStart={handleDrawStart} onTouchMove={handleDrawMove} onTouchEnd={handleDrawEnd}
          style={{
            position: "absolute", left: 0, top: 0, width: "100%", height: `${height}px`, borderRadius: 18,
            zIndex: 1, cursor: tool !== "none" ? "crosshair" : "default",
            pointerEvents: tool !== "none" ? "auto" : "none", touchAction: tool !== "none" ? "none" : "auto",
          }}
        />
      )}

          {enableDrawing && (
        <div style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 3, display: "flex", alignItems: "center", gap: 6,
          background: "rgba(11, 23, 35, 0.9)", border: "1px solid #1f2937", borderRadius: 8, padding: "5px 8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
        }}>
          {/* Horizontal Line Tool */}
          <button onClick={() => setTool(t => t === "horizontal" ? "none" : "horizontal")} title="Horizontal Line"
            style={{ width: 28, height: 28, background: tool === "horizontal" ? `${C.gold}2a` : "transparent", border: `1px solid ${tool === "horizontal" ? C.gold : "#1e293b"}`, borderRadius: 5, cursor: "pointer", color: tool === "horizontal" ? C.gold : "#94a3b8", fontSize: 13, fontWeight: "bold" }}>
            ―
          </button>
          
          {/* Vertical Line Tool */}
          <button onClick={() => setTool(t => t === "vertical" ? "none" : "vertical")} title="Vertical Line"
            style={{ width: 28, height: 28, background: tool === "vertical" ? `${C.gold}2a` : "transparent", border: `1px solid ${tool === "vertical" ? C.gold : "#1e293b"}`, borderRadius: 5, cursor: "pointer", color: tool === "vertical" ? C.gold : "#94a3b8", fontSize: 13, fontWeight: "bold" }}>
            ｜
          </button>

          {/* Trendline Tool */}
          <button onClick={() => setTool(t => t === "trend" ? "none" : "trend")} title="Trend Line"
            style={{ width: 28, height: 28, background: tool === "trend" ? `${C.gold}2a` : "transparent", border: `1px solid ${tool === "trend" ? C.gold : "#1e293b"}`, borderRadius: 5, cursor: "pointer", color: tool === "trend" ? C.gold : "#94a3b8", fontSize: 14 }}>
            ╱
          </button>

          {/* Box Rectangle Tool */}
          <button onClick={() => setTool(t => t === "rect" ? "none" : "rect")} title="Box Zone"
            style={{ width: 28, height: 28, background: tool === "rect" ? `${C.gold}2a` : "transparent", border: `1px solid ${tool === "rect" ? C.gold : "#1e293b"}`, borderRadius: 5, cursor: "pointer", color: tool === "rect" ? C.gold : "#94a3b8", fontSize: 13 }}>
            ▭
          </button>

          {drawings.length > 0 && (
            <>
              <div style={{ width: 1, height: 16, background: "#1e293b", margin: "0 4px" }} />
              {/* Undo Button */}
              <button onClick={() => setDrawings(prev => prev.slice(0, -1))} title="Undo Last Drawing"
                style={{ width: 28, height: 28, background: "transparent", border: "1px solid #1e293b", borderRadius: 5, cursor: "pointer", color: "#94a3b8", fontSize: 12 }}>
                ↺
              </button>
              {/* Trash/Clear All */}
              <button onClick={() => setDrawings([])} title="Clear All Drawings"
                style={{ width: 28, height: 28, background: "transparent", border: "1px solid #ef444433", borderRadius: 5, cursor: "pointer", color: "#ef4444", border: "1px solid #ef444455", fontSize: 11 }}>
                ✕
              </button>
            </>
          )}
        </div>
      )}

      <style>{`@keyframes pulseLive{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  );
}
// ─── Signal card ──────────────────────────────────────────────────────────────
function SigCard({ s, selected, onClick }) {
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
        {s.status === "closed" ? (
          <Badge col={s.result === "win" ? C.green : s.result === "loss" ? C.red : C.muted}>
            {(s.result || "").toUpperCase()} {s.pnl_pips != null ? `${s.pnl_pips >= 0 ? "+" : ""}${f1(s.pnl_pips)}p` : ""}
          </Badge>
        ) : (
          <Badge col={sc}>{s.strength}</Badge>
        )}
        <Badge col={C.muted}>{s.candle_pattern || "—"}</Badge>
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.muted }}>{ago(s.created_at)}</span>
      </div>
      {s.entry_time && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{s.entry_time}</div>}
    </div>
  );
}

// Kept in sync with the backend's PAIR_CONFIG (signals.py) / GET /prices/pairs —
// every pair the platform can actually price, chart, and generate signals for.
const PAIRS = [
  "EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","USDCHF","NZDUSD",
  "EURGBP","EURJPY","EURAUD","EURCAD","EURCHF","EURNZD",
  "GBPJPY","GBPAUD","GBPCAD","GBPCHF","GBPNZD",
  "AUDCAD","AUDCHF","AUDJPY","AUDNZD","CADCHF","CADJPY","CHFJPY","NZDCAD","NZDCHF","NZDJPY",
  "USDSGD","USDZAR","USDMXN","USDTRY",
  "XAUUSD","XAGUSD","BTCUSD","ETHUSD",
];
// Real currency pairs only — used anywhere the user is picking pairs to trade/copy
// ("my pairs fix to allow only for forex"). Metals/crypto stay visible as market
// info on the Prices ticker but are excluded from signal generation & copy filters.
const FOREX_PAIRS = PAIRS.filter((p) => !["XAUUSD", "XAGUSD", "BTCUSD", "ETHUSD"].includes(p));
const TFS   = ["M1","M5","M15","M30","H1","H4","D1","W1"];

// Broker-style quote precision — JPY crosses & metals trade in fewer decimals,
// everything else uses the standard 4-decimal (fractional-pip) forex convention.
function pairDecimals(pair) {
  if (!pair) return 5;
  if (pair.includes("JPY")) return 3;
  if (pair === "XAUUSD") return 2;
  if (pair === "XAGUSD") return 3;
  if (pair === "BTCUSD") return 2;
  if (pair === "ETHUSD") return 2;
  if (pair === "USDZAR" || pair === "USDMXN" || pair === "USDTRY") return 4;
  return 5;
}

export { ConfRing, CandleChart1, SigCard, PAIRS, FOREX_PAIRS, TFS, pairDecimals };
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

// ─── Confidence ring ──────────────────────────────────────────────────────────
export function ConfRing({ val, size = 54 }) {
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

// ─── Static Candle chart (SVG Fallback) ───────────────────────────────────────
export function CandleChart({ bars = [], entry, sl, tp }) {
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

function toUnixTime(s) {
  if (s == null) return null;
  if (typeof s === "number") return s;
  const iso = s.includes("T") ? s : s.replace(" ", "T") + (s.length <= 16 ? ":00" : "");
  const ms = Date.parse(iso.endsWith("Z") ? iso : iso + "Z");
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

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

const SESSIONS = [
  { name: "Sydney",   startUTC: 22, endUTC: 7,  color: "#a855f7" },
  { name: "Tokyo",    startUTC: 0,  endUTC: 9,  color: "#3b82f6" },
  { name: "London",   startUTC: 8,  endUTC: 17, color: "#22c55e" },
  { name: "New York", startUTC: 13, endUTC: 22, color: "#f59e0b" },
];

function getSessionsMetrics(utcHour) {
  return SESSIONS.map((s) => {
    const isOpen = s.startUTC < s.endUTC
      ? utcHour >= s.startUTC && utcHour < s.endUTC
      : utcHour >= s.startUTC || utcHour < s.endUTC;
    const hoursUntil = isOpen ? 0 : (s.startUTC - utcHour + 24) % 24;
    return { ...s, isOpen, hoursUntil };
  });
}

export default function CandleChart1({
  bars = [],
  entry, sl, tp,
  markers = [],
  supportResistance = [],
  trendline = null,
  liveCandle = null,
  live = false,
  resetKey = "",
  pair = "EURUSD",
  timeframe = "",
  indicators = { ema: true, bb: true, sr: true, trendline: true, volume: true },
  height = 560,
  onTfClick = null,
  draggableSlTp = false,
  onAdjustSlTp = null,
  trades = [],
  selectedTradeId = null,
  onTradeSelect = null,
  enableDrawing = true,
  drawingKey = null,
  api = null,
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
  const priceLinesRef = useRef([]);
  const slLineRef = useRef(null);
  const tpLineRef = useRef(null);
  const dragStateRef = useRef(null);
  const lastBarTimeRef = useRef(null);
  const visibleRangeRef = useRef(null);
  const decimals = pairDecimals(pair);
  const [hover, setHover] = useState(null);
  const [clock, setClock] = useState(0);

  // ── Advanced Drawing Board Module ──
  const canvasRef = useRef(null);
  const dragStartRef = useRef(null);
  const slTpDragRef = useRef(null); // in-progress SL/TP price-line drag: { type: "sl"|"tp", livePrice }
  const storageKey = `yobbyfx_drawings_${drawingKey || resetKey || pair}`;
  
  const [tool, setTool] = useState("none"); 
  const [drawings, setDrawings] = useState([]); 
  const [activePreview, setActivePreview] = useState(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const moveOffsetRef = useRef(null);

  const drawingsRef = useRef(drawings); drawingsRef.current = drawings;
  const previewRef = useRef(activePreview); previewRef.current = activePreview;
  const selectedIdRef = useRef(selectedDrawingId); selectedIdRef.current = selectedDrawingId;
  const hydratedRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => setClock((c) => c + 1), 5000);
    return () => clearInterval(iv);
  }, []);

  // Hydration sync loading
  useEffect(() => {
    if (!enableDrawing) { setDrawings([]); return; }
    hydratedRef.current = !api;
    try {
      const raw = localStorage.getItem(storageKey);
      setDrawings(raw ? JSON.parse(raw) : []);
    } catch { setDrawings([]); }
    setTool("none");
    setActivePreview(null);
    setSelectedDrawingId(null);
    
    if (api && pair && timeframe) {
      api.get(`/prefs/drawings?pair=${encodeURIComponent(pair)}&timeframe=${encodeURIComponent(timeframe)}`)
        .then((res) => {
          if (Array.isArray(res?.rects)) setDrawings(res.rects);
          else if (Array.isArray(res?.drawings)) setDrawings(res.drawings);
          hydratedRef.current = true;
        })
        .catch(() => { hydratedRef.current = true; });
    }
  }, [storageKey, enableDrawing, api, pair, timeframe]);

  // Cloud sync saving
  useEffect(() => {
    if (!enableDrawing) return;
    try { localStorage.setItem(storageKey, JSON.stringify(drawings)); } catch {}
    if (api && pair && timeframe && hydratedRef.current) {
      api.put("/prefs/drawings", { pair, timeframe, rects: drawings }).catch(() => {});
    }
  }, [drawings, storageKey, enableDrawing, api, pair, timeframe]);

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
      const isSelected = item.id === selectedIdRef.current;
      const x1 = ts.timeToCoordinate(typeof item.t1 === "number" ? item.t1 : toUnixTime(item.t1));
      const y1 = series.priceToCoordinate(item.p1);
      
      if (x1 == null || y1 == null) return;

      ctx.lineWidth = isSelected ? 3.0 : (isPreview ? 1.5 : 2.0);
      ctx.strokeStyle = isSelected ? C.gold : (isPreview ? "#facc15" : "#3b82f6");
      ctx.fillStyle = isSelected ? "rgba(250, 204, 21, 0.2)" : (isPreview ? "rgba(250, 204, 21, 0.12)" : "rgba(59, 130, 246, 0.12)");
      ctx.setLineDash(isPreview ? [4, 3] : []);

      if (item.type === "horizontal") {
        ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(w, y1); ctx.stroke();
        if (isSelected) { ctx.fillStyle = C.gold; ctx.fillRect(x1 - 4, y1 - 4, 8, 8); }
      } 
      else if (item.type === "vertical") {
        ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, h); ctx.stroke();
        if (isSelected) { ctx.fillStyle = C.gold; ctx.fillRect(x1 - 4, y1 - 4, 8, 8); }
      } 
      else if (item.type === "trend") {
        const x2 = ts.timeToCoordinate(typeof item.t2 === "number" ? item.t2 : toUnixTime(item.t2));
        const y2 = series.priceToCoordinate(item.p2);
        if (x2 == null || y2 == null) return;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        if (isSelected) {
          ctx.fillStyle = C.gold;
          ctx.fillRect(x1 - 4, y1 - 4, 8, 8);
          ctx.fillRect(x2 - 4, y2 - 4, 8, 8);
        }
      } 
      else if (item.type === "rect") {
        const x2 = ts.timeToCoordinate(typeof item.t2 === "number" ? item.t2 : toUnixTime(item.t2));
        const y2 = series.priceToCoordinate(item.p2);
        if (x2 == null || y2 == null) return;
        const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
        if (isSelected) {
          ctx.fillStyle = C.gold;
          ctx.fillRect(x1 - 4, y1 - 4, 8, 8);
          ctx.fillRect(x2 - 4, y2 - 4, 8, 8);
        }
      }
    };

    drawingsRef.current.forEach(item => drawItem(item, false));
    if (previewRef.current) drawItem(previewRef.current, true);
  }, [enableDrawing, height]);

  useEffect(() => { redrawAllTools(); }, [drawings, activePreview, selectedDrawingId, redrawAllTools]);

  function getCanvasCoords(e) {
    const canvas = canvasRef.current, chart = chartRef.current, series = candleSeriesRef.current;
    if (!canvas || !chart || !series) return null;
    const box = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY;
    if (clientX == null || clientY == null) return null;
    const cx = clientX - box.left;
    const cy = clientY - box.top;
    const t = chart.timeScale().coordinateToTime(cx);
    const p = series.coordinateToPrice(cy);
    return (t != null && p != null) ? { t, p, cx, cy } : null;
  }

  function findDrawingNear(cx, cy) {
    const chart = chartRef.current, series = candleSeriesRef.current;
    if (!chart || !series) return null;
    const ts = chart.timeScale();
    const TOLERANCE_PX = 12;

    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i];
      const x1 = ts.timeToCoordinate(typeof d.t1 === "number" ? d.t1 : toUnixTime(d.t1));
      const y1 = series.priceToCoordinate(d.p1);
      if (x1 == null || y1 == null) continue;

      if (d.type === "horizontal" && Math.abs(y1 - cy) <= TOLERANCE_PX) return d;
      if (d.type === "vertical" && Math.abs(x1 - cx) <= TOLERANCE_PX) return d;
      
      if (d.type === "trend" || d.type === "rect") {
        const x2 = ts.timeToCoordinate(typeof d.t2 === "number" ? d.t2 : toUnixTime(d.t2));
        const y2 = series.priceToCoordinate(d.p2);
        if (x2 == null || y2 == null) continue;
        if (Math.abs(x1 - cx) <= TOLERANCE_PX && Math.abs(y1 - cy) <= TOLERANCE_PX) return d;
        if (Math.abs(x2 - cx) <= TOLERANCE_PX && Math.abs(y2 - cy) <= TOLERANCE_PX) return d;
        if (d.type === "rect") {
          const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
          if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) return d;
        }
      }
    }
    return null;
  }

  const SLTP_TOLERANCE_PX = 10;
  function findSlTpHit(cy) {
    if (!draggableSlTp) return null;
    const series = candleSeriesRef.current;
    if (!series) return null;
    if (sl != null) {
      const y = series.priceToCoordinate(Number(sl));
      if (y != null && Math.abs(y - cy) <= SLTP_TOLERANCE_PX) return "sl";
    }
    if (tp != null) {
      const y = series.priceToCoordinate(Number(tp));
      if (y != null && Math.abs(y - cy) <= SLTP_TOLERANCE_PX) return "tp";
    }
    return null;
  }

  const handleDrawStart = (e) => {
    const pt = getCanvasCoords(e);
    if (!pt) return;

    // SL/TP line drag takes priority over drawing tools, and works no
    // matter which drawing tool (if any) happens to be selected.
    const slTpHit = findSlTpHit(pt.cy);
    if (slTpHit) {
      e.preventDefault();
      slTpDragRef.current = { type: slTpHit, livePrice: Number(slTpHit === "sl" ? sl : tp) };
      return;
    }

    if (tool === "select" || tool === "none") {
      const clicked = findDrawingNear(pt.cx, pt.cy);
      if (clicked) {
        e.preventDefault();
        setSelectedDrawingId(clicked.id);
        setIsMoving(true);
        moveOffsetRef.current = { type: clicked.type, baseT: pt.t, baseP: pt.p, d: { ...clicked } };
      } else {
        setSelectedDrawingId(null);
        // Nothing to draw/select/drag here — fall back to the same
        // "did they click a trade's entry line" hit-test the chart's own
        // click handler does, since this overlay sits above the chart and
        // would otherwise swallow the click before the chart ever sees it.
        const series = candleSeriesRef.current;
        if (series && (tradesRef.current || []).length) {
          const HIT_PX = 10;
          let closest = null, closestDist = Infinity;
          tradesRef.current.forEach((t) => {
            const y = series.priceToCoordinate(Number(t.entry_price));
            if (y == null) return;
            const dist = Math.abs(y - pt.cy);
            if (dist <= HIT_PX && dist < closestDist) { closest = t; closestDist = dist; }
          });
          if (closest) onTradeSelectRef.current?.(closest);
        }
      }
      return;
    }

    e.preventDefault();
    dragStartRef.current = pt;

    if (tool === "horizontal" || tool === "vertical") {
      setDrawings(prev => [...prev, { id: `draw_${Date.now()}`, type: tool, t1: pt.t, p1: pt.p, t2: pt.t, p2: pt.p }]);
      setTool("select");
      dragStartRef.current = null;
    } else {
      setActivePreview({ type: tool, t1: pt.t, p1: pt.p, t2: pt.t, p2: pt.p });
    }
  };

  const handleDrawMove = (e) => {
    const pt = getCanvasCoords(e);
    if (!pt) return;

    if (slTpDragRef.current) {
      e.preventDefault();
      const price = Number(pt.p.toFixed(decimals));
      const lineRef = slTpDragRef.current.type === "sl" ? slLineRef : tpLineRef;
      if (lineRef.current) { try { lineRef.current.applyOptions({ price }); } catch {} }
      slTpDragRef.current.livePrice = price;
      return;
    }

    if (isMoving && moveOffsetRef.current) {
      e.preventDefault();
      const offset = moveOffsetRef.current;
      const deltaP = pt.p - offset.baseP;
      const deltaT = pt.t - offset.baseT;

      setDrawings(prev => prev.map(item => {
        if (item.id !== offset.d.id) return item;
        if (item.type === "horizontal") {
          return { ...item, p1: offset.d.p1 + deltaP, p2: offset.d.p2 + deltaP };
        }
        if (item.type === "vertical") {
          const origT1 = typeof offset.d.t1 === "number" ? offset.d.t1 : toUnixTime(offset.d.t1);
          const newT = origT1 + deltaT;
          return { ...item, t1: newT, t2: newT };
        }
        // trend / rect — translate BOTH endpoints by the same delta so the
        // whole shape slides as one piece instead of one end stretching
        // toward the cursor while the other stays frozen.
        const origT1 = typeof offset.d.t1 === "number" ? offset.d.t1 : toUnixTime(offset.d.t1);
        const origT2 = typeof offset.d.t2 === "number" ? offset.d.t2 : toUnixTime(offset.d.t2);
        return {
          ...item,
          t1: origT1 + deltaT,
          t2: origT2 + deltaT,
          p1: offset.d.p1 + deltaP,
          p2: offset.d.p2 + deltaP,
        };
      }));
      return;
    }

    if (!dragStartRef.current || !activePreview) return;
    e.preventDefault();
    setActivePreview(prev => ({ ...prev, t2: pt.t, p2: pt.p }));
  };

  const handleDrawEnd = (e) => {
    if (slTpDragRef.current) {
      const { type, livePrice } = slTpDragRef.current;
      slTpDragRef.current = null;
      if (livePrice != null) onAdjustSlTp?.(type, livePrice);
      return;
    }

    if (isMoving) {
      setIsMoving(false);
      moveOffsetRef.current = null;
      return;
    }

    if (!dragStartRef.current || !activePreview) return;
    const pt = getCanvasCoords(e);
    const start = dragStartRef.current;
    dragStartRef.current = null;

    if (pt && start) {
      setDrawings(prev => [...prev, { id: `draw_${Date.now()}`, type: tool, t1: start.t, p1: start.p, t2: pt.t, p2: pt.p }]);
    }
    setActivePreview(null);
    setTool("select");
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedDrawingId) {
        setDrawings(prev => prev.filter(d => d.id !== selectedDrawingId));
        setSelectedDrawingId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDrawingId]);

  const barsRef = useRef(bars); barsRef.current = bars;
  const tradesRef = useRef(trades); tradesRef.current = trades;
  const onTradeSelectRef = useRef(onTradeSelect); onTradeSelectRef.current = onTradeSelect;

  // ── Build Chart Hook ──
  useEffect(() => {
    if (!ref.current) return;
    visibleRangeRef.current = null;

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height,
      layout: { background: { color: "#071018" }, textColor: "#94a3b8", fontFamily: "Inter, sans-serif", fontSize: 12 },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#1e293b" },
      timeScale: { borderColor: "#1e293b", timeVisible: true, secondsVisible: false, tickMarkFormatter: (time) => eatTickLabel(time) },
      localization: { timeFormatter: (time) => eatTooltipLabel(time), priceFormatter: (p) => Number(p).toFixed(decimals) },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444", borderUpColor: "#22c55e", borderDownColor: "#ef4444", wickUpColor: "#22c55e", wickDownColor: "#ef4444",
      priceLineVisible: true, priceFormat: { type: "price", precision: decimals, minMove: Math.pow(10, -decimals) },
    });
    candleSeriesRef.current = candleSeries;
    // Indicator series (EMA/BB/Volume/Trendline) are added/removed by the
    // effect below, right after this chart exists — that keeps toggling an
    // indicator from tearing down and rebuilding the whole chart.

    chart.subscribeClick((param) => {
      if (!param.point || tool !== "none") return;
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

    const resize = () => { if (ref.current) chart.applyOptions({ width: ref.current.clientWidth }); redrawAllTools(); };
    window.addEventListener("resize", resize);
    chart.timeScale().subscribeVisibleLogicalRangeChange(redrawAllTools);

    return () => {
      window.removeEventListener("resize", resize);
      // The indicator series belong to this chart instance and are being
      // destroyed along with it — clear the refs so the effect below knows
      // to re-add them fresh on the next chart.
      ema20Ref.current = null; ema50Ref.current = null;
      bbUpRef.current = null; bbLowRef.current = null;
      volRef.current = null; trendRef.current = null;
      chart.remove();
      chartRef.current = null;
    };
  }, [resetKey, decimals]);

  // ── Indicator series — add/remove on the existing chart when a toggle is
  // clicked, instead of rebuilding the whole chart (which caused the visible
  // double-chart flash and jitter). Also reruns after resetKey rebuilds the
  // chart, to re-add whichever indicators are currently on.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (indicators.ema && !ema20Ref.current) {
      ema20Ref.current = chart.addSeries(LineSeries, { color: "#facc15", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: "EMA20" });
      ema50Ref.current = chart.addSeries(LineSeries, { color: "#a855f7", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: "EMA50" });
      ema20Ref.current.setData(barsRef.current.filter((b) => b.ema20 != null).map((b) => ({ time: b.time, value: Number(b.ema20) })));
      ema50Ref.current.setData(barsRef.current.filter((b) => b.ema50 != null).map((b) => ({ time: b.time, value: Number(b.ema50) })));
    } else if (!indicators.ema && ema20Ref.current) {
      try { chart.removeSeries(ema20Ref.current); chart.removeSeries(ema50Ref.current); } catch {}
      ema20Ref.current = null; ema50Ref.current = null;
    }

    if (indicators.bb && !bbUpRef.current) {
      bbUpRef.current  = chart.addSeries(LineSeries, { color: "#60a5fa", lineWidth: 1, lineStyle: 2, priceLineVisible: false });
      bbLowRef.current = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, lineStyle: 2, priceLineVisible: false });
      bbUpRef.current.setData(barsRef.current.filter((b) => (b.bb_upper ?? b.bb_up) != null).map((b) => ({ time: b.time, value: Number(b.bb_upper ?? b.bb_up) })));
      bbLowRef.current.setData(barsRef.current.filter((b) => (b.bb_lower ?? b.bb_low) != null).map((b) => ({ time: b.time, value: Number(b.bb_lower ?? b.bb_low) })));
    } else if (!indicators.bb && bbUpRef.current) {
      try { chart.removeSeries(bbUpRef.current); chart.removeSeries(bbLowRef.current); } catch {}
      bbUpRef.current = null; bbLowRef.current = null;
    }

    if (indicators.volume && !volRef.current) {
      const v = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol", color: "#3d9eff55" });
      v.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      v.setData(barsRef.current.map((b) => ({ time: b.time, value: Number(b.volume) || 0, color: Number(b.close) >= Number(b.open) ? "#22c55e55" : "#ef444455" })));
      volRef.current = v;
    } else if (!indicators.volume && volRef.current) {
      try { chart.removeSeries(volRef.current); } catch {}
      volRef.current = null;
    }

    if (indicators.trendline && !trendRef.current) {
      trendRef.current = chart.addSeries(LineSeries, { color: "#22c55e", lineWidth: 2, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    } else if (!indicators.trendline && trendRef.current) {
      try { chart.removeSeries(trendRef.current); } catch {}
      trendRef.current = null;
    }
  }, [indicators.ema, indicators.bb, indicators.volume, indicators.trendline, resetKey]);

  // Data mapping updates hook
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    if (bars && bars.length > 0) {
      const candleData = bars.map((b) => ({ time: b.time, open: Number(b.open), high: Number(b.high), low: Number(b.low), close: Number(b.close) }));
      candleSeries.setData(candleData);
      lastBarTimeRef.current = candleData[candleData.length - 1].time;

      if (ema20Ref.current) ema20Ref.current.setData(bars.filter((b) => b.ema20 != null).map((b) => ({ time: b.time, value: Number(b.ema20) })));
      if (ema50Ref.current) ema50Ref.current.setData(bars.filter((b) => b.ema50 != null).map((b) => ({ time: b.time, value: Number(b.ema50) })));
      if (bbUpRef.current)  bbUpRef.current.setData(bars.filter((b) => (b.bb_upper ?? b.bb_up) != null).map((b) => ({ time: b.time, value: Number(b.bb_upper ?? b.bb_up) })));
      if (bbLowRef.current) bbLowRef.current.setData(bars.filter((b) => (b.bb_lower ?? b.bb_low) != null).map((b) => ({ time: b.time, value: Number(b.bb_lower ?? b.bb_low) })));
      if (volRef.current) {
        volRef.current.setData(bars.map((b) => ({ time: b.time, value: Number(b.volume) || 0, color: Number(b.close) >= Number(b.open) ? "#22c55e55" : "#ef444455" })));
      }
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
      try { candleSeries.setMarkers(formatted); } catch {}
    } else {
      try { candleSeries.setMarkers([]); } catch {}
    }

    priceLinesRef.current.forEach((pl) => { try { candleSeries.removePriceLine(pl); } catch {} });
    priceLinesRef.current = [];
    slLineRef.current = null;
    tpLineRef.current = null;

    // Entry line only when there's no separate per-trade list already
    // drawing its own entry lines below, to avoid a duplicate overlapping
    // line for the same trade. SL/TP always render when provided — these
    // used to be hidden whenever any trade was open, which is exactly when
    // you'd want to see (and drag) them.
    if (entry && !trades.length) priceLinesRef.current.push(candleSeries.createPriceLine({ price: Number(entry), color: "#f0b429", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: "ENTRY" }));
    if (sl) {
      slLineRef.current = candleSeries.createPriceLine({ price: Number(sl), color: "#ef4444", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: draggableSlTp ? "SL ⇕" : "SL" });
      priceLinesRef.current.push(slLineRef.current);
    }
    if (tp) {
      tpLineRef.current = candleSeries.createPriceLine({ price: Number(tp), color: "#22c55e", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: draggableSlTp ? "TP ⇕" : "TP" });
      priceLinesRef.current.push(tpLineRef.current);
    }

    trades.forEach((t) => {
      const color = t.direction === "BUY" ? "#22c55e" : "#ef4444";
      priceLinesRef.current.push(candleSeries.createPriceLine({
        price: Number(t.entry_price), color: t.id === selectedTradeId ? "#f59e0b" : color, lineWidth: t.id === selectedTradeId ? 3 : 1.5, axisLabelVisible: true,
        title: `${t.direction} (${t.lot_size})`,
      }));
    });

    if (indicators.sr) (supportResistance || []).forEach((lvl) => {
      const isRes = lvl.type === "resistance";
      priceLinesRef.current.push(candleSeries.createPriceLine({ price: Number(lvl.price), color: isRes ? "#fb7185" : "#34d399", lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: isRes ? "Resistance" : "Support" }));
    });

    redrawAllTools();
  }, [bars, markers, supportResistance, trendline, trades, selectedTradeId, entry, sl, tp, indicators.sr, redrawAllTools]);

  // Real-time ticking stream handler
  useEffect(() => {
    if (!liveCandle || !candleSeriesRef.current) return;
    const t = typeof liveCandle.time === "number" ? liveCandle.time : toUnixTime(liveCandle.time);
    if (t == null) return;
    try {
      // Just push the tick into the series. The price scale already autoscales
      // on data changes by default — re-forcing autoScale:true on every single
      // tick (multiple times a second) was what made the whole chart jitter.
      candleSeriesRef.current.update({ time: t, open: Number(liveCandle.open), high: Number(liveCandle.high), low: Number(liveCandle.low), close: Number(liveCandle.close) });
    } catch {}
  }, [liveCandle]);

  const utcHour = new Date().getUTCHours();
  const sessionData = getSessionsMetrics(utcHour);

  return (
    <div style={{ position: "relative", width: "100%", background: "#071018", borderRadius: 18, overflow: "hidden" }}>
      
      {/* ── Top Header Badge Info Rows ── */}
      <div style={{ position: "absolute", top: 8, left: 10, right: 10, zIndex: 10, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, pointerEvents: "none" }}>
        <div style={{ display: "flex", gap: 6, background: "rgba(7,16,24,0.85)", border: "1px solid #1e293b", borderRadius: 8, padding: "4px 8px", pointerEvents: "auto", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{pair}</span>
          {timeframe && (
            <span
              onClick={() => onTfClick && onTfClick()}
              title={onTfClick ? "Tap to change timeframe" : undefined}
              style={{
                fontSize: 11, fontWeight: 700, color: C.gold, background: `${C.gold}1a`,
                border: `1px solid ${C.gold}33`, borderRadius: 5, padding: "1px 6px",
                cursor: onTfClick ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 3,
              }}
            >
              {timeframe}{onTfClick && <span style={{ fontSize: 8, opacity: 0.8 }}>▼</span>}
            </span>
          )}
          {hover && (
            <span style={{ fontSize: 10, color: "#94a3b8", display: "flex", gap: 5 }}>
              <span>O<b style={{ color: "#cbd5e1" }}>{fp(hover.o, decimals)}</b></span>
              <span>H<b style={{ color: "#22c55e" }}>{fp(hover.h, decimals)}</b></span>
              <span>L<b style={{ color: "#ef4444" }}>{fp(hover.l, decimals)}</b></span>
              <span>C<b style={{ color: "#cbd5e1" }}>{fp(hover.c, decimals)}</b></span>
            </span>
          )}
        </div>
        
        {/* Live Active + Upcoming Global Trading Sessions Widget Banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(7,16,24,0.85)", border: "1px solid #1e293b", borderRadius: 8, padding: "4px 8px", pointerEvents: "auto", fontSize: 10, color: "#94a3b8", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, color: "#cbd5e1", fontFamily: "monospace" }}>{eatNowLabel()} EAT</span>
          <span style={{ opacity: 0.35 }}>·</span>
          {sessionData.map((s) => (
            <span key={s.name} style={{ display: "flex", alignItems: "center", gap: 3, opacity: s.isOpen ? 1 : 0.45 }} title={s.isOpen ? "Active Now" : `Opens in ${s.hoursUntil}h`}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, boxShadow: s.isOpen ? `0 0 5px ${s.color}` : "none" }} />
              <span>{s.name}{s.isOpen ? "" : ` (${s.hoursUntil}h)`}</span>
            </span>
          ))}
        </div>
      </div>

      {live && (
        <div style={{ position: "absolute", top: 45, right: 14, zIndex: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(7,16,24,0.85)", border: "1px solid #1e293b", borderRadius: 20, padding: "3px 10px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
          <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>LIVE</span>
        </div>
      )}

      {/* Unified Drawing Layer Overlay Frame */}
      <div style={{ position: "relative", width: "100%", height: `${height}px` }}>
        <div ref={ref} style={{ width: "100%", height: "100%" }} />
        {enableDrawing && (
          <canvas
            ref={canvasRef}
            onMouseDown={handleDrawStart} onMouseMove={handleDrawMove} onMouseUp={handleDrawEnd} onMouseLeave={handleDrawEnd}
            onTouchStart={handleDrawStart} onTouchMove={handleDrawMove} onTouchEnd={handleDrawEnd}
            style={{
              position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
              zIndex: 5, cursor: tool !== "none" ? "crosshair" : "default",
              pointerEvents: (tool !== "none" || selectedDrawingId || drawings.length > 0 || draggableSlTp) ? "auto" : "none", touchAction: "none"
            }}
          />
        )}
      </div>

      {/* Drawing Controls Terminal Dock */}
      {enableDrawing && (
        <div style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 20, display: "flex", alignItems: "center", gap: 4,
          background: "rgba(11, 23, 35, 0.95)", border: "1px solid #1f2937", borderRadius: 8, padding: 4,
          boxShadow: "0 4px 16px rgba(0,0,0,0.6)"
        }}>
          <button onClick={() => setTool(t => t === "select" ? "none" : "select")} title="Select / Move Tool"
            style={{ width: 28, height: 28, background: tool === "select" ? `${C.gold}25` : "transparent", border: `1px solid ${tool === "select" ? C.gold : "#1e293b"}`, borderRadius: 5, cursor: "pointer", color: tool === "select" ? C.gold : "#94a3b8", fontSize: 12 }}>
            ⬈
          </button>
          <button onClick={() => setTool("horizontal")} title="Horizontal Axis Line"
            style={{ width: 28, height: 28, background: tool === "horizontal" ? `${C.gold}25` : "transparent", border: `1px solid ${tool === "horizontal" ? C.gold : "#1e293b"}`, borderRadius: 5, cursor: "pointer", color: tool === "horizontal" ? C.gold : "#94a3b8" }}>
            ―
          </button>
          <button onClick={() => setTool("vertical")} title="Vertical Timeline Anchor"
            style={{ width: 28, height: 28, background: tool === "vertical" ? `${C.gold}25` : "transparent", border: `1px solid ${tool === "vertical" ? C.gold : "#1e293b"}`, borderRadius: 5, cursor: "pointer", color: tool === "vertical" ? C.gold : "#94a3b8" }}>
            ｜
          </button>
          <button onClick={() => setTool("trend")} title="Trend Line Vector"
            style={{ width: 28, height: 28, background: tool === "trend" ? `${C.gold}25` : "transparent", border: `1px solid ${tool === "trend" ? C.gold : "#1e293b"}`, borderRadius: 5, cursor: "pointer", color: tool === "trend" ? C.gold : "#94a3b8", fontSize: 13 }}>
            ╱
          </button>
          <button onClick={() => setTool("rect")} title="Demand Area Box"
            style={{ width: 28, height: 28, background: tool === "rect" ? `${C.gold}25` : "transparent", border: `1px solid ${tool === "rect" ? C.gold : "#1e293b"}`, borderRadius: 5, cursor: "pointer", color: tool === "rect" ? C.gold : "#94a3b8" }}>
            ▭
          </button>

          {(drawings.length > 0 || selectedDrawingId) && (
            <>
              <div style={{ width: 1, height: 16, background: "#1e293b", margin: "0 4px" }} />
              <button 
                onClick={() => {
                  if (selectedDrawingId) {
                    setDrawings(prev => prev.filter(d => d.id !== selectedDrawingId));
                    setSelectedDrawingId(null);
                  } else {
                    setDrawings(prev => prev.slice(0, -1));
                  }
                }} 
                title={selectedDrawingId ? "Delete Active Selection" : "Undo Action"}
                style={{ width: 28, height: 28, background: "transparent", border: "1px solid #1e293b", borderRadius: 5, cursor: "pointer", color: selectedDrawingId ? "#ef4444" : "#94a3b8", fontSize: 12 }}
              >
                {selectedDrawingId ? "🗑️" : "↺"}
              </button>
              <button onClick={() => { setDrawings([]); setSelectedDrawingId(null); }} title="Clear Canvas"
                style={{ width: 28, height: 28, background: "transparent", border: "1px solid #ef444455", borderRadius: 5, cursor: "pointer", color: "#ef4444", fontSize: 11 }}>
                ✕
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Signal card presentation helper ─────────────────────────────────────────
export function SigCard({ s, selected, onClick }) {
  const buy = s.direction === "BUY";
  const dc  = buy ? C.green : C.red;
  const sc  = { STRONG: C.green, MODERATE: C.gold, WEAK: "#f97316", AVOID: C.red }[s.strength] || C.muted;
  const isOpen = s.status !== "closed";

  return (
    <div
      className="sig-card"
      onClick={onClick}
      style={{
        position: "relative",
        background: selected
          ? `linear-gradient(135deg, ${C.gold}14, ${C.surf2})`
          : C.surf,
        border: `1px solid ${selected ? C.gold : C.border}`,
        borderLeft: `3px solid ${dc}`,
        borderRadius: 12,
        padding: "14px 15px",
        marginBottom: 9,
        cursor: "pointer",
        boxShadow: selected ? `0 6px 20px ${C.gold}1f` : "0 1px 0 rgba(0,0,0,0.2)",
      }}
    >
      <style>{`
        .sig-card { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
        .sig-card:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(0,0,0,0.35); }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.2 }}>{s.pair}</span>
          <Badge col={dc}>{buy ? "▲ BUY" : "▼ SELL"}</Badge>
          <Badge col={C.muted}>{s.timeframe}</Badge>
          {isOpen && (
            <span title="Signal live / open" style={{
              width: 6, height: 6, borderRadius: "50%", background: C.green,
              boxShadow: `0 0 6px ${C.green}`,
            }} />
          )}
        </div>
        <ConfRing val={s.confidence} size={50} />
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, fontSize: 11,
        background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`,
        borderRadius: 8, padding: "8px 9px", marginBottom: 9,
      }}>
        {[["ENTRY", fp(s.entry_price), C.text], ["SL", fp(s.stop_loss), C.red], ["TP", fp(s.take_profit), C.green],
          ["SL PIPS", f1(s.sl_pips), C.red], ["TP PIPS", f1(s.tp_pips), C.green], ["R:R", `1:${s.risk_reward}`, C.gold],
        ].map(([l, v, c]) => (
          <div key={l}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 0.6, marginBottom: 2 }}>{l}</div>
            <div style={{ fontWeight: 700, fontFamily: "monospace", color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
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
      {s.entry_time && <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>{s.entry_time}</div>}
    </div>
  );
}

export const PAIRS = [
  "EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","USDCHF","NZDUSD",
  "EURGBP","EURJPY","EURAUD","EURCAD","EURCHF","EURNZD",
  "GBPJPY","GBPAUD","GBPCAD","GBPCHF","GBPNZD",
  "AUDCAD","AUDCHF","AUDJPY","AUDNZD","CADCHF","CADJPY","CHFJPY","NZDCAD","NZDCHF","NZDJPY",
  "USDSGD","USDZAR","USDMXN","USDTRY",
  "XAUUSD","XAGUSD","BTCUSD","ETHUSD",
];
export const FOREX_PAIRS = PAIRS.filter((p) => !["XAUUSD", "XAGUSD", "BTCUSD", "ETHUSD"].includes(p));
export const TFS   = ["M1","M5","M15","M30","H1","H4","D1","W1"];

export function pairDecimals(pair) {
  if (!pair) return 5;
  if (pair.includes("JPY")) return 3;
  if (pair === "XAUUSD") return 2;
  if (pair === "XAGUSD") return 3;
  if (pair === "BTCUSD") return 2;
  if (pair === "ETHUSD") return 2;
  if (pair === "USDZAR" || pair === "USDMXN" || pair === "USDTRY") return 4;
  return 5;
}
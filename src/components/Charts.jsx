// ─── Confidence ring ──────────────────────────────────────────────────────────
import { C } from "../utils/constants.jsx";
import { fp, f1 } from "../utils/utils.js";
import { Badge } from "../shared/Shared.jsx";
import { ago } from "../utils/utils.js";
import { useEffect, useRef, useState } from "react";

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
  onTradeSelect=null
}) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const lastBarTimeRef = useRef(null);
  const decimals = pairDecimals(pair);
  const visibleRangeRef = useRef(null);   // preserved pan/zoom across data-only rebuilds
  const lastResetKeyRef = useRef(null);   // only refit the view on a genuine pair/timeframe change
  const [hover, setHover] = useState(null); // live OHLC+volume under the crosshair, for the on-chart header
  const slLineRef = useRef(null);
  const tpLineRef = useRef(null);
  const dragStateRef = useRef(null); // 'sl' | 'tp' | null — which line (if any) is currently being dragged

  // ── Full (re)build: runs on mount and whenever the pair/timeframe/bar-set changes ──
  useEffect(() => {
    if (!ref.current) return;
    if (!bars.length) return;

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height,
      layout: { background: { color: "#071018" }, textColor: "#94a3b8", fontFamily: "Inter, sans-serif", fontSize: 12 },
      grid: { vertLines: { color: "rgba(255,255,255,0.05)" }, horzLines: { color: "rgba(255,255,255,0.05)" } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#1e293b" },
      timeScale: {
        borderColor: "#1e293b", timeVisible: true, secondsVisible: false,
        // MT5-style axis labels: "08 Jul 14:00" for intraday, date-only when zoomed out to daily bars.
        tickMarkFormatter: (time) => {
          const d = new Date(time * 1000);
          const dd = String(d.getUTCDate()).padStart(2, "0");
          const mon = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
          const hh = String(d.getUTCHours()).padStart(2, "0");
          const mm = String(d.getUTCMinutes()).padStart(2, "0");
          return `${dd} ${mon} ${hh}:${mm}`;
        },
      },
      localization: {
        // Crosshair/tooltip date — MT5 shows "YYYY.MM.DD HH:mm"
        timeFormatter: (time) => {
          const d = new Date(time * 1000);
          const yyyy = d.getUTCFullYear();
          const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
          const dd = String(d.getUTCDate()).padStart(2, "0");
          const hh = String(d.getUTCHours()).padStart(2, "0");
          const mi = String(d.getUTCMinutes()).padStart(2, "0");
          return `${yyyy}.${mm}.${dd} ${hh}:${mi} UTC`;
        },
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

    const candleData = bars.map((b) => ({
      time: b.time, open: Number(b.open), high: Number(b.high), low: Number(b.low), close: Number(b.close),
    }));
    candleSeries.setData(candleData);
    lastBarTimeRef.current = candleData.length ? candleData[candleData.length - 1].time : null;

    // EMA20 / EMA50
    if (indicators.ema && bars.some((b) => b.ema20 != null)) {
      const s = chart.addSeries(LineSeries, { color: "#facc15", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: "EMA20" });
      s.setData(bars.filter((b) => b.ema20 != null).map((b) => ({ time: b.time, value: Number(b.ema20) })));
    }
    if (indicators.ema && bars.some((b) => b.ema50 != null)) {
      const s = chart.addSeries(LineSeries, { color: "#a855f7", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: "EMA50" });
      s.setData(bars.filter((b) => b.ema50 != null).map((b) => ({ time: b.time, value: Number(b.ema50) })));
    }
    // Bollinger bands
    if (indicators.bb && bars.some((b) => b.bb_upper ?? b.bb_up)) {
      const s = chart.addSeries(LineSeries, { color: "#60a5fa", lineWidth: 1, lineStyle: 2, priceLineVisible: false });
      s.setData(bars.filter((b) => (b.bb_upper ?? b.bb_up) != null).map((b) => ({ time: b.time, value: Number(b.bb_upper ?? b.bb_up) })));
    }
    if (indicators.bb && bars.some((b) => b.bb_lower ?? b.bb_low)) {
      const s = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, lineStyle: 2, priceLineVisible: false });
      s.setData(bars.filter((b) => (b.bb_lower ?? b.bb_low) != null).map((b) => ({ time: b.time, value: Number(b.bb_lower ?? b.bb_low) })));
    }
    // Volume histogram — pinned to the bottom ~15% of the pane via its own price scale
    if (indicators.volume && bars.some((b) => b.volume != null)) {
      const volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" }, priceScaleId: "vol",
        color: "#3d9eff55",
      });
      volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      volSeries.setData(bars.map((b) => ({
        time: b.time, value: Number(b.volume) || 0,
        color: Number(b.close) >= Number(b.open) ? "#22c55e55" : "#ef444455",
      })));
    }

    // ── Entry / Stop Loss / Take Profit — native price lines with labels ──
    const priceLines = [];
   /* if (entry) priceLines.push(candleSeries.createPriceLine({ price: Number(entry), color: "#f0b429", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: "ENTRY" }));
    if (sl) {
      const slLine = candleSeries.createPriceLine({ price: Number(sl), color: "#ef4444", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: draggableSlTp ? "SL ⇕" : "SL" });
      priceLines.push(slLine);
      slLineRef.current = slLine;
    }
    if (tp) {
      const tpLine = candleSeries.createPriceLine({ price: Number(tp), color: "#22c55e", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: draggableSlTp ? "TP ⇕" : "TP" });
      priceLines.push(tpLine);
      tpLineRef.current = tpLine;
    }
*/
        // ── Active trades — native price lines with labels ──
    trades.forEach((t) => {

    const color =
        t.direction === "BUY"
            ? "#22c55e"
            : "#ef4444";

    // ENTRY ALWAYS
    priceLines.push(
        candleSeries.createPriceLine({
            price: Number(t.entry_price),
            color: t.id === selectedTradeId ? "#f59e0b" : color,
            lineWidth: t.id === selectedTradeId ? 4 : 2,
            lineStyle: t.id === selectedTradeId ? 0 : 3,
            axisLabelVisible: true,
            title: `${t.direction} ${t.pair} (${t.pnl_usd >= 0 ? "+" : ""}${fp(t.pnl_usd, 2)} USD, ${t.pnl_pips}p) (${t.lot_size})`,
        })
    );

    // only selected trade shows SL & TP
    if (t.id !== selectedTradeId) return;

    const slLine = candleSeries.createPriceLine({
        price: Number(t.stop_loss),
        color: "#ef4444",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: draggableSlTp ? "SL ⇕" : "SL",
    });

    const tpLine = candleSeries.createPriceLine({
        price: Number(t.take_profit),
        color: "#22c55e",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: draggableSlTp ? "TP ⇕" : "TP",
    });

    priceLines.push(slLine);
    priceLines.push(tpLine);

    slLineRef.current = slLine;
    tpLineRef.current = tpLine;

});

chart.subscribeClick((param)=>{

    if(!param.point) return;

    const clickedPrice =
        candleSeries.coordinateToPrice(param.point.y);

    if(clickedPrice==null) return;

    const tolerance=0.0005;

    const trade=trades.find(t=>
        Math.abs(clickedPrice-Number(t.entry_price)) < tolerance
    );

    if(trade){
      onTradeSelect?.(trade);
    }

});


    // ── Support / Resistance — dashed horizontal levels ──
    if (indicators.sr) (supportResistance || []).forEach((lvl) => {
      const isRes = lvl.type === "resistance";
      priceLines.push(candleSeries.createPriceLine({
        price: Number(lvl.price),
        color: isRes ? "#fb7185" : "#34d399",
        lineWidth: 1, lineStyle: 3, axisLabelVisible: true,
        title: isRes ? "Resistance" : "Support",
      }));
    });

    // ── Trendline — a 2-point line series through recent swing highs/lows ──
    let trendSeries = null;
    if (indicators.trendline && trendline?.p1 && trendline?.p2) {
      const t1 = toUnixTime(trendline.p1.time), t2 = toUnixTime(trendline.p2.time);
      if (t1 != null && t2 != null) {
        trendSeries = chart.addSeries(LineSeries, {
          color: trendline.direction === "up" ? "#22c55e" : "#ef4444",
          lineWidth: 2, lineStyle: 0, priceLineVisible: false, lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        trendSeries.setData([
          { time: t1, value: Number(trendline.p1.value) },
          { time: t2, value: Number(trendline.p2.value) },
        ]);
      }
    }

    // ── Candle-pattern / signal markers (arrows + labels) ──
    if (markers?.length) {
      const formatted = markers
        .map((m) => ({ ...m, time: toUnixTime(m.time) }))
        .filter((m) => m.time != null)
        .sort((a, b) => a.time - b.time);
      try {
        candleSeries.setMarkers(formatted);
      } catch {
        /* older/newer lightweight-charts marker API mismatch — ignore gracefully */
      }
    }

    // ── On-chart header data: track OHLC + volume under the crosshair (or the
    // latest bar when not hovering) so the overlay never needs a separate row
    // of text above the chart — this is the fix for "names" eating vertical
    // space on small Android screens.
    const lastBar = bars[bars.length - 1];
    setHover({ o: lastBar.open, h: lastBar.high, l: lastBar.low, c: lastBar.close, v: lastBar.volume ?? null, time: lastBar.time });
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setHover({ o: lastBar.open, h: lastBar.high, l: lastBar.low, c: lastBar.close, v: lastBar.volume ?? null, time: lastBar.time });
        return;
      }
      const d = param.seriesData.get(candleSeries);
      if (d) setHover({ o: d.open, h: d.high, l: d.low, c: d.close, v: bars.find(b => b.time === param.time)?.volume ?? null, time: param.time });
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
        if (finalPrice != null) onAdjustSlTp({type, finalPrice});
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

    // A new candle closing shouldn't yank the chart back to "fit everything" if the
    // user has panned/zoomed to look at something specific — only refit on an actual
    // pair/timeframe/indicator change (a fresh resetKey), otherwise restore exactly
    // where they were looking.
    const isFreshView = lastResetKeyRef.current !== resetKey;
    lastResetKeyRef.current = resetKey;
    if (isFreshView || !visibleRangeRef.current) {
      chart.timeScale().fitContent();
    } else {
      try { chart.timeScale().setVisibleLogicalRange(visibleRangeRef.current); }
      catch { chart.timeScale().fitContent(); }
    }

    const resize = () => { if (ref.current) chart.applyOptions({ width: ref.current.clientWidth }); };
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (dragCleanup) dragCleanup();
      try { visibleRangeRef.current = chart.timeScale().getVisibleLogicalRange(); } catch { /* noop */ }
      priceLines.forEach((pl) => { try { candleSeries.removePriceLine(pl); } catch { /* noop */ } });
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      slLineRef.current = null;
      tpLineRef.current = null;
    };
  }, [resetKey, bars, indicators.ema, indicators.bb, indicators.sr, indicators.trendline, indicators.volume]); // eslint-disable-line react-hooks/exhaustive-deps

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
      lastBarTimeRef.current = t;
    } catch {
      /* stale series ref during a rebuild — safe to ignore, next tick will succeed */
    }
  }, [liveCandle]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{
        position: "absolute", top: 8, left: 10, right: 10, zIndex: 3,
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8,
        pointerEvents: "none", // let clicks through to the chart except on the badge itself
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

const PAIRS = ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","USDCHF","NZDUSD","EURGBP","EURJPY","GBPJPY","XAUUSD","BTCUSD"];
// Real currency pairs only — used anywhere the user is picking pairs to trade/copy
// ("my pairs fix to allow only for forex"). XAUUSD/BTCUSD stay visible as market
// info on the Prices ticker but are excluded from signal generation & copy filters.
const FOREX_PAIRS = ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","USDCHF","NZDUSD","EURGBP","EURJPY","GBPJPY"];
const TFS   = ["M1","M5","M15","M30","H1","H4","D1","W1"];

// Broker-style quote precision — JPY crosses & metals trade in fewer decimals,
// everything else uses the standard 4-decimal (fractional-pip) forex convention.
function pairDecimals(pair) {
  if (!pair) return 5;
  if (pair.includes("JPY")) return 3;
  if (pair === "XAUUSD") return 2;
  if (pair === "BTCUSD") return 2;
  return 5;
}

export { ConfRing, CandleChart1, SigCard, PAIRS, FOREX_PAIRS, TFS, pairDecimals };
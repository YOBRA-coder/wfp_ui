// ─── Shared UI components (FULLY RESPONSIVE) ─────────────────────────────────
import { C } from "../utils/constants.jsx";
import { useEffect, useState } from "react";

// ─── Responsive Hook ─────────────────────────────────────────────────────────
export function useMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(max-width: ${breakpoint}px)`).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = (e) => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return mobile;
}

// ─── Card ────────────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => {
  const mobile = useMobile();

  return (
    <div
      style={{
        background: C.surf,
        border: `1px solid ${C.border}`,
        borderRadius: mobile ? 8 : 10,
        padding: mobile ? 12 : 16,
        marginBottom: 14,
        width: "100%",
        overflowX: "auto",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ─── SectionTitle ────────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => {
  const mobile = useMobile();

  return (
    <div
      style={{
        fontSize: mobile ? 9 : 10,
        fontWeight: 700,
        color: C.muted,
        letterSpacing: 2,
        textTransform: "uppercase",
        marginBottom: mobile ? 10 : 13,
      }}
    >
      {children}
    </div>
  );
};

// ─── Stat ────────────────────────────────────────────────────────────────────
const Stat = ({ label, value, sub, color }) => {
  const mobile = useMobile();

  return (
    <div
      style={{
        background: C.surf2,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: mobile ? 10 : 13,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: C.muted,
          letterSpacing: 0.5,
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: mobile ? 16 : 22,
          fontWeight: 700,
          color: color || C.text,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>

      {sub && (
        <div
          style={{
            fontSize: 10,
            color: C.muted,
            marginTop: 3,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};

// ─── Badge ───────────────────────────────────────────────────────────────────
const Badge = ({ col, children }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 10,
      padding: "3px 8px",
      borderRadius: 99,
      border: `1px solid ${col}`,
      color: col,
      background: col + "18",
      fontWeight: 700,
      letterSpacing: 0.5,
      flexShrink: 0,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

// ─── Button ──────────────────────────────────────────────────────────────────
const Btn = ({
  onClick,
  disabled,
  children,
  col = C.gold,
  ghost = false,
  full = false,
  style = {},
}) => {
  const mobile = useMobile();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: mobile ? "8px 12px" : "8px 16px",
        borderRadius: 7,
        fontSize: mobile ? 11 : 12,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        border: `1px solid ${col}`,
        fontFamily: "inherit",
        transition: "all .15s",
        background: ghost ? "transparent" : col,
        color: ghost ? col : col === C.gold ? C.bg : "#fff",
        opacity: disabled ? 0.5 : 1,
        width: full ? "100%" : undefined,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </button>
  );
};

// ─── Input ───────────────────────────────────────────────────────────────────
const Inp = ({
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  step,
  rows,
  style = {},
}) => {
  const mobile = useMobile();

  const base = {
    width: "100%",
    padding: mobile ? "8px" : "8px 10px",
    background: C.surf2,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.text,
    fontSize: mobile ? 11 : 12,
    fontFamily: "inherit",
    boxSizing: "border-box",
    ...style,
  };

  return rows ? (
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      style={{
        ...base,
        resize: "vertical",
      }}
    />
  ) : (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      style={base}
    />
  );
};

// ─── Select ──────────────────────────────────────────────────────────────────
const Sel = ({ value, onChange, options }) => {
  const mobile = useMobile();

  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        padding: mobile ? "8px" : "8px 10px",
        background: C.surf2,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        color: C.text,
        fontSize: mobile ? 11 : 12,
        fontFamily: "inherit",
        boxSizing: "border-box",
      }}
    >
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        )
      )}
    </select>
  );
};

// ─── Pill ────────────────────────────────────────────────────────────────────
const Pill = ({ on, onClick, children }) => {
  const mobile = useMobile();

  return (
    <button
      onClick={onClick}
      style={{
        padding: mobile ? "4px 8px" : "3px 9px",
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 700,
        cursor: "pointer",
        border: `1px solid ${on ? C.gold : C.border}`,
        background: on ? C.gold + "18" : "transparent",
        color: on ? C.gold : C.muted,
        fontFamily: "inherit",
        transition: "all .15s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
};

// ─── Form Group ──────────────────────────────────────────────────────────────
const FG = ({ label, children }) => {
  const mobile = useMobile();

  return (
    <div style={{ marginBottom: mobile ? 10 : 12 }}>
      {label && (
        <label
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: C.muted,
            letterSpacing: 0.5,
            display: "block",
            marginBottom: 5,
            textTransform: "uppercase",
          }}
        >
          {label}
        </label>
      )}

      {children}
    </div>
  );
};

// ─── InfoBox ─────────────────────────────────────────────────────────────────
const InfoBox = ({ col = C.blue, children }) => (
  <div
    style={{
      background: col + "12",
      border: `1px solid ${col}30`,
      borderLeft: `3px solid ${col}`,
      borderRadius: "0 8px 8px 0",
      padding: "11px 14px",
      marginBottom: 13,
      width: "100%",
      boxSizing: "border-box",
    }}
  >
    {children}
  </div>
);

// ─── Error Box ───────────────────────────────────────────────────────────────
const ErrBox = ({ msg }) =>
  msg ? (
    <div
      style={{
        background: C.red + "18",
        border: `1px solid ${C.red}`,
        borderRadius: 7,
        padding: "8px 12px",
        color: C.red,
        fontSize: 11,
        marginBottom: 10,
        wordBreak: "break-word",
      }}
    >
      {msg}
    </div>
  ) : null;

// ─── Success Box ─────────────────────────────────────────────────────────────
const OkBox = ({ msg }) =>
  msg ? (
    <div
      style={{
        background: C.green + "18",
        border: `1px solid ${C.green}`,
        borderRadius: 7,
        padding: "8px 12px",
        color: C.green,
        fontSize: 11,
        marginBottom: 10,
        wordBreak: "break-word",
      }}
    >
      {msg}
    </div>
  ) : null;

// ─── Grid ────────────────────────────────────────────────────────────────────
const Grid = ({
  cols = "1fr 1fr",
  mobileCols = "1fr",
  gap = 14,
  children,
  style = {},
}) => {
  const mobile = useMobile();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: mobile ? mobileCols : cols,
        gap,
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ─── ChartWrap ───────────────────────────────────────────────────────────────
const ChartWrap = ({ label, children }) => {
  const mobile = useMobile();

  return (
    <div
      style={{
        background: C.surf2,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: mobile ? 10 : 11,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: C.muted,
          letterSpacing: 2,
          marginBottom: 7,
        }}
      >
        {label}
      </div>

      {children}
    </div>
  );
};

// ─── Modal ───────────────────────────────────────────────────────────────────
const Modal = ({ onClose, children }) => {
  const mobile = useMobile();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99,
        padding: mobile ? 14 : 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.surf,
          border: `1px solid ${C.border}`,
          borderRadius: 13,
          padding: mobile ? 18 : 26,
          width: mobile ? "100%" : 460,
          maxWidth: "100%",
          maxHeight: "85dvh",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// ─── ProgressBar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ pct, col = C.gold }) => (
  <div
    style={{
      height: 4,
      background: C.surf2,
      borderRadius: 2,
      overflow: "hidden",
      marginBottom: 4,
      width: "100%",
    }}
  >
    <div
      style={{
        width: `${Math.min(100, pct)}%`,
        height: "100%",
        background: col,
        borderRadius: 2,
        transition: "width .4s",
      }}
    />
  </div>
);

// ─── Row ─────────────────────────────────────────────────────────────────────
const Row = ({ children, style = {}, onClick, ...rest }) => {
  const mobile = useMobile();

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: mobile ? "column" : "row",
        alignItems: mobile ? "flex-start" : "center",
        gap: mobile ? 6 : 8,
        padding: "10px 0",
        borderBottom: `1px solid ${C.border}20`,
        width: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

export {
  Card,
  SectionTitle,
  Stat,
  Badge,
  Btn,
  Inp,
  Sel,
  Pill,
  FG,
  InfoBox,
  ErrBox,
  OkBox,
  Grid,
  ChartWrap,
  Modal,
  ProgressBar,
  Row,
};
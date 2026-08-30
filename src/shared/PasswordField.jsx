// ─── PasswordField ───────────────────────────────────────────────────────────
// Password input with a show/hide eye toggle, and an optional strength meter
// (pass showStrength) for signup/reset flows. Plain Inp-style visuals so it
// drops into any existing FG label wrapper.
import { useState } from "react";
import { C } from "../utils/constants.jsx";
import { useMobile } from "./Shared.jsx";
import { passwordStrength } from "../utils/passwordStrength.js";

export default function PasswordField({ value, onChange, placeholder = "••••••••", showStrength = false, autoComplete }) {
  const mobile = useMobile();
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? passwordStrength(value) : null;

  return (
    <div>
      <div style={{ position: "relative" }}>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: "100%",
            padding: mobile ? "8px 36px 8px 8px" : "8px 38px 8px 10px",
            background: C.surf2,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.text,
            fontSize: mobile ? 11 : 12,
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          title={visible ? "Hide password" : "Show password"}
          style={{
            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: C.muted,
            fontSize: 14, padding: 4, lineHeight: 1,
          }}
        >
          {visible ? "🙈" : "👁"}
        </button>
      </div>
      {showStrength && value && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: i < strength.score ? strength.color : C.border,
                  transition: "background .15s",
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 10, color: strength.color, fontWeight: 600 }}>{strength.label}</div>
        </div>
      )}
    </div>
  );
}

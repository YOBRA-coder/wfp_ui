// ─── Icon set ────────────────────────────────────────────────────────────────
// A single, consistent stroke-based icon system (1.7px stroke, 20x20 grid,
// currentColor) replacing the emoji glyphs (🔔📖🎓💳 etc.) previously used
// across the sidebar, mobile nav, and top bar. Emoji render inconsistently
// across OS/browser and read as placeholder chrome in a fintech product —
// a real icon set is part of what "premium, minimalist" means here.

const paths = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  signals: <polyline points="3 13 8 13 10 7 13 17 15 13 21 13" />,
  copy: (
    <>
      <path d="M7 3h11a1 1 0 0 1 1 1v11" />
      <rect x="3" y="7" width="12" height="14" rx="1.6" />
    </>
  ),
  providers: <polygon points="12 2.5 15 9 22 10 17 15 18.2 21.5 12 18.2 5.8 21.5 7 15 2 10 9 9 12 2.5" />,
  education: (
    <>
      <path d="M2.5 9 12 4l9.5 5-9.5 5-9.5-5Z" />
      <path d="M6.5 11.3V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.7" />
    </>
  ),
  journal: (
    <>
      <path d="M5 3.5h11.5a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V3.5Z" />
      <path d="M5 17.2c0-1 .8-1.7 1.8-1.7h9.7" />
      <path d="M8.3 7.3h6.4M8.3 10.3h6.4" />
    </>
  ),
  prices: (
    <>
      <path d="M4 20V10M10.5 20V4M17 20v-7" />
      <path d="M2 20.5h20" />
    </>
  ),
  billing: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="M2.5 9.8h19" />
      <path d="M6 14.3h4.5" />
    </>
  ),
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 4 1.3 5.6 2 6.4H4c.7-.8 2-2.4 2-6.4Z M9.3 18.5a2.7 2.7 0 0 0 5.4 0" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 3.2v2.4M12 18.4v2.4M20.8 12h-2.4M5.6 12H3.2M18 6l-1.7 1.7M7.7 16.3 6 18M18 18l-1.7-1.7M7.7 7.7 6 6" />
    </>
  ),
  profile: (
    <>
      <circle cx="10" cy="8" r="4.2" />
      <path d="M2.7 20.5c1-3.7 4-6 7.3-6 1.1 0 2.2.26 3.1.73" />
      <circle cx="17.3" cy="16.3" r="4" />
      <path d="M17.3 14.4v1.9l1.3 1.3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2H9" />
      <path d="M16.5 16.5 21 12l-4.5-4.5" />
      <path d="M21 12H9" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </>
  ),
  chevronDown: <polyline points="5.5 8.5 12 15 18.5 8.5" />,
  gear: (
    <>
      <path d="M2.5 6.5h19M2.5 12h19M2.5 17.5h19" />
      <circle cx="8" cy="6.5" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="10" cy="17.5" r="1.9" fill="currentColor" stroke="none" />
    </>
  ),
};

export function Icon({ name, size = 16, strokeWidth = 1.7, style = {}, ...rest }) {
  const p = paths[name];
  if (!p) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: "block", ...style }}
      {...rest}
    >
      {p}
    </svg>
  );
}

// ─── Wordmark glyph ──────────────────────────────────────────────────────────
// A small candlestick-pair mark to stand alongside "ForexPro" as an actual
// logo mark rather than just styled text — evokes a price chart without
// depending on any external image asset.
export function BrandMark({ size = 22, color = "currentColor", accent = "#F0B429" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <line x1="7" y1="3" x2="7" y2="21" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
      <rect x="4.5" y="8" width="5" height="8" rx="1.2" fill={color} opacity="0.35" />
      <line x1="17" y1="1.5" x2="17" y2="22.5" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="14.5" y="5" width="5" height="10" rx="1.2" fill={accent} />
    </svg>
  );
}

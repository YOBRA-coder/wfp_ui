// ─── Colors ──────────────────────────────────────────────────────────────────
// `C` is intentionally a mutable, shared object (not re-created per theme) —
// every page/component destructures fields straight off it during render
// (`C.bg`, `C.gold`, `` `${C.gold}22` `` for translucent fills, etc.), so
// switching themes by re-assigning C's own properties in place (see
// applyPalette below) makes every one of those already-written call sites
// theme-aware for free, with zero changes needed across ~15 files. The
// object reference never changes — only its values do.
let C = {
  bg:      "#07090D",
  surf:    "#0D1318",
  surf2:   "#121A22",
  border:  "#1C2B38",
  text:    "#CDD8EA",
  muted:   "#48627A",
  gold:    "#F0B429",
  green:   "#00E070",
  red:     "#FF3550",
  blue:    "#3D9EFF",
  purple:  "#9B7FFF",
};

// ─── Theme palettes ─────────────────────────────────────────────────────────
// "dark" is the platform's original look (used as-is above and again here so
// switching back to it is just another palette swap). "black" is an
// OLED-friendly true-black variant. "light" inverts the surface/text axis
// while keeping accent hues close to the originals, darkened just enough to
// stay legible on white/near-white backgrounds.
const THEMES = {
  dark: {
    bg: "#07090D", surf: "#0D1318", surf2: "#121A22", border: "#1C2B38",
    text: "#CDD8EA", muted: "#48627A",
    gold: "#F0B429", green: "#00E070", red: "#FF3550", blue: "#3D9EFF", purple: "#9B7FFF",
  },
  black: {
    bg: "#000000", surf: "#050505", surf2: "#0A0A0A", border: "#1A1A1A",
    text: "#E8EDF5", muted: "#5B6B7A",
    gold: "#F0B429", green: "#00E070", red: "#FF3550", blue: "#3D9EFF", purple: "#9B7FFF",
  },
  light: {
    bg: "#F3F5F9", surf: "#FFFFFF", surf2: "#F1F4F8", border: "#DFE5EE",
    text: "#101828", muted: "#5B6B7E",
    gold: "#A6650A", green: "#0E9F63", red: "#DC2645", blue: "#2563EB", purple: "#7C4DFF",
  },
};

// Mutates C's own properties (never reassigns C itself) so every existing
// `C.xxx` read across the app picks up the new palette on the next render.
// Also mirrors the palette onto CSS custom properties on <html> for the
// handful of things that live in plain CSS (index.css) rather than inline
// styles — the scrollbar and text-selection colors.
function applyPalette(name) {
  const palette = THEMES[name] || THEMES.dark;
  Object.assign(C, palette);
  if (typeof document !== "undefined" && document.documentElement) {
    const root = document.documentElement.style;
    Object.entries(palette).forEach(([k, v]) => root.setProperty(`--${k}`, v));
  }
}

// ─── Navigation config ────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",     icon: "dashboard", label: "Dashboard"     },
  { id: "signals",       icon: "signals",   label: "Signals"       },
  { id: "copy",          icon: "copy",      label: "Copy Trading"  },
  { id: "providers",     icon: "providers", label: "Providers"     },
  { id: "education",     icon: "education", label: "Education"     },
  { id: "journal",       icon: "journal",   label: "Journal"       },
  { id: "prices",        icon: "prices",    label: "Live Prices"   },
  { id: "billing",       icon: "billing",   label: "Billing"       },
  { id: "notifications", icon: "bell",      label: "Notifications" },
  { id: "settings",      icon: "settings",  label: "Settings"      },
  { id: "profile",       icon: "profile",   label: "Profile / MT5" },
];

const bottomNav = [
  { id: "dashboard", icon: "dashboard", label: "Dashboard"    },
  { id: "signals",   icon: "signals",   label: "Signals"      },
  { id: "copy",      icon: "copy",      label: "Copy Trading" },
  { id: "prices",    icon: "prices",    label: "Live Prices"  },
];

// Everything that doesn't fit in the 5-slot bottom nav lives behind "More" on mobile.
const moreNav = [
  { id: "providers",     icon: "providers", label: "Providers"     },
  { id: "education",     icon: "education", label: "Education"     },
  { id: "journal",       icon: "journal",   label: "Journal"       },
  { id: "billing",       icon: "billing",   label: "Billing"       },
  { id: "notifications", icon: "bell",      label: "Notifications" },
  { id: "settings",      icon: "settings",  label: "Settings"      },
  { id: "profile",       icon: "profile",   label: "Profile / MT5" },
];

export { C, THEMES, applyPalette, NAV, bottomNav, moreNav };
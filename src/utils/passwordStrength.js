// ─── Password strength ──────────────────────────────────────────────────────
// Simple, dependency-free heuristic scorer (length + character variety) —
// good enough to give a user useful real-time feedback without pulling in
// zxcvbn's ~800KB wordlist bundle for what's a fairly small UI signal.
export function passwordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "#334155", pct: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(score, 4);
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["#ef4444", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];
  return { score, label: labels[score], color: colors[score], pct: (score / 4) * 100 };
}

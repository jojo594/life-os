/**
 * Recharts colours, read from the same CSS variables as the rest of the UI so
 * charts follow the palette and the light/dark theme instead of hardcoded hex.
 */
const v = (name: string, alpha?: number) =>
  alpha === undefined ? `rgb(var(${name}))` : `rgb(var(${name}) / ${alpha})`;

export const chart = {
  action: v("--accent-cyan"),
  gold: v("--accent-gold"),
  positive: v("--accent-emerald"),
  negative: v("--accent-rose"),
  grid: v("--ink-600", 0.6),
  axis: v("--ink-300"),
  axisStrong: v("--ink-200"),
  muted: v("--ink-600"),
  tooltip: {
    background: v("--ink-800"),
    border: `1px solid ${v("--ink-600")}`,
    borderRadius: 10,
    fontSize: 12,
    color: v("--ink-50"),
    boxShadow: "0 12px 32px -16px rgba(0,0,0,0.6)",
  },
  tooltipLabel: { color: v("--ink-50") },
} as const;

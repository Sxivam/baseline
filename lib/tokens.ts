// Baseline design tokens — ported from the hi-fi canvas (hifi-system.jsx).
// Components use inline styles referencing `tok` for pixel fidelity with the
// locked design. `tok.font` points at the next/font Nunito CSS variable.

export const tok = {
  ink: "#171e19", // charcoal — text + dark surfaces
  ink2: "#3a443e", // softened ink for body copy
  mute: "#8a948f", // labels / secondary
  paper: "#eeebe3", // app background (off-white)
  paperWarm: "#e5e1d6",
  white: "#ffffff",
  red: "#ca0013", // CTA / critical / "low" status only
  redInk: "#8a0010", // pressed red
  sage: "#b7c6c2", // borders + soft accents
  sageSoft: "#b7c6c233", // ~20% — borders
  sageMid: "#b7c6c266", // ~40% — chip bg, blobs
  sageStrong: "#b7c6c2b3", // ~70%
  amber: "#a76c00", // "watch" status — used sparingly
  amberSoft: "#a76c0014",
  redSoft: "rgba(202,0,19,0.08)",
  redMid: "rgba(202,0,19,0.25)",
  shadow: "0 20px 50px -12px rgba(0,0,0,.08)",
  shadowSm: "0 6px 16px -6px rgba(0,0,0,.08)",
  shadowRed: "0 10px 24px -8px rgba(202,0,19,.35)",
  font: 'var(--font-sans)',
} as const;

export type Tok = typeof tok;

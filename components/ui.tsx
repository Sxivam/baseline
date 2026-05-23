"use client";

// Baseline design system — ported from the hi-fi canvas (hifi-system.jsx).
// Inline styles + the `tok` token module for pixel fidelity with the locked
// design.

import type { CSSProperties, ReactNode } from "react";
import { tok } from "@/lib/tokens";
import { DISCLAIMER_FULL, DISCLAIMER_SHORT } from "@/lib/copy";
import type { MarkerStatus } from "@/lib/types";

// ── Icon ───────────────────────────────────────────────────────────────────
const ICON_PATHS: Record<string, string> = {
  sun: "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
  droplet: "M12 2.5C8 8 5 11.5 5 15a7 7 0 0 0 14 0c0-3.5-3-7-7-12.5z",
  heart: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  apple: "M12 3.5c.5-1 1.5-2 3-2 0 1.5-1 2.5-2 3M5 9a5 5 0 0 1 5-5c1.5 0 2 1 2.5 1s1-1 2.5-1a5 5 0 0 1 5 5c0 6-4 11-7 11s-7-5-7-11z",
  leaf: "M3 21c8 0 17-3 17-17 0 0-3 3-9 3S3 13 3 21zM3 21c4-8 8-12 13-13",
  bell: "M18 16v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1l-2-2zM10 21h4",
  arrow: "M5 12h14M13 5l7 7-7 7",
  check: "M5 13l4 4L19 7",
  plus: "M12 5v14M5 12h14",
  spark: "M12 2v6m0 8v6M2 12h6m8 0h6M5 5l4 4m6 6l4 4M5 19l4-4m6-6l4-4",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  file: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  cal: "M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01",
  home: "M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V11z",
  x: "M18 6L6 18M6 6l12 12",
};

export function Icon({
  name,
  size = 18,
  stroke = tok.ink,
  strokeWidth = 1.8,
  fill = "none",
}: {
  name: string;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={ICON_PATHS[name] || ICON_PATHS.info} />
    </svg>
  );
}

// ── Wordmark + Monogram ─────────────────────────────────────────────────────
export function Wordmark({
  size = 22,
  color = tok.ink,
  dotColor = tok.red,
}: {
  size?: number;
  color?: string;
  dotColor?: string;
}) {
  return (
    <span
      style={{
        fontFamily: tok.font,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: "-0.02em",
        color,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      Baseline<span style={{ color: dotColor }}>.</span>
    </span>
  );
}

export function Monogram({
  size = 40,
  radius = 12,
  bg = tok.ink,
  fg = tok.white,
  dot = tok.red,
}: {
  size?: number;
  radius?: number;
  bg?: string;
  fg?: string;
  dot?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        color: fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: tok.font,
        fontWeight: 900,
        fontSize: size * 0.5,
        lineHeight: 1,
        flex: "0 0 auto",
      }}
    >
      <span>
        b<span style={{ color: dot }}>.</span>
      </span>
    </div>
  );
}

// ── Status chip ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<
  MarkerStatus,
  { label: string; dot: string; fg: string; bg: string; border: string }
> = {
  in: { label: "In range", dot: tok.ink, fg: tok.ink, bg: tok.sageMid, border: "transparent" },
  watch: { label: "Watch", dot: tok.amber, fg: tok.amber, bg: tok.amberSoft, border: tok.amber },
  low: { label: "Low", dot: tok.red, fg: tok.red, bg: tok.white, border: tok.red },
};

export function StatusChip({
  kind = "in",
  variant = "solid",
  size = 11,
}: {
  kind?: MarkerStatus;
  variant?: "solid" | "plain";
  size?: number;
}) {
  const m = STATUS_MAP[kind];
  if (variant === "plain") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: tok.font,
          fontSize: size,
          fontWeight: 800,
          color: m.fg,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 99, background: m.dot }} />
        {m.label}
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: size,
        fontWeight: 800,
        letterSpacing: "0.04em",
        background: m.bg,
        color: m.fg,
        border: `1px solid ${m.border}`,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 99, background: m.dot }} />
      {m.label}
    </span>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({
  size = 40,
  letter = "S",
  notification = false,
}: {
  size?: number;
  letter?: string;
  notification?: boolean;
}) {
  return (
    <div style={{ position: "relative", flex: "0 0 auto" }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 99,
          background: "#cdb89a",
          border: `2px solid ${tok.white}`,
          boxShadow: tok.shadowSm,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: tok.font,
          fontWeight: 900,
          fontSize: size * 0.42,
          color: tok.ink,
        }}
      >
        {letter}
      </div>
      {notification && (
        <div
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: 99,
            background: tok.red,
            border: `2px solid ${tok.paper}`,
          }}
        />
      )}
    </div>
  );
}

// ── Decorative blob ─────────────────────────────────────────────────────────
export function Blob({
  top,
  right,
  bottom,
  left,
  size = 80,
  color = tok.sageSoft,
  blur = 0,
}: {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  size?: number;
  color?: string;
  blur?: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top,
        right,
        bottom,
        left,
        width: size,
        height: size,
        borderRadius: 99,
        background: color,
        filter: blur ? `blur(${blur}px)` : undefined,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

// ── Button ──────────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "dark";

export function Button({
  variant = "primary",
  children,
  onClick,
  type = "button",
  disabled = false,
  style,
}: {
  variant?: ButtonVariant;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: tok.font,
    fontWeight: 800,
    fontSize: 15,
    border: "none",
    cursor: disabled ? "default" : "pointer",
    padding: "14px 22px",
    borderRadius: 999,
    transition: "transform .15s, box-shadow .15s, opacity .15s",
    opacity: disabled ? 0.5 : 1,
  };
  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: { background: tok.red, color: tok.white, boxShadow: tok.shadowRed },
    secondary: { background: tok.white, color: tok.ink, border: `1px solid ${tok.sage}` },
    ghost: { background: "transparent", color: tok.ink },
    dark: { background: tok.ink, color: tok.white },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

// ── Disclaimer strip ────────────────────────────────────────────────────────
export function Disclaimer({
  compact = false,
  style,
}: {
  compact?: boolean;
  style?: CSSProperties;
}) {
  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, ...style }}>
        <Icon name="info" size={12} stroke={tok.mute} strokeWidth={2} />
        <span
          style={{
            fontFamily: tok.font,
            fontSize: 11,
            color: tok.mute,
            fontStyle: "italic",
          }}
        >
          {DISCLAIMER_SHORT}
        </span>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 16,
        background: tok.sageSoft,
        alignItems: "flex-start",
        ...style,
      }}
    >
      <Icon name="info" size={14} stroke={tok.ink2} strokeWidth={2} />
      <span
        style={{
          fontFamily: tok.font,
          fontSize: 12,
          color: tok.ink2,
          lineHeight: 1.4,
        }}
      >
        {DISCLAIMER_FULL}
      </span>
    </div>
  );
}

// ── Segmented pill group ────────────────────────────────────────────────────
export function SegGroup<T extends string>({
  options,
  value,
  onChange,
  size = "m",
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "m";
}) {
  const pad = size === "sm" ? "8px 14px" : "12px 18px";
  const fs = size === "sm" ? 13 : 14;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            style={{
              padding: pad,
              borderRadius: 99,
              border: `1px solid ${active ? tok.ink : tok.sage}`,
              background: active ? tok.ink : tok.white,
              color: active ? tok.white : tok.ink,
              fontFamily: tok.font,
              fontWeight: 700,
              fontSize: fs,
              cursor: "pointer",
              transition: "background .15s, color .15s, border-color .15s",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ── Labelled field wrapper ──────────────────────────────────────────────────
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span className="hi-label">{label}</span>
        {hint && (
          <span
            style={{
              fontFamily: tok.font,
              fontSize: 11,
              color: tok.mute,
              fontStyle: "italic",
            }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Text / number input ─────────────────────────────────────────────────────
export function TextField({
  value,
  onChange,
  placeholder,
  suffix,
  type = "text",
  inputMode,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  type?: "text" | "number" | "date";
  inputMode?: "numeric" | "text";
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        padding: "14px 18px",
        borderRadius: 24,
        background: tok.white,
        border: `1px solid ${tok.sageSoft}`,
        ...style,
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          fontFamily: tok.font,
          fontSize: 16,
          fontWeight: 700,
          color: tok.ink,
        }}
      />
      {suffix && (
        <span
          style={{
            fontFamily: tok.font,
            fontSize: 14,
            fontWeight: 600,
            color: tok.mute,
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}

// ── Floating bottom nav (mobile) ────────────────────────────────────────────
export function BottomNav({
  active = 0,
  onFab,
  onHome,
}: {
  active?: number;
  onFab?: () => void;
  onHome?: () => void;
}) {
  const items = [
    { svg: ICON_PATHS.home, onClick: onHome },
    { svg: "M3 5h18M3 12h12M3 19h18", onClick: undefined },
    null, // FAB slot
    { svg: "M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z", onClick: undefined },
    {
      svg: "M20 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2",
      onClick: undefined,
    },
  ];
  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
        left: 8,
        right: 8,
        height: 64,
        background: tok.ink,
        borderRadius: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 14px",
        zIndex: 10,
      }}
    >
      {items.map((it, i) => {
        if (i === 2) {
          return (
            <button
              key="fab"
              type="button"
              onClick={onFab}
              style={{
                width: 56,
                height: 56,
                borderRadius: 99,
                background: tok.red,
                border: `4px solid ${tok.paper}`,
                marginTop: -36,
                boxShadow: tok.shadowRed,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto",
                cursor: "pointer",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={tok.white} strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          );
        }
        return (
          <button
            key={i}
            type="button"
            onClick={it?.onClick}
            style={{
              width: 48,
              height: 48,
              borderRadius: 99,
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: it?.onClick ? "pointer" : "default",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={i === active ? tok.white : tok.sage}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={it!.svg} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

import React, { useId } from "react";
import { riskClass } from "../lib/utils";
import { useCountUp } from "../hooks/useMisc";

export function RiskBadge({ risk }) {
  return <span className={`risk-badge ${riskClass(risk)}`}>{risk || "NORMAL"}</span>;
}

export function StatusPill({ online, labelOn = "NODE ACTIVE", labelOff = "WAITING FOR DATA" }) {
  return (
    <span className={`status-pill ${online ? "online" : "idle"}`}>
      <span className="status-dot" />
      {online ? labelOn : labelOff}
    </span>
  );
}

export function PanelHead({ eyebrow, title, children }) {
  return (
    <div className="panel-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {children && <div className="panel-head-actions">{children}</div>}
    </div>
  );
}

export function Sparkline({ data, color = "var(--green)", height = 34 }) {
  const gid = useId().replace(/:/g, "");
  const w = 120;
  const max = Math.max(1, ...data);
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [i * step, height - 3 - (v / max) * (height - 8)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${height} L0 ${height} Z`;
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".32" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="spark-line" />
    </svg>
  );
}

export function StatCard({ icon: Icon, label, value, suffix = "", detail, tone = "", spark, delay = 0 }) {
  const animated = useCountUp(typeof value === "number" ? value : 0);
  const shown = typeof value === "number" ? animated : value;
  const color = tone === "danger" ? "var(--red)" : tone === "success" ? "var(--green)" : tone === "amber" ? "var(--amber)" : "var(--blue)";
  return (
    <div className={`stat-card ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-top">
        <div className="stat-icon"><Icon size={18} /></div>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">
        <strong>{shown}</strong>
        {suffix && <em>{suffix}</em>}
      </div>
      <small>{detail}</small>
      {spark && <Sparkline data={spark} color={color} />}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{Icon && <Icon size={26} />}</div>
      <strong>{title}</strong>
      {text && <span>{text}</span>}
      {children}
    </div>
  );
}

export function Skeleton({ h = 16, w = "100%", r = 8 }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />;
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          className={value === o.id ? "active" : ""}
          onClick={() => onChange(o.id)}
          title={o.title}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

import React, { useId, useState } from "react";
import { useSize } from "../hooks/useMisc";
import { speciesEmoji } from "../lib/utils";

/* ---------- Area / line chart with hover tooltip ---------- */
function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
  }
  return d;
}

export function AreaChart({ bins, height = 220 }) {
  const [ref, { width }] = useSize();
  const [hover, setHover] = useState(null);
  const gid = useId().replace(/:/g, "");
  const pad = { l: 30, r: 10, t: 14, b: 26 };
  const w = Math.max(width, 200);
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = Math.max(3, ...bins.map((b) => b.value));
  const niceMax = Math.ceil(max / 3) * 3;
  const x = (i) => pad.l + (i / Math.max(1, bins.length - 1)) * innerW;
  const y = (v) => pad.t + innerH - (v / niceMax) * innerH;
  const pts = bins.map((b, i) => [x(i), y(b.value)]);
  const highPts = bins.map((b, i) => [x(i), y(b.high)]);
  const line = smoothPath(pts);
  const area = `${line} L${x(bins.length - 1)} ${pad.t + innerH} L${x(0)} ${pad.t + innerH} Z`;
  const ticks = [0, niceMax / 3, (niceMax * 2) / 3, niceMax];
  const labelEvery = Math.ceil(bins.length / Math.max(2, Math.floor(w / 90)));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - pad.l;
    const idx = Math.round((px / innerW) * (bins.length - 1));
    setHover(Math.min(bins.length - 1, Math.max(0, idx)));
  };

  return (
    <div className="chart-box" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={w} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--green)" stopOpacity=".38" />
              <stop offset="1" stopColor="var(--green)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className="grid-line" />
              <text x={pad.l - 8} y={y(t) + 3} textAnchor="end" className="axis-text">{Math.round(t)}</text>
            </g>
          ))}
          <path d={area} fill={`url(#a${gid})`} className="fade-in" />
          <path d={line} className="chart-line" pathLength="1" />
          <path d={smoothPath(highPts)} className="chart-line high" pathLength="1" />
          {bins.map((b, i) =>
            i % labelEvery === 0 ? (
              <text key={i} x={x(i)} y={height - 7} textAnchor="middle" className="axis-text">{b.label}</text>
            ) : null
          )}
          {hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} className="hover-line" />
              <circle cx={x(hover)} cy={y(bins[hover].value)} r="4.5" className="hover-dot" />
            </g>
          )}
        </svg>
      )}
      {hover != null && width > 0 && (
        <div
          className="chart-tip"
          style={{ left: Math.min(Math.max(x(hover), 70), w - 70), top: Math.max(0, y(bins[hover].value) - 58) }}
        >
          <b>{bins[hover].label}</b>
          <span>{bins[hover].value} detection{bins[hover].value === 1 ? "" : "s"}</span>
          {bins[hover].high > 0 && <span className="tip-high">{bins[hover].high} high risk</span>}
        </div>
      )}
      <div className="chart-legend">
        <span><i className="dot green" /> Detections</span>
        <span><i className="dot red" /> High risk</span>
      </div>
    </div>
  );
}

/* ---------- Donut ---------- */
const DONUT_COLORS = ["#35e6a2", "#6ea8ff", "#f5b942", "#ff8fab", "#b28dff", "#4dd0e1", "#9ccc65", "#90a4ae"];

export function Donut({ data, size = 170 }) {
  const [active, setActive] = useState(null);
  const total = data.reduce((s, d) => s + d.count, 0);
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const shown = active != null ? data[active] : null;
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} className="donut-bg" />
          {total > 0 &&
            data.map((d, i) => {
              const len = (d.count / total) * c;
              const seg = (
                <circle
                  key={d.name}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  className={`donut-seg ${active === i ? "active" : ""}`}
                  stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                  strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  style={{ animationDelay: `${i * 70}ms` }}
                />
              );
              offset += len;
              return seg;
            })}
        </svg>
        <div className="donut-center">
          <strong>{shown ? shown.count : total}</strong>
          <span>{shown ? shown.name : "total"}</span>
        </div>
      </div>
      <ul className="donut-legend">
        {data.slice(0, 6).map((d, i) => (
          <li
            key={d.name}
            className={active === i ? "active" : ""}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
          >
            <i style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span>{speciesEmoji(d.name)} {d.name}</span>
            <b>{total ? Math.round((d.count / total) * 100) : 0}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Heatmap (7 days x 24 h) ---------- */
export function Heatmap({ data }) {
  const { days, max } = data;
  return (
    <div className="heatmap">
      <div className="heat-cols">
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h}>{h % 3 === 0 ? String(h).padStart(2, "0") : ""}</span>
        ))}
      </div>
      {days.map((day, di) => (
        <div className="heat-row" key={day.date.toISOString()}>
          <span className="heat-day">{day.label}</span>
          {day.hours.map((count, h) => (
            <i
              key={h}
              className="heat-cell"
              title={`${day.label} ${String(h).padStart(2, "0")}:00 — ${count} detection${count === 1 ? "" : "s"}`}
              style={{
                "--heat": count / max,
                animationDelay: `${(di * 24 + h) * 4}ms`
              }}
              data-empty={count === 0}
            />
          ))}
        </div>
      ))}
      <div className="heat-scale">
        <span>Less</span>
        {[0.1, 0.3, 0.55, 0.8, 1].map((v) => (
          <i key={v} className="heat-cell static" style={{ "--heat": v }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/* ---------- Simple vertical bars (hour of day / histogram) ---------- */
export function Bars({ values, labels, highlight, height = 120, format = (v) => v }) {
  const max = Math.max(1, ...values);
  return (
    <div className="bars" style={{ height: height + 22 }}>
      {values.map((v, i) => (
        <div className={`bar-col ${highlight === i ? "peak" : ""}`} key={i} title={`${labels[i]} — ${format(v)}`}>
          <div className="bar-track" style={{ height }}>
            <i style={{ height: `${(v / max) * 100}%`, animationDelay: `${i * 18}ms` }} />
          </div>
          <span>{i % Math.ceil(values.length / 8) === 0 ? labels[i] : ""}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Stacked risk bar ---------- */
export function RiskStack({ counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const items = [
    ["high", "High", "var(--red)"],
    ["medium", "Medium", "var(--amber)"],
    ["low", "Low", "var(--blue)"],
    ["normal", "Normal", "var(--green)"]
  ];
  return (
    <div>
      <div className="stack">
        {items.map(([k, , color]) =>
          counts[k] ? <i key={k} style={{ width: `${(counts[k] / total) * 100}%`, background: color }} /> : null
        )}
      </div>
      <ul className="stack-legend">
        {items.map(([k, label, color]) => (
          <li key={k}>
            <i style={{ background: color }} /> {label}
            <b>{counts[k]}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Ring gauge ---------- */
export function Ring({ value, size = 120, label, sub, tone = "var(--green)" }) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="donut-bg" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-fill"
          stroke={tone}
          strokeDasharray={`${pct * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">
        <strong>{value == null ? "—" : `${Math.round(pct * 100)}%`}</strong>
        {label && <span>{label}</span>}
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}

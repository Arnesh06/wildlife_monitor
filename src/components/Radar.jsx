import React, { useMemo } from "react";
import { hashString, relativeTime, riskClass } from "../lib/utils";

/**
 * Range radar. Only DISTANCE is measured by the sensor; the angle of each blip
 * is derived from its track id purely so blips don't overlap.
 */
export function Radar({ events, now, size = 260 }) {
  const withRange = useMemo(
    () => events.filter((e) => Number.isFinite(Number(e.radar_distance)) && Number(e.radar_distance) > 0).slice(0, 8),
    [events]
  );
  const maxDist = Math.max(20, ...withRange.map((e) => Number(e.radar_distance)));
  const scale = Math.ceil(maxDist / 10) * 10;
  const c = size / 2;
  const R = c - 14;

  return (
    <div className="radar-wrap">
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} className="radar" role="img" aria-label="Radar range view">
        <defs>
          <radialGradient id="radarBg" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="var(--green)" stopOpacity=".12" />
            <stop offset="1" stopColor="var(--green)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--green)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--green)" stopOpacity=".5" />
          </linearGradient>
        </defs>
        <circle cx={c} cy={c} r={R} fill="url(#radarBg)" className="radar-disc" />
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <circle cx={c} cy={c} r={R * f} className="radar-ring" />
            <text x={c + 4} y={c - R * f + 11} className="radar-label">{Math.round(scale * f)}m</text>
          </g>
        ))}
        <line x1={c - R} x2={c + R} y1={c} y2={c} className="radar-ring" />
        <line y1={c - R} y2={c + R} x1={c} x2={c} className="radar-ring" />
        <g className="radar-sweep" style={{ transformOrigin: `${c}px ${c}px` }}>
          <path d={`M${c} ${c} L${c + R} ${c} A${R} ${R} 0 0 0 ${c + R * Math.cos(-0.7)} ${c + R * Math.sin(-0.7)} Z`} fill="url(#sweep)" />
          <line x1={c} y1={c} x2={c + R} y2={c} className="radar-arm" />
        </g>
        <circle cx={c} cy={c} r="4" className="radar-core" />
        {withRange.map((e, i) => {
          const angle = ((hashString(e.track_id ?? e.id) % 360) * Math.PI) / 180;
          const rr = (Number(e.radar_distance) / scale) * R;
          const fresh = i === 0 && now - new Date(e.created_at).getTime() < 60000;
          return (
            <g
              key={e.id}
              className={`blip ${riskClass(e.risk_level)} ${fresh ? "fresh" : ""}`}
              style={{ opacity: Math.max(0.18, 1 - i * 0.11) }}
              transform={`translate(${c + rr * Math.cos(angle)} ${c + rr * Math.sin(angle)})`}
            >
              {fresh && <circle r="9" className="blip-pulse" />}
              <circle r={i === 0 ? 5 : 3.5} className="blip-dot" />
              <title>{`${e.animal || "Unknown"} · ${e.radar_distance} m · ${relativeTime(e.created_at, now)}`}</title>
            </g>
          );
        })}
      </svg>
      <p className="radar-note">
        {withRange.length
          ? "Range is measured by the radar; blip direction is illustrative."
          : "No radar range readings in this time window."}
      </p>
    </div>
  );
}

import { supabase } from "./supabase";

export const NODE_ID = import.meta.env.VITE_NODE_ID || "WILDLIFE_001";
export const BUCKET = "wildlife-snapshots";

export const RANGES = [
  { id: "1h", label: "1H", ms: 3600e3 },
  { id: "24h", label: "24H", ms: 86400e3 },
  { id: "7d", label: "7D", ms: 7 * 86400e3 },
  { id: "all", label: "ALL", ms: null }
];

export const SPECIES_EMOJI = {
  bird: "🐦",
  cat: "🐈",
  dog: "🐕",
  horse: "🐎",
  sheep: "🐑",
  cow: "🐄",
  elephant: "🐘",
  bear: "🐻",
  zebra: "🦓",
  giraffe: "🦒",
  deer: "🦌",
  person: "🧍"
};

export function speciesEmoji(name) {
  return SPECIES_EMOJI[String(name || "").toLowerCase()] || "🐾";
}

export function riskClass(risk) {
  return String(risk || "NORMAL").toLowerCase();
}

export function riskRank(risk) {
  return { high: 3, medium: 2, low: 1, normal: 0 }[riskClass(risk)] ?? 0;
}

export function isIncident(event) {
  return riskRank(event.risk_level) >= 2;
}

export function hasActuation(event) {
  return !!(event.laser_active || event.led_active || event.buzzer_active);
}

export function confidence(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

export function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function relativeTime(value, now = Date.now()) {
  if (!value) return "—";
  const diff = Math.max(0, now - new Date(value).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ago`;
}

export function snapshotUrl(event) {
  const path = event?.snapshot_path;
  if (!path) return null;
  if (String(path).startsWith("demo:")) return demoSnapshot(event.animal, event.risk_level);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

const demoCache = new Map();
export function demoSnapshot(animal = "animal", risk = "low") {
  const key = `${animal}:${risk}`;
  if (demoCache.has(key)) return demoCache.get(key);
  const glow = { high: "#ff647c", medium: "#f5b942", low: "#6ea8ff", normal: "#35e6a2" }[riskClass(risk)] || "#35e6a2";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'>
<defs>
<linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#0b1a2b'/><stop offset='.55' stop-color='#274a55'/><stop offset='1' stop-color='#d98b4a'/></linearGradient>
<radialGradient id='g' cx='.5' cy='.5' r='.5'><stop offset='0' stop-color='${glow}' stop-opacity='.55'/><stop offset='1' stop-color='${glow}' stop-opacity='0'/></radialGradient>
</defs>
<rect width='640' height='360' fill='url(#sky)'/>
<circle cx='500' cy='120' r='36' fill='#ffd9a0' opacity='.85'/>
<path d='M0 250 Q120 190 240 240 T480 230 T640 250 V360 H0Z' fill='#10261f'/>
<path d='M0 285 Q160 250 320 280 T640 275 V360 H0Z' fill='#0b1a15'/>
<rect y='300' width='640' height='60' fill='#1a1f26'/>
<rect x='0' y='326' width='640' height='4' fill='#f5e6a8' opacity='.35' stroke-dasharray='30 24'/>
<circle cx='320' cy='250' r='120' fill='url(#g)'/>
<text x='320' y='285' font-size='120' text-anchor='middle'>${speciesEmoji(animal)}</text>
<g fill='none' stroke='${glow}' stroke-width='3'><path d='M250 150 h-24 v24 M390 150 h24 v24 M250 300 h-24 v-24 M390 300 h24 v-24'/></g>
<text x='320' y='34' text-anchor='middle' font-family='monospace' font-size='14' fill='#fff' opacity='.55'>DEMO FRAME</text>
</svg>`;
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  demoCache.set(key, uri);
  return uri;
}

export function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv(events) {
  if (!events.length) return;
  const headers = ["Time", "Animal", "Confidence", "Radar", "Distance (m)", "Risk", "Track ID", "Laser", "LED", "Buzzer"];
  const rows = events.map((e) => [
    new Date(e.created_at).toISOString(),
    e.animal || "",
    confidence(e.confidence),
    e.radar_detected ? "DETECTED" : "STANDBY",
    e.radar_distance ?? "",
    e.risk_level || "NORMAL",
    e.track_id ?? "",
    e.laser_active ? "ON" : "OFF",
    e.led_active ? "ON" : "OFF",
    e.buzzer_active ? "ON" : "OFF"
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  downloadBlob(csv, `wildlife-detections-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
}

export function exportJson(events) {
  if (!events.length) return;
  downloadBlob(
    JSON.stringify(events, null, 2),
    `wildlife-detections-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json"
  );
}

let audioCtx;
export function playAlertBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = audioCtx || new Ctx();
    const ctx = audioCtx;
    if (ctx.state === "suspended") ctx.resume();
    [0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = offset ? 660 : 880;
      const t = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch {
    /* audio unsupported */
  }
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function hashString(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

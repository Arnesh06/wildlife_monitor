import { hashString } from "./utils";

export const DEMO =
  import.meta.env.VITE_DEMO === "1" ||
  (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1");

const SPECIES = [
  ["cow", 0.26],
  ["dog", 0.2],
  ["bird", 0.16],
  ["horse", 0.1],
  ["sheep", 0.1],
  ["cat", 0.08],
  ["bear", 0.05],
  ["elephant", 0.05]
];

function pickSpecies(seed) {
  let r = (seed % 1000) / 1000;
  for (const [name, w] of SPECIES) {
    if (r < w) return name;
    r -= w;
  }
  return "cow";
}

// Wildlife crossings cluster near dawn and dusk.
const HOUR_WEIGHT = [2, 2, 1, 1, 3, 6, 9, 5, 3, 2, 2, 2, 2, 2, 2, 3, 5, 8, 10, 9, 6, 4, 3, 2];

function makeEvent(id, createdAt, seed) {
  const animal = pickSpecies(hashString(`a${seed}`));
  const r = (hashString(`r${seed}`) % 100) / 100;
  const conf = 0.5 + ((hashString(`c${seed}`) % 48) / 100);
  const dist = 3 + (hashString(`d${seed}`) % 240) / 10;
  const radar = r > 0.18;
  const risk = dist < 9 && radar ? "HIGH" : dist < 17 ? "MEDIUM" : r > 0.55 ? "LOW" : "NORMAL";
  const active = risk === "HIGH" || (risk === "MEDIUM" && r > 0.3);
  return {
    id,
    node_id: "DEMO",
    created_at: new Date(createdAt).toISOString(),
    animal,
    confidence: Math.min(0.99, conf),
    radar_detected: radar,
    radar_distance: radar ? Number(dist.toFixed(1)) : null,
    track_id: 100 + (hashString(`t${seed}`) % 900),
    risk_level: risk,
    laser_active: active && r > 0.4,
    led_active: active,
    buzzer_active: risk === "HIGH",
    snapshot_path: "demo:frame"
  };
}

export function generateDemoHistory(now = Date.now()) {
  const events = [];
  let n = 0;
  for (let h = 7 * 24 - 1; h >= 0; h--) {
    const t = now - h * 3600e3;
    const hour = new Date(t).getHours();
    const count = Math.round((HOUR_WEIGHT[hour] * (0.4 + (hashString(`h${h}`) % 100) / 100)) / 2.6);
    for (let i = 0; i < count; i++) {
      n += 1;
      const at = t - (hashString(`m${h}-${i}`) % 3600) * 1000;
      events.push(makeEvent(`demo-${n}`, at, n));
    }
  }
  // make sure something is recent so the UI has a live feel
  for (let i = 0; i < 3; i++) {
    n += 1;
    events.push(makeEvent(`demo-${n}`, now - (i * 47 + 20) * 1000, n + 500));
  }
  return events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

let liveCounter = 100000;
export function generateLiveEvent() {
  liveCounter += 1;
  const seed = liveCounter + Math.floor(Math.random() * 9999);
  return makeEvent(`demo-live-${liveCounter}`, Date.now(), seed);
}

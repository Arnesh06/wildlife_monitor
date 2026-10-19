import { hasActuation, isIncident, riskClass } from "./utils";

const MIN = 60e3;
const HOUR = 3600e3;
const DAY = 86400e3;

/** Activity timeline bins that adapt to the selected range. */
export function timelineBins(events, rangeId, now = Date.now()) {
  const cfg = {
    "1h": { size: 5 * MIN, count: 12, fmt: (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    "24h": { size: HOUR, count: 24, fmt: (d) => d.toLocaleTimeString([], { hour: "2-digit" }) },
    "7d": { size: 6 * HOUR, count: 28, fmt: (d) => d.toLocaleString([], { weekday: "short", hour: "2-digit" }) },
    all: { size: DAY, count: 30, fmt: (d) => d.toLocaleDateString([], { day: "2-digit", month: "short" }) }
  }[rangeId] || { size: HOUR, count: 24, fmt: (d) => d.getHours() };

  const end = Math.ceil(now / cfg.size) * cfg.size;
  const bins = Array.from({ length: cfg.count }, (_, i) => {
    const start = end - (cfg.count - i) * cfg.size;
    return { start, label: cfg.fmt(new Date(start)), value: 0, high: 0 };
  });
  const first = bins[0].start;
  events.forEach((e) => {
    const t = new Date(e.created_at).getTime();
    if (t < first || t >= end) return;
    const idx = Math.floor((t - first) / cfg.size);
    if (bins[idx]) {
      bins[idx].value += 1;
      if (riskClass(e.risk_level) === "high") bins[idx].high += 1;
    }
  });
  return bins;
}

/** Small series for stat-card sparklines (last N equal slices of the range). */
export function sparkSeries(events, predicate = () => true, slices = 12, spanMs = DAY, now = Date.now()) {
  const size = spanMs / slices;
  const start = now - spanMs;
  const out = Array(slices).fill(0);
  events.forEach((e) => {
    if (!predicate(e)) return;
    const t = new Date(e.created_at).getTime();
    if (t < start || t > now) return;
    const idx = Math.min(slices - 1, Math.floor((t - start) / size));
    out[idx] += 1;
  });
  return out;
}

/** 7 days x 24 hours grid, most recent day last. */
export function heatmap(events, now = Date.now()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * DAY);
    return { date: d, label: d.toLocaleDateString([], { weekday: "short" }), hours: Array(24).fill(0) };
  });
  const start = days[0].date.getTime();
  events.forEach((e) => {
    const t = new Date(e.created_at);
    const idx = Math.floor((new Date(t).setHours(0, 0, 0, 0) - start) / DAY);
    if (idx >= 0 && idx < 7) days[idx].hours[t.getHours()] += 1;
  });
  const max = Math.max(1, ...days.flatMap((d) => d.hours));
  return { days, max };
}

export function hourOfDay(events) {
  const hours = Array(24).fill(0);
  events.forEach((e) => {
    hours[new Date(e.created_at).getHours()] += 1;
  });
  return hours;
}

export function speciesCounts(events) {
  const map = new Map();
  events.forEach((e) => {
    const k = e.animal || "unknown";
    map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function riskCounts(events) {
  const c = { high: 0, medium: 0, low: 0, normal: 0 };
  events.forEach((e) => {
    const k = riskClass(e.risk_level);
    c[k in c ? k : "normal"] += 1;
  });
  return c;
}

export function confidenceHistogram(events, buckets = 10) {
  const out = Array(buckets).fill(0);
  events.forEach((e) => {
    const v = Math.min(0.9999, Math.max(0, Number(e.confidence || 0)));
    out[Math.floor(v * buckets)] += 1;
  });
  return out;
}

export function summarize(events) {
  const total = events.length;
  const incidents = events.filter(isIncident);
  const responded = incidents.filter(hasActuation).length;
  const withRadar = events.filter((e) => e.radar_detected).length;
  const dists = events.map((e) => Number(e.radar_distance)).filter((n) => Number.isFinite(n) && n > 0);
  const avgConf = total ? events.reduce((s, e) => s + Number(e.confidence || 0), 0) / total : 0;
  return {
    total,
    incidents: incidents.length,
    high: events.filter((e) => riskClass(e.risk_level) === "high").length,
    responseRate: incidents.length ? responded / incidents.length : null,
    radarRate: total ? withRadar / total : 0,
    avgDistance: dists.length ? dists.reduce((a, b) => a + b, 0) / dists.length : null,
    avgConf,
    laser: events.filter((e) => e.laser_active).length,
    led: events.filter((e) => e.led_active).length,
    buzzer: events.filter((e) => e.buzzer_active).length,
    species: new Set(events.map((e) => e.animal).filter(Boolean)).size
  };
}

export function buildInsights(events) {
  if (events.length < 3) return [];
  const s = summarize(events);
  const hours = hourOfDay(events);
  const peak = hours.indexOf(Math.max(...hours));
  const top = speciesCounts(events)[0];
  const list = [];
  const pad = (n) => String(n).padStart(2, "0");
  list.push({
    tone: "info",
    title: `Peak activity around ${pad(peak)}:00`,
    text: `${hours[peak]} detections fell in the ${pad(peak)}:00 hour. Warning signage or speed advisories matter most then.`
  });
  if (top) {
    list.push({
      tone: "green",
      title: `${top.name[0].toUpperCase()}${top.name.slice(1)} is the most frequent visitor`,
      text: `${top.count} of ${s.total} detections (${Math.round((top.count / s.total) * 100)}%).`
    });
  }
  if (s.incidents) {
    list.push({
      tone: s.high ? "danger" : "amber",
      title: `${s.incidents} incident${s.incidents === 1 ? "" : "s"} needed attention`,
      text: `${s.high} high-risk, ${s.incidents - s.high} medium-risk in this range.`
    });
  }
  if (s.responseRate != null) {
    list.push({
      tone: s.responseRate >= 0.8 ? "green" : "amber",
      title: `Deterrents fired on ${Math.round(s.responseRate * 100)}% of incidents`,
      text: "Share of medium/high-risk events where the laser, LED, or buzzer activated."
    });
  }
  if (s.avgDistance != null) {
    list.push({
      tone: "info",
      title: `Average radar range ${s.avgDistance.toFixed(1)} m`,
      text: `${Math.round(s.radarRate * 100)}% of detections had a radar confirmation.`
    });
  }
  return list;
}

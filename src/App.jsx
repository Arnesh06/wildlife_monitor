import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  CircleDot,
  Clock3,
  Download,
  Gauge,
  Leaf,
  Moon,
  PawPrint,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap
} from "lucide-react";
import { supabase } from "./lib/supabase";

const NODE_ID = "WILDLIFE_001";
const BUCKET = "wildlife-snapshots";
const MAX_EVENTS = 50;
const THEME_KEY = "wildlife-theme";
const SOUND_KEY = "wildlife-sound";

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function confidence(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function riskClass(risk) {
  return String(risk || "NORMAL").toLowerCase();
}

function getSnapshotUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

function playAlertBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
    osc.onended = () => ctx.close();
  } catch {
    /* audio unsupported — ignore */
  }
}

function exportCsv(events) {
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
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wildlife-detections-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function StatCard({ icon: Icon, label, value, detail, tone = "", delay = 0 }) {
  return (
    <div className={`stat-card ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-icon"><Icon size={19} /></div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function StatusPill({ online }) {
  return (
    <span className={`status-pill ${online ? "online" : "idle"}`}>
      <span className="status-dot" />
      {online ? "NODE ACTIVE" : "WAITING FOR DATA"}
    </span>
  );
}

function SpeciesBar({ name, count, max }) {
  const pct = max ? Math.max(6, Math.round((count / max) * 100)) : 0;
  return (
    <div className="species-row">
      <span className="species-name">{name || "unknown"}</span>
      <div className="species-track">
        <i style={{ width: `${pct}%` }} />
      </div>
      <span className="species-count">{count}</span>
    </div>
  );
}

function EventModal({ event, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!event) return null;
  const image = getSnapshotUrl(event.snapshot_path);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="modal-image">
          {image ? (
            <img src={image} alt={event.animal || "Wildlife detection"} />
          ) : (
            <div className="empty-snapshot">
              <Camera size={36} />
              <span>No snapshot for this event</span>
            </div>
          )}
          <span className={`risk-badge modal-risk ${riskClass(event.risk_level)}`}>
            {event.risk_level || "NORMAL"}
          </span>
        </div>
        <div className="modal-body">
          <h3>{event.animal || "Unidentified"}</h3>
          <p className="modal-time">{formatDate(event.created_at)}</p>
          <div className="detail-list modal-details">
            <div className="detail-row"><span>Confidence</span><strong>{confidence(event.confidence)}</strong></div>
            <div className="detail-row"><span>Radar</span><strong>{event.radar_detected ? "DETECTED" : "STANDBY"}</strong></div>
            <div className="detail-row"><span>Distance</span><strong>{event.radar_distance != null ? `${event.radar_distance} m` : "—"}</strong></div>
            <div className="detail-row"><span>Track ID</span><strong>#{event.track_id ?? "—"}</strong></div>
          </div>
          <div className="actuator-grid">
            <div className={`actuator ${event.laser_active ? "on" : ""}`}>
              <Zap size={17} /><span>Laser</span><b>{event.laser_active ? "ON" : "OFF"}</b>
            </div>
            <div className={`actuator ${event.led_active ? "on" : ""}`}>
              <CircleDot size={17} /><span>Warning LED</span><b>{event.led_active ? "ON" : "OFF"}</b>
            </div>
            <div className={`actuator ${event.buzzer_active ? "on" : ""}`}>
              <AlertTriangle size={17} /><span>Buzzer</span><b>{event.buzzer_active ? "ON" : "OFF"}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${riskClass(t.risk_level)}`}>
          <PawPrint size={16} />
          <div className="toast-copy">
            <strong>{t.animal || "Detection"}</strong>
            <span>{t.risk_level || "NORMAL"} · {confidence(t.confidence)}</span>
          </div>
          <button onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem(THEME_KEY) || "dark";
  });
  const [soundOn, setSoundOn] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SOUND_KEY) !== "off";
  });
  const [search, setSearch] = useState("");
  const [filterAnimal, setFilterAnimal] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [flashId, setFlashId] = useState(null);
  const toastTimers = useRef({});

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
  }, [soundOn]);

  const pushToast = useCallback((event) => {
    const id = `${event.id}-${Date.now()}`;
    setToasts((current) => [{ ...event, id }, ...current].slice(0, 4));
    toastTimers.current[id] = setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
      delete toastTimers.current[id];
    }, 5500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: dbError } = await supabase
      .from("detections")
      .select("*")
      .eq("node_id", NODE_ID)
      .order("created_at", { ascending: false })
      .limit(MAX_EVENTS);

    if (dbError) {
      setError(dbError.message);
      setEvents([]);
    } else {
      setEvents(data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadEvents();

    const channel = supabase
      .channel("wildlife-live-detections")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "detections",
          filter: `node_id=eq.${NODE_ID}`
        },
        (payload) => {
          setEvents((current) => {
            const next = [
              payload.new,
              ...current.filter((item) => item.id !== payload.new.id)
            ];
            return next.slice(0, MAX_EVENTS);
          });
          setFlashId(payload.new.id);
          setTimeout(() => setFlashId((id) => (id === payload.new.id ? null : id)), 2200);
          pushToast(payload.new);
          if (soundOn && String(payload.new.risk_level).toUpperCase() === "HIGH") {
            playAlertBeep();
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadEvents, pushToast, soundOn]);

  const latest = events[0] || null;

  const todayCount = useMemo(() => {
    const today = new Date();
    return events.filter((event) => {
      const date = new Date(event.created_at);
      return date.toDateString() === today.toDateString();
    }).length;
  }, [events]);

  const highRisk = useMemo(
    () => events.filter((event) => String(event.risk_level).toUpperCase() === "HIGH").length,
    [events]
  );

  const uniqueAnimals = useMemo(
    () => new Set(events.map((event) => event.animal)).size,
    [events]
  );

  const speciesBreakdown = useMemo(() => {
    const counts = {};
    events.forEach((e) => {
      const key = e.animal || "unknown";
      counts[key] = (counts[key] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = sorted.length ? sorted[0][1] : 0;
    return { sorted, max };
  }, [events]);

  const animalOptions = useMemo(
    () => Array.from(new Set(events.map((e) => e.animal).filter(Boolean))).sort(),
    [events]
  );

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterAnimal !== "all" && e.animal !== filterAnimal) return false;
      if (filterRisk !== "all" && riskClass(e.risk_level) !== filterRisk) return false;
      if (search && !String(e.animal || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [events, filterAnimal, filterRisk, search]);

  const latestTime = latest ? new Date(latest.created_at).getTime() : 0;
  const nodeActive = latestTime > 0 && Date.now() - latestTime < 60_000;

  const latestImage = getSnapshotUrl(latest?.snapshot_path);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><PawPrint size={22} /></div>
          <div>
            <strong>Wildlife</strong>
            <span>Guardian</span>
          </div>
        </div>

        <nav>
          <a className="nav-item active" href="#overview">
            <Activity size={18} /> Overview
          </a>
          <a className="nav-item" href="#detections">
            <Camera size={18} /> Detections
          </a>
          <a className="nav-item" href="#status">
            <Radio size={18} /> Node Status
          </a>
        </nav>

        <div className="sidebar-node">
          <span>EDGE NODE</span>
          <strong>{NODE_ID}</strong>
          <StatusPill online={nodeActive} />
        </div>

        <div className="sidebar-footer">
          <Leaf size={13} /> Protecting the highway corridor
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">EDGE AI / REMOTE MONITORING</p>
            <h1>Wildlife Highway Monitor</h1>
          </div>

          <div className="top-actions">
            <span className={`cloud-status ${connected ? "connected" : ""}`}>
              <Wifi size={16} />
              {connected ? "Realtime connected" : "Connecting…"}
            </span>
            <button
              className="icon-button"
              onClick={() => setSoundOn((s) => !s)}
              title={soundOn ? "Mute high-risk alerts" : "Unmute high-risk alerts"}
            >
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              className="icon-button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-button" onClick={loadEvents} title="Refresh">
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <div>
              <strong>Supabase error</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        <section id="overview" className="stats-grid">
          <StatCard
            icon={CircleDot}
            label="NODE STATUS"
            value={nodeActive ? "ACTIVE" : "IDLE"}
            detail={latest ? `Last event ${formatTime(latest.created_at)}` : "No detection yet"}
            tone={nodeActive ? "success" : ""}
            delay={0}
          />
          <StatCard
            icon={Activity}
            label="DETECTIONS"
            value={todayCount}
            detail="Events recorded today"
            delay={60}
          />
          <StatCard
            icon={AlertTriangle}
            label="HIGH RISK"
            value={highRisk}
            detail="From loaded event history"
            tone={highRisk ? "danger" : ""}
            delay={120}
          />
          <StatCard
            icon={Gauge}
            label="ANIMAL TYPES"
            value={uniqueAnimals}
            detail="Unique classes detected"
            delay={180}
          />
        </section>

        <section className="hero-grid">
          <div className="panel snapshot-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">LATEST EVIDENCE</p>
                <h2>Detection Snapshot</h2>
              </div>
              {latest && (
                <span className={`risk-badge ${riskClass(latest.risk_level)}`}>
                  {latest.risk_level || "NORMAL"}
                </span>
              )}
            </div>

            <div
              className="snapshot-frame"
              onClick={() => latest && setSelectedEvent(latest)}
              role={latest ? "button" : undefined}
            >
              {latestImage ? (
                <img src={latestImage} alt={`${latest?.animal || "Wildlife"} detection`} />
              ) : (
                <div className="empty-snapshot">
                  <Camera size={42} />
                  <strong>No snapshot available</strong>
                  <span>Run the Pi/PC detector to upload the first image.</span>
                </div>
              )}
              {latest && (
                <div className="image-overlay">
                  <span>{latest.animal?.toUpperCase()}</span>
                  <b>{confidence(latest.confidence)}</b>
                </div>
              )}
            </div>
          </div>

          <div className="panel detection-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">CURRENT EVENT</p>
                <h2>{latest?.animal ? latest.animal : "Waiting"}</h2>
              </div>
              <span className="live-ring"><span /></span>
            </div>

            {latest ? (
              <div className="detail-list">
                <div className="detail-row">
                  <span>Confidence</span>
                  <strong>{confidence(latest.confidence)}</strong>
                </div>
                <div className="detail-row">
                  <span>Radar</span>
                  <strong>{latest.radar_detected ? "DETECTED" : "STANDBY"}</strong>
                </div>
                <div className="detail-row">
                  <span>Distance</span>
                  <strong>{latest.radar_distance != null ? `${latest.radar_distance} m` : "—"}</strong>
                </div>
                <div className="detail-row">
                  <span>Track ID</span>
                  <strong>#{latest.track_id ?? "—"}</strong>
                </div>
                <div className="detail-row">
                  <span>Detected</span>
                  <strong>{formatDate(latest.created_at)}</strong>
                </div>
              </div>
            ) : (
              <div className="waiting-state">
                <Radio size={30} />
                <p>Waiting for the edge node to report a detection.</p>
              </div>
            )}

            <div className="actuator-grid">
              <div className={`actuator ${latest?.laser_active ? "on" : ""}`}>
                <Zap size={17} />
                <span>Laser</span>
                <b>{latest?.laser_active ? "ON" : "OFF"}</b>
              </div>
              <div className={`actuator ${latest?.led_active ? "on" : ""}`}>
                <CircleDot size={17} />
                <span>Warning LED</span>
                <b>{latest?.led_active ? "ON" : "OFF"}</b>
              </div>
              <div className={`actuator ${latest?.buzzer_active ? "on" : ""}`}>
                <AlertTriangle size={17} />
                <span>Buzzer</span>
                <b>{latest?.buzzer_active ? "ON" : "OFF"}</b>
              </div>
            </div>
          </div>
        </section>

        <section className="panel species-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">BIODIVERSITY</p>
              <h2>Species Activity</h2>
            </div>
          </div>
          {speciesBreakdown.sorted.length ? (
            <div className="species-list">
              {speciesBreakdown.sorted.map(([name, count]) => (
                <SpeciesBar key={name} name={name} count={count} max={speciesBreakdown.max} />
              ))}
            </div>
          ) : (
            <div className="waiting-state">
              <Leaf size={26} />
              <p>Species activity will appear here as detections arrive.</p>
            </div>
          )}
        </section>

        <section id="detections" className="panel history-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">EVENT LOG</p>
              <h2>Detection History</h2>
            </div>
            <div className="history-actions">
              <span className="event-count">{filteredEvents.length} shown</span>
              <button className="ghost-button" onClick={() => exportCsv(filteredEvents)} disabled={!filteredEvents.length}>
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          <div className="filter-bar">
            <div className="search-field">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search by species…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select value={filterAnimal} onChange={(e) => setFilterAnimal(e.target.value)}>
              <option value="all">All species</option>
              {animalOptions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}>
              <option value="all">All risk levels</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>ANIMAL</th>
                  <th>CONFIDENCE</th>
                  <th>RADAR</th>
                  <th>DISTANCE</th>
                  <th>RISK</th>
                  <th>ACTUATION</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr
                    key={event.id}
                    className={event.id === flashId ? "row-flash" : ""}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <td><Clock3 size={15} /> {formatTime(event.created_at)}</td>
                    <td><strong className="animal-name">{event.animal}</strong></td>
                    <td>
                      <div className="confidence-cell">
                        <span>{confidence(event.confidence)}</span>
                        <div className="meter"><i style={{ width: `${Number(event.confidence || 0) * 100}%` }} /></div>
                      </div>
                    </td>
                    <td>
                      <span className={`mini-status ${event.radar_detected ? "active" : ""}`}>
                        {event.radar_detected ? "DETECTED" : "STANDBY"}
                      </span>
                    </td>
                    <td>{event.radar_distance != null ? `${event.radar_distance} m` : "—"}</td>
                    <td><span className={`risk-badge ${riskClass(event.risk_level)}`}>{event.risk_level || "NORMAL"}</span></td>
                    <td>
                      <span className="actuation-text">
                        {event.laser_active ? "Laser " : ""}
                        {event.led_active ? "LED " : ""}
                        {event.buzzer_active ? "Buzzer" : ""}
                        {!event.laser_active && !event.led_active && !event.buzzer_active ? "None" : ""}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty-table">
                      {events.length ? "No detections match your filters." : "No detections yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer>
          <span><ShieldCheck size={15} /> Edge AI monitoring system</span>
          <span>Node: {NODE_ID}</span>
        </footer>
      </main>

      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;

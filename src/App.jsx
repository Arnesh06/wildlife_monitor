import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  CircleDot,
  Clock3,
  Gauge,
  Radio,
  RefreshCw,
  ShieldCheck,
  Wifi,
  Zap
} from "lucide-react";
import { supabase } from "./lib/supabase";

const NODE_ID = "WILDLIFE_001";
const BUCKET = "wildlife-snapshots";
const MAX_EVENTS = 50;

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

function StatCard({ icon: Icon, label, value, detail, tone = "" }) {
  return (
    <div className={`stat-card ${tone}`}>
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

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

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
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadEvents]);

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

  const latestTime = latest ? new Date(latest.created_at).getTime() : 0;
  const nodeActive = latestTime > 0 && Date.now() - latestTime < 60_000;

  const latestImage = getSnapshotUrl(latest?.snapshot_path);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={24} /></div>
          <div>
            <strong>Wildlife</strong>
            <span>Monitor</span>
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
          />
          <StatCard
            icon={Activity}
            label="DETECTIONS"
            value={todayCount}
            detail="Events recorded today"
          />
          <StatCard
            icon={AlertTriangle}
            label="HIGH RISK"
            value={highRisk}
            detail="From loaded event history"
            tone={highRisk ? "danger" : ""}
          />
          <StatCard
            icon={Gauge}
            label="ANIMAL TYPES"
            value={uniqueAnimals}
            detail="Unique classes detected"
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

            <div className="snapshot-frame">
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

        <section id="detections" className="panel history-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">EVENT LOG</p>
              <h2>Detection History</h2>
            </div>
            <span className="event-count">{events.length} loaded</span>
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
                {events.map((event) => (
                  <tr key={event.id}>
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
                {!loading && events.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty-table">No detections yet.</td>
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
    </div>
  );
}

export default App;

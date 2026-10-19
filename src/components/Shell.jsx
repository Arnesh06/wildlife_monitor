import React, { useMemo } from "react";
import {
  Activity, AlertTriangle, ChartColumn, Command, Cpu, Leaf, LayoutDashboard, Camera, Moon, PawPrint,
  RefreshCw, Settings as SettingsIcon, ShieldAlert, ShieldCheck, Sun, Volume2, VolumeX, Wifi, WifiOff
} from "lucide-react";
import { Segmented, StatusPill } from "./ui";
import { NODE_ID, RANGES, relativeTime, riskClass } from "../lib/utils";

export const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, title: "Guardian Overview", eyebrow: "LIVE CORRIDOR MONITOR", range: true },
  { id: "analytics", label: "Analytics", icon: ChartColumn, title: "Wildlife Analytics", eyebrow: "PATTERNS & INSIGHTS", range: true },
  { id: "detections", label: "Detections", icon: Camera, title: "Detection Library", eyebrow: "EVENT LOG & SNAPSHOTS", range: true },
  { id: "incidents", label: "Incidents", icon: ShieldAlert, title: "Incident Desk", eyebrow: "MEDIUM & HIGH RISK", range: true },
  { id: "node", label: "Node Health", icon: Cpu, title: "Edge Node Health", eyebrow: "HARDWARE & CONNECTIVITY", range: false },
  { id: "settings", label: "Settings", icon: SettingsIcon, title: "Preferences", eyebrow: "PERSONALISE YOUR GUARDIAN", range: false }
];

export function Sidebar({ view, onNavigate, nodeActive, openIncidents, hasHigh }) {
  const index = NAV.findIndex((n) => n.id === view);
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><PawPrint size={22} /></div>
        <div>
          <strong>Wildlife</strong>
          <span>Guardian</span>
        </div>
      </div>

      <nav aria-label="Primary">
        <i className="nav-indicator" style={{ transform: `translateY(${index * 48}px)` }} />
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <button key={n.id} className={`nav-item ${view === n.id ? "active" : ""}`} onClick={() => onNavigate(n.id)}>
              <Icon size={18} />
              <span>{n.label}</span>
              {n.id === "incidents" && openIncidents > 0 && (
                <b className={`nav-badge ${hasHigh ? "danger" : ""}`}>{openIncidents > 99 ? "99+" : openIncidents}</b>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-node">
        <span>EDGE NODE</span>
        <strong>{NODE_ID}</strong>
        <StatusPill online={nodeActive} />
      </div>

      <div className="sidebar-footer"><Leaf size={13} /> Protecting the highway corridor</div>
    </aside>
  );
}

export function BottomNav({ view, onNavigate, openIncidents }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {NAV.map((n) => {
        const Icon = n.icon;
        return (
          <button key={n.id} className={view === n.id ? "active" : ""} onClick={() => onNavigate(n.id)}>
            <Icon size={19} />
            <span>{n.label.split(" ")[0]}</span>
            {n.id === "incidents" && openIncidents > 0 && <b />}
          </button>
        );
      })}
    </nav>
  );
}

export function Topbar({
  view, range, onRange, connected, demo, loading, onRefresh, soundOn, onSound, resolvedTheme, onTheme, onPalette
}) {
  const nav = NAV.find((n) => n.id === view);
  return (
    <header className="topbar">
      <div className="topbar-title" key={view}>
        <p className="eyebrow">{nav.eyebrow}</p>
        <h1>{nav.title}</h1>
      </div>

      <div className="top-actions">
        {nav.range && (
          <Segmented label="Time range" value={range} onChange={onRange} options={RANGES.map((r) => ({ id: r.id, label: r.label }))} />
        )}
        <button className="palette-btn" onClick={onPalette} aria-label="Open command palette">
          <Command size={14} /> <span>Search</span> <kbd>Ctrl K</kbd>
        </button>
        <span className={`cloud-status ${connected ? "connected" : ""}`}>
          {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
          <span className="hide-sm">{demo ? "Demo mode" : connected ? "Realtime" : "Connecting…"}</span>
        </span>
        <button className="icon-button" onClick={onSound} title={soundOn ? "Mute alerts" : "Unmute alerts"} aria-label="Toggle alert sound">
          {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <button className="icon-button" onClick={onTheme} title="Toggle theme" aria-label="Toggle theme">
          {resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button className="icon-button" onClick={onRefresh} title="Refresh" aria-label="Refresh data">
          <RefreshCw size={17} className={loading ? "spin" : ""} />
        </button>
      </div>
    </header>
  );
}

/** Corridor status banner, derived only from recent detections. */
export function GuardianBanner({ events, now, onOpen }) {
  const state = useMemo(() => {
    const latest = events[0];
    if (!latest) return { tone: "idle", icon: ShieldCheck, title: "Waiting for the first detection", text: "The corridor is being watched. New events will appear here instantly." };
    const age = now - new Date(latest.created_at).getTime();
    const risk = riskClass(latest.risk_level);
    if (age < 120000 && risk === "high")
      return { tone: "danger", icon: AlertTriangle, title: `High-risk ${latest.animal || "animal"} detected`, text: `Deterrents ${latest.buzzer_active || latest.led_active || latest.laser_active ? "engaged" : "not triggered"} · ${relativeTime(latest.created_at, now)}`, event: latest };
    if (age < 300000)
      return { tone: "amber", icon: Activity, title: `Animal activity: ${latest.animal || "unknown"}`, text: `Last detection ${relativeTime(latest.created_at, now)} · ${risk} risk`, event: latest };
    return { tone: "safe", icon: ShieldCheck, title: "Corridor clear", text: `No detections in the last 5 minutes · last event ${relativeTime(latest.created_at, now)}` };
  }, [events, now]);

  const Icon = state.icon;
  return (
    <div className={`guardian ${state.tone}`}>
      <div className="guardian-icon"><Icon size={22} /><i /></div>
      <div className="guardian-copy">
        <strong>{state.title}</strong>
        <span>{state.text}</span>
      </div>
      {state.event && <button className="btn ghost small" onClick={() => onOpen(state.event)}>View event</button>}
    </div>
  );
}

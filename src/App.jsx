import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, ChartColumn, Cpu, Download, LayoutDashboard, Moon, RefreshCw, Settings as SettingsIcon, ShieldAlert, Volume2 } from "lucide-react";
import { BottomNav, GuardianBanner, NAV, Sidebar, Topbar } from "./components/Shell";
import { CommandPalette, EventModal, ToastStack } from "./components/Overlays";
import { useDetections } from "./hooks/useDetections";
import { useSettings } from "./hooks/useSettings";
import { useLocalSet, useNow } from "./hooks/useMisc";
import { summarize } from "./lib/analytics";
import { DEMO } from "./lib/demo";
import { exportCsv, isIncident, playAlertBeep, riskClass, speciesEmoji, confidence } from "./lib/utils";
import Overview from "./views/Overview";
import Analytics from "./views/Analytics";
import Detections from "./views/Detections";
import Incidents from "./views/Incidents";
import NodeHealth from "./views/NodeHealth";
import Settings from "./views/Settings";

const VIEW_IDS = NAV.map((n) => n.id);
const viewFromHash = () => {
  const h = window.location.hash.replace("#", "");
  return VIEW_IDS.includes(h) ? h : "overview";
};

export default function App() {
  const { settings, update, reset, resolvedTheme } = useSettings();
  const [view, setView] = useState(viewFromHash);
  const [range, setRange] = useState(settings.defaultRange);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selected, setSelected] = useState(null); // { event, list }
  const [toasts, setToasts] = useState([]);
  const [acked, ackApi] = useLocalSet("wildlife-acked-v3");
  const timers = useRef({});
  const now = useNow(1000);

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  /* ---------- new-event side effects ---------- */
  const handleNewEvent = useCallback((row) => {
    const s = settingsRef.current;
    const high = riskClass(row.risk_level) === "high";
    if (s.toasts) {
      const toastId = `${row.id}-${Date.now()}`;
      setToasts((t) => [{ ...row, toastId }, ...t].slice(0, 4));
      timers.current[toastId] = setTimeout(() => {
        setToasts((t) => t.filter((x) => x.toastId !== toastId));
        delete timers.current[toastId];
      }, 6000);
    }
    if (high && s.sound) playAlertBeep();
    if (high && s.desktopNotify && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`High-risk ${row.animal || "animal"} detected`, {
          body: `${confidence(row.confidence)} confidence${row.radar_distance != null ? ` · ${row.radar_distance} m` : ""}`
        });
      } catch { /* ignore */ }
    }
  }, []);

  const { events, loading, connected, error, refresh, flashId, connectionLog, lastSync } = useDetections(range, handleNewEvent);
  const summary = useMemo(() => summarize(events), [events]);

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.toastId !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  /* ---------- navigation ---------- */
  const navigate = useCallback((id) => {
    setView(id);
    if (window.location.hash !== `#${id}`) window.history.replaceState(null, "", `${window.location.search}#${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- derived ---------- */
  const openIncidents = useMemo(() => events.filter((e) => isIncident(e) && !acked.has(e.id)), [events, acked]);
  const openHigh = openIncidents.some((e) => riskClass(e.risk_level) === "high");
  const latestTime = events[0] ? new Date(events[0].created_at).getTime() : 0;
  const nodeActive = latestTime > 0 && now - latestTime < 60000;

  useEffect(() => {
    document.title = `${openIncidents.length ? `(${openIncidents.length}) ` : ""}Wildlife Guardian`;
  }, [openIncidents.length]);

  const openEvent = useCallback((event, list) => setSelected({ event, list: list || events }), [events]);
  const themeToggle = () => update({ theme: resolvedTheme === "dark" ? "light" : "dark" });

  /* ---------- command palette ---------- */
  const commands = useMemo(() => {
    const go = NAV.map((n) => {
      const Icon = n.icon;
      return { id: `go-${n.id}`, group: "Navigate", label: `Go to ${n.label}`, icon: <Icon size={16} />, run: () => navigate(n.id) };
    });
    return [
      ...go,
      { id: "refresh", group: "Actions", label: "Refresh data", icon: <RefreshCw size={16} />, run: refresh },
      { id: "theme", group: "Actions", label: "Toggle light / dark theme", icon: <Moon size={16} />, run: themeToggle },
      { id: "sound", group: "Actions", label: settings.sound ? "Mute alert sound" : "Unmute alert sound", icon: <Volume2 size={16} />, run: () => update({ sound: !settings.sound }) },
      { id: "csv", group: "Actions", label: "Export loaded detections (CSV)", icon: <Download size={16} />, run: () => exportCsv(events) },
      ...["1h", "24h", "7d", "all"].map((r) => ({ id: `range-${r}`, group: "Time range", label: `Show ${r === "all" ? "all loaded data" : `last ${r}`}`, icon: <AlertTriangle size={16} />, run: () => setRange(r) }))
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, settings.sound, resolvedTheme, refresh, navigate]);

  return (
    <div className="app-shell">
      <div className="ambient" aria-hidden="true"><i /><i /><i /></div>

      <Sidebar view={view} onNavigate={navigate} nodeActive={nodeActive} openIncidents={openIncidents.length} hasHigh={openHigh} />

      <main className="main">
        {DEMO && (
          <div className="demo-banner">
            <strong>Demo mode</strong> — simulated detections, not from your sensor. Nothing is read from or written to Supabase.
            <a href={window.location.pathname}>Exit</a>
          </div>
        )}

        <Topbar
          view={view}
          range={range}
          onRange={setRange}
          connected={connected}
          demo={DEMO}
          loading={loading}
          onRefresh={refresh}
          soundOn={settings.sound}
          onSound={() => update({ sound: !settings.sound })}
          resolvedTheme={resolvedTheme}
          onTheme={themeToggle}
          onPalette={() => setPaletteOpen(true)}
        />

        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <div><strong>Supabase error</strong><span>{error}</span></div>
          </div>
        )}

        <div className="view-host" key={view}>
          {view === "overview" && <Overview events={events} summary={summary} loading={loading} now={now} range={range} onOpen={openEvent} onNavigate={navigate} />}
          {view === "analytics" && <Analytics events={events} summary={summary} range={range} now={now} />}
          {view === "detections" && <Detections events={events} loading={loading} flashId={flashId} now={now} onOpen={openEvent} />}
          {view === "incidents" && <Incidents events={events} acked={acked} onAck={ackApi.add} onOpen={openEvent} now={now} />}
          {view === "node" && <NodeHealth events={events} summary={summary} now={now} connected={connected} demo={DEMO} connectionLog={connectionLog} lastSync={lastSync} error={error} />}
          {view === "settings" && <Settings settings={settings} update={update} reset={reset} onClearAck={ackApi.clear} ackCount={acked.size} />}
        </div>

        <footer>
          <span>Edge AI wildlife protection · every detection is a life we can help save</span>
          <span>{events.length} events loaded</span>
        </footer>
      </main>

      <BottomNav view={view} onNavigate={navigate} openIncidents={openIncidents.length} />

      <EventModal
        event={selected?.event || null}
        list={selected?.list || []}
        onNavigate={(event) => setSelected((s) => ({ ...s, event }))}
        onClose={() => setSelected(null)}
        acked={acked}
        onAck={ackApi.add}
      />
      <ToastStack toasts={toasts} onDismiss={dismissToast} onOpen={(e) => openEvent(e)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
}

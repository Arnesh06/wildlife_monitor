import React from "react";
import { Bell, Monitor, Moon, RotateCcw, Sun, Trash2 } from "lucide-react";
import { PanelHead, Segmented, Toggle } from "../components/ui";
import { RANGES, playAlertBeep } from "../lib/utils";
import { DEMO } from "../lib/demo";

const ACCENTS = [
  { id: "forest", name: "Forest", color: "#35e6a2" },
  { id: "savanna", name: "Savanna", color: "#f5b942" },
  { id: "dusk", name: "Dusk", color: "#b28dff" }
];

function Row({ title, text, children }) {
  return (
    <div className="setting-row">
      <div><strong>{title}</strong>{text && <span>{text}</span>}</div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

export default function Settings({ settings, update, reset, onClearAck, ackCount }) {
  const enableNotify = async (on) => {
    if (on && "Notification" in window && Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return update({ desktopNotify: false });
    }
    update({ desktopNotify: on });
  };

  return (
    <div className="view narrow">
      <section className="panel">
        <PanelHead eyebrow="APPEARANCE" title="Look & feel" />
        <div className="settings">
          <Row title="Theme" text="Match your surroundings — dark for night shifts.">
            <Segmented label="Theme" value={settings.theme} onChange={(theme) => update({ theme })}
              options={[
                { id: "dark", label: "Dark", icon: <Moon size={14} /> },
                { id: "light", label: "Light", icon: <Sun size={14} /> },
                { id: "auto", label: "Auto", icon: <Monitor size={14} /> }
              ]} />
          </Row>
          <Row title="Habitat accent" text="Colour of highlights and charts.">
            <div className="swatches">
              {ACCENTS.map((a) => (
                <button key={a.id} className={settings.accent === a.id ? "active" : ""} style={{ "--sw": a.color }} onClick={() => update({ accent: a.id })} title={a.name} aria-label={a.name}>
                  <i />
                </button>
              ))}
            </div>
          </Row>
          <Row title="Ambient background" text="Soft animated glow behind the dashboard.">
            <Toggle checked={settings.ambient} onChange={(ambient) => update({ ambient })} label="Ambient background" />
          </Row>
          <Row title="Compact density" text="Tighter spacing to fit more on screen.">
            <Toggle checked={settings.compact} onChange={(compact) => update({ compact })} label="Compact density" />
          </Row>
        </div>
      </section>

      <section className="panel">
        <PanelHead eyebrow="ALERTS" title="Notifications" />
        <div className="settings">
          <Row title="Pop-up toasts" text="Show a card when a new detection arrives.">
            <Toggle checked={settings.toasts} onChange={(toasts) => update({ toasts })} label="Toasts" />
          </Row>
          <Row title="Sound on high risk" text="Two-tone alert for HIGH-risk detections.">
            <button className="btn ghost small" onClick={playAlertBeep}>Test</button>
            <Toggle checked={settings.sound} onChange={(sound) => update({ sound })} label="Alert sound" />
          </Row>
          <Row title="Desktop notifications" text="Browser notification for high-risk events, even in another tab.">
            <Toggle checked={settings.desktopNotify} onChange={enableNotify} label="Desktop notifications" />
          </Row>
          <Row title="Default time range" text="Range used when the dashboard opens.">
            <Segmented label="Default range" value={settings.defaultRange} onChange={(defaultRange) => update({ defaultRange })} options={RANGES.map((r) => ({ id: r.id, label: r.label }))} />
          </Row>
        </div>
      </section>

      <section className="panel">
        <PanelHead eyebrow="DATA" title="Housekeeping" />
        <div className="settings">
          <Row title="Acknowledged incidents" text={`${ackCount} stored in this browser.`}>
            <button className="btn ghost small" onClick={onClearAck} disabled={!ackCount}><Trash2 size={13} /> Clear</button>
          </Row>
          <Row title="Demo mode" text={DEMO ? "You are viewing simulated data, not your sensor." : "Preview the dashboard with simulated detections (nothing is written anywhere)."}>
            <a className="btn ghost small" href={DEMO ? window.location.pathname : `${window.location.pathname}?demo=1`}>{DEMO ? "Exit demo" : "Open demo"}</a>
          </Row>
          <Row title="Reset preferences" text="Restore all settings to their defaults.">
            <button className="btn ghost small" onClick={reset}><RotateCcw size={13} /> Reset</button>
          </Row>
        </div>
      </section>
      <p className="hint tc"><Bell size={12} /> Preferences are stored locally in this browser.</p>
    </div>
  );
}

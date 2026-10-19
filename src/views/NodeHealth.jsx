import React from "react";
import { AlertTriangle, CircleDot, Cpu, Radio, Wifi, Zap } from "lucide-react";
import { Ring } from "../components/charts";
import { PanelHead, StatusPill } from "../components/ui";
import { NODE_ID, formatTime, relativeTime } from "../lib/utils";

function Meter({ icon: Icon, label, count, total }) {
  const pct = total ? count / total : 0;
  return (
    <div className="meter-row">
      <div className="meter-head"><Icon size={15} /><span>{label}</span><b>{count}</b></div>
      <div className="species-track"><i style={{ width: `${Math.max(pct * 100, count ? 4 : 0)}%` }} /></div>
      <small>{Math.round(pct * 100)}% of detections</small>
    </div>
  );
}

export default function NodeHealth({ events, summary, now, connected, demo, connectionLog, lastSync, error }) {
  const latest = events[0];
  const lastAge = latest ? now - new Date(latest.created_at).getTime() : null;
  const active = lastAge != null && lastAge < 60000;
  const perHour = events.filter((e) => now - new Date(e.created_at).getTime() < 3600e3).length;
  const host = (() => {
    try { return new URL(import.meta.env.VITE_SUPABASE_URL || "").host || "not configured"; } catch { return "not configured"; }
  })();

  return (
    <div className="view">
      <section className="panel node-hero">
        <div className="node-hero-main">
          <div className="node-icon"><Cpu size={28} /></div>
          <div>
            <p className="eyebrow">EDGE NODE</p>
            <h2 className="node-name">{NODE_ID}</h2>
            <StatusPill online={active} />
          </div>
        </div>
        <div className="node-facts">
          <div><span>Last detection</span><strong>{latest ? relativeTime(latest.created_at, now) : "—"}</strong></div>
          <div><span>Last sync</span><strong>{lastSync ? formatTime(lastSync) : "—"}</strong></div>
          <div><span>Events / last hour</span><strong>{perHour}</strong></div>
          <div><span>Realtime channel</span><strong className={connected ? "ok" : "warn"}>{demo ? "DEMO" : connected ? "SUBSCRIBED" : "CONNECTING"}</strong></div>
        </div>
      </section>

      <section className="grid-three">
        <div className="panel">
          <PanelHead eyebrow="ACTUATORS" title="Deterrent usage" />
          <div className="panel-pad meters">
            <Meter icon={Zap} label="Laser" count={summary.laser} total={summary.total} />
            <Meter icon={CircleDot} label="Warning LED" count={summary.led} total={summary.total} />
            <Meter icon={AlertTriangle} label="Buzzer" count={summary.buzzer} total={summary.total} />
          </div>
        </div>
        <div className="panel">
          <PanelHead eyebrow="SENSING" title="Radar & model" />
          <div className="panel-pad center">
            <Ring value={summary.radarRate} label="radar confirmed" sub={summary.avgDistance != null ? `avg ${summary.avgDistance.toFixed(1)} m` : ""} />
          </div>
        </div>
        <div className="panel">
          <PanelHead eyebrow="CONNECTIVITY" title="Connection log" />
          <ul className="log">
            {connectionLog.length ? connectionLog.map((c, i) => (
              <li key={i}><Wifi size={13} /><span>{c.status}</span><em>{formatTime(c.at)}</em></li>
            )) : <li className="feed-empty">No connection events yet.</li>}
          </ul>
        </div>
      </section>

      <section className="panel">
        <PanelHead eyebrow="DIAGNOSTICS" title="Setup checklist" />
        <ul className="checklist">
          <li className={host !== "not configured" || demo ? "ok" : "bad"}><i />Supabase URL <b>{demo ? "demo data" : host}</b></li>
          <li className={connected ? "ok" : "bad"}><i />Realtime subscription <b>{connected ? "active" : "not connected — enable Realtime for the detections table"}</b></li>
          <li className={!error ? "ok" : "bad"}><i />Database query <b>{error || "OK"}</b></li>
          <li className={events.length ? "ok" : "warn"}><i />Data received <b>{events.length ? `${events.length} events loaded` : "no events in this range"}</b></li>
          <li className={active ? "ok" : "warn"}><i />Recent activity <b>{active ? "node reported within the last minute" : "no detection in the last minute (normal if the corridor is quiet)"}</b></li>
        </ul>
        <p className="hint pad-x"><Radio size={12} /> The dashboard only sees the node through the detections it uploads, so “idle” means no recent events rather than confirmed hardware failure.</p>
      </section>
    </div>
  );
}

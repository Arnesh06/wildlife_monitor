import React, { useMemo, useState } from "react";
import { Camera, Check, CheckCheck, ShieldCheck } from "lucide-react";
import { EmptyState, RiskBadge, Segmented } from "../components/ui";
import { confidence, formatDate, isIncident, relativeTime, riskClass, snapshotUrl, speciesEmoji } from "../lib/utils";

export default function Incidents({ events, acked, onAck, onOpen, now }) {
  const [tab, setTab] = useState("open");
  const incidents = useMemo(() => events.filter(isIncident), [events]);
  const open = incidents.filter((e) => !acked.has(e.id));
  const list = tab === "open" ? open : tab === "done" ? incidents.filter((e) => acked.has(e.id)) : incidents;

  return (
    <div className="view">
      <section className="panel">
        <div className="toolbar">
          <Segmented
            label="Incident filter"
            value={tab}
            onChange={setTab}
            options={[
              { id: "open", label: `Open (${open.length})` },
              { id: "done", label: `Acknowledged (${incidents.length - open.length})` },
              { id: "all", label: "All" }
            ]}
          />
          <span className="toolbar-spacer" />
          <button className="btn primary small" disabled={!open.length} onClick={() => onAck(open.map((e) => e.id))}>
            <CheckCheck size={14} /> Acknowledge all
          </button>
        </div>
        <p className="hint pad-x">Acknowledgements are saved in this browser only — they never modify your Supabase data.</p>

        {!list.length ? (
          <EmptyState icon={ShieldCheck} title={tab === "open" ? "All clear — no open incidents" : "Nothing here"} text="Medium and high-risk detections appear in this desk." />
        ) : (
          <ul className="incident-list">
            {list.slice(0, 60).map((e, i) => {
              const done = acked.has(e.id);
              const img = snapshotUrl(e);
              return (
                <li key={e.id} className={`incident ${riskClass(e.risk_level)} ${done ? "done" : ""}`} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                  <button className="incident-thumb" onClick={() => onOpen(e, list)} aria-label="Open event">
                    {img ? <img loading="lazy" src={img} alt="" /> : <Camera size={20} />}
                  </button>
                  <div className="incident-main">
                    <div className="incident-title">
                      <strong>{speciesEmoji(e.animal)} {e.animal}</strong>
                      <RiskBadge risk={e.risk_level} />
                    </div>
                    <small>
                      {formatDate(e.created_at)} · {relativeTime(e.created_at, now)} · {confidence(e.confidence)}
                      {e.radar_distance != null ? ` · ${e.radar_distance} m` : ""}
                    </small>
                    <small>Deterrents: {[e.laser_active && "Laser", e.led_active && "LED", e.buzzer_active && "Buzzer"].filter(Boolean).join(" · ") || "none fired"}</small>
                  </div>
                  <button className={`btn small ${done ? "ghost" : "primary"}`} disabled={done} onClick={() => onAck([e.id])}>
                    <Check size={14} /> {done ? "Done" : "Acknowledge"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

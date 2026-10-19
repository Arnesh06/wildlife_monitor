import React, { useMemo } from "react";
import { Activity, AlertTriangle, Camera, CircleDot, Leaf, PawPrint, Radio, Shield, Zap } from "lucide-react";
import { AreaChart, Donut } from "../components/charts";
import { Radar } from "../components/Radar";
import { GuardianBanner } from "../components/Shell";
import { EmptyState, PanelHead, RiskBadge, Skeleton, StatCard } from "../components/ui";
import { sparkSeries, speciesCounts, timelineBins } from "../lib/analytics";
import { confidence, formatDate, hasActuation, relativeTime, riskClass, snapshotUrl, speciesEmoji, isIncident } from "../lib/utils";

export default function Overview({ events, summary, loading, now, range, onOpen, onNavigate }) {
  const latest = events[0] || null;
  const image = latest ? snapshotUrl(latest) : null;
  const live = latest && now - new Date(latest.created_at).getTime() < 60000;

  const bins = useMemo(() => timelineBins(events, range, now), [events, range, now]);
  const species = useMemo(() => speciesCounts(events).slice(0, 8), [events]);
  const spDet = useMemo(() => sparkSeries(events, () => true, 12), [events, now]);
  const spHigh = useMemo(() => sparkSeries(events, (e) => riskClass(e.risk_level) === "high", 12), [events, now]);
  const spInc = useMemo(() => sparkSeries(events, (e) => isIncident(e) && hasActuation(e), 12), [events, now]);

  return (
    <div className="view">
      <GuardianBanner events={events} now={now} onOpen={onOpen} />

      <section className="stats-grid">
        <StatCard icon={Activity} label="DETECTIONS" value={summary.total} detail={`In selected range`} spark={spDet} tone="success" delay={0} />
        <StatCard icon={AlertTriangle} label="HIGH RISK" value={summary.high} detail={`${summary.incidents} incidents total`} spark={spHigh} tone={summary.high ? "danger" : ""} delay={60} />
        <StatCard icon={PawPrint} label="SPECIES SEEN" value={summary.species} detail="Unique animal classes" delay={120} />
        <StatCard
          icon={Shield}
          label="DETERRENT RESPONSE"
          value={summary.responseRate == null ? "—" : Math.round(summary.responseRate * 100)}
          suffix={summary.responseRate == null ? "" : "%"}
          detail="Incidents with a deterrent"
          spark={spInc}
          tone="amber"
          delay={180}
        />
      </section>

      <section className="grid-hero">
        <div className="panel">
          <PanelHead eyebrow="LATEST EVIDENCE" title="Detection Snapshot">
            {latest && <RiskBadge risk={latest.risk_level} />}
          </PanelHead>
          <div className={`snapshot-frame ${live ? "live" : ""}`} onClick={() => latest && onOpen(latest)} role={latest ? "button" : undefined} tabIndex={latest ? 0 : undefined}
            onKeyDown={(e) => e.key === "Enter" && latest && onOpen(latest)}>
            {loading && !latest ? (
              <Skeleton h="100%" r={0} />
            ) : image ? (
              <img key={latest.id} src={image} alt={`${latest.animal || "Wildlife"} detection`} />
            ) : (
              <div className="empty-snapshot">
                <Camera size={42} />
                <strong>No snapshot available</strong>
                <span>Run the Pi/PC detector to upload the first image.</span>
              </div>
            )}
            {latest && (
              <>
                <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
                {live && <span className="live-tag"><i /> LIVE</span>}
                {live && <span className="scanline" />}
                <div className="image-overlay">
                  <span>{speciesEmoji(latest.animal)} {latest.animal?.toUpperCase()}</span>
                  <em>{relativeTime(latest.created_at, now)}</em>
                  <b>{confidence(latest.confidence)}</b>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="panel detection-panel">
          <PanelHead eyebrow="CURRENT EVENT" title={latest?.animal || "Waiting"}>
            <span className="live-ring"><span /></span>
          </PanelHead>
          {latest ? (
            <div className="detail-list" key={latest.id}>
              <div className="detail-row"><span>Confidence</span><strong>{confidence(latest.confidence)}</strong></div>
              <div className="detail-row"><span>Radar</span><strong>{latest.radar_detected ? "DETECTED" : "STANDBY"}</strong></div>
              <div className="detail-row"><span>Distance</span><strong>{latest.radar_distance != null ? `${latest.radar_distance} m` : "—"}</strong></div>
              <div className="detail-row"><span>Track ID</span><strong>#{latest.track_id ?? "—"}</strong></div>
              <div className="detail-row"><span>Detected</span><strong>{formatDate(latest.created_at)}</strong></div>
            </div>
          ) : (
            <EmptyState icon={Radio} title="Waiting for the edge node" text="The first detection will appear here in real time." />
          )}
          <div className="actuator-grid">
            <div className={`actuator ${latest?.laser_active ? "on" : ""}`}><Zap size={16} /><span>Laser</span><b>{latest?.laser_active ? "ON" : "OFF"}</b></div>
            <div className={`actuator ${latest?.led_active ? "on" : ""}`}><CircleDot size={16} /><span>Warning LED</span><b>{latest?.led_active ? "ON" : "OFF"}</b></div>
            <div className={`actuator ${latest?.buzzer_active ? "on" : ""}`}><AlertTriangle size={16} /><span>Buzzer</span><b>{latest?.buzzer_active ? "ON" : "OFF"}</b></div>
          </div>
        </div>
      </section>

      <section className="grid-two">
        <div className="panel">
          <PanelHead eyebrow="ACTIVITY" title="Detections over time">
            <button className="btn ghost small" onClick={() => onNavigate("analytics")}>Full analytics</button>
          </PanelHead>
          <div className="panel-pad"><AreaChart bins={bins} height={230} /></div>
        </div>
        <div className="panel">
          <PanelHead eyebrow="RADAR" title="Range view" />
          <div className="panel-pad"><Radar events={events} now={now} /></div>
        </div>
      </section>

      <section className="grid-two even">
        <div className="panel">
          <PanelHead eyebrow="BIODIVERSITY" title="Species mix" />
          <div className="panel-pad">
            {species.length ? <Donut data={species} /> : <EmptyState icon={Leaf} title="No species yet" text="Species activity will appear as detections arrive." />}
          </div>
        </div>
        <div className="panel">
          <PanelHead eyebrow="LIVE FEED" title="Recent activity">
            <button className="btn ghost small" onClick={() => onNavigate("detections")}>View all</button>
          </PanelHead>
          <ul className="feed">
            {events.slice(0, 7).map((e) => (
              <li key={e.id}>
                <button onClick={() => onOpen(e)}>
                  <span className={`feed-emoji ${riskClass(e.risk_level)}`}>{speciesEmoji(e.animal)}</span>
                  <span className="feed-copy">
                    <strong>{e.animal}</strong>
                    <small>{confidence(e.confidence)} · {e.radar_distance != null ? `${e.radar_distance} m` : "no radar"}</small>
                  </span>
                  <RiskBadge risk={e.risk_level} />
                  <em>{relativeTime(e.created_at, now)}</em>
                </button>
              </li>
            ))}
            {!events.length && <li className="feed-empty">{loading ? "Loading detections…" : "No detections in this range."}</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}

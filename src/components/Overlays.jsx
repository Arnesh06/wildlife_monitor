import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Camera, Check, ChevronLeft, ChevronRight, CircleDot, Copy, ExternalLink, PawPrint, Search, X, Zap
} from "lucide-react";
import { RiskBadge } from "./ui";
import {
  confidence, formatDate, isIncident, relativeTime, riskClass, snapshotUrl, speciesEmoji
} from "../lib/utils";

/* ---------------- Event modal with prev/next ---------------- */
export function EventModal({ event, list, onNavigate, onClose, acked, onAck }) {
  const [copied, setCopied] = useState(false);
  const idx = list.findIndex((e) => e.id === event?.id);

  useEffect(() => {
    if (!event) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && idx > -1 && idx < list.length - 1) onNavigate(list[idx + 1]);
      if (e.key === "ArrowLeft" && idx > 0) onNavigate(list[idx - 1]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [event, idx, list, onClose, onNavigate]);

  if (!event) return null;
  const image = snapshotUrl(event);
  const canAck = isIncident(event);
  const isAcked = acked.has(event.id);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(event, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="modal-image" key={event.id}>
          {image ? (
            <img src={image} alt={event.animal || "Wildlife detection"} />
          ) : (
            <div className="empty-snapshot"><Camera size={36} /><span>No snapshot for this event</span></div>
          )}
          <div className="modal-badges">
            <RiskBadge risk={event.risk_level} />
          </div>
          {idx > 0 && (
            <button className="modal-nav prev" onClick={() => onNavigate(list[idx - 1])} aria-label="Newer event">
              <ChevronLeft size={20} />
            </button>
          )}
          {idx > -1 && idx < list.length - 1 && (
            <button className="modal-nav next" onClick={() => onNavigate(list[idx + 1])} aria-label="Older event">
              <ChevronRight size={20} />
            </button>
          )}
        </div>
        <div className="modal-body">
          <div className="modal-title">
            <h3><span className="species-emoji">{speciesEmoji(event.animal)}</span> {event.animal || "Unidentified"}</h3>
            <span className="modal-pos">{idx > -1 ? `${idx + 1} / ${list.length}` : ""}</span>
          </div>
          <p className="modal-time">{formatDate(event.created_at)} · {relativeTime(event.created_at)}</p>
          <div className="detail-list">
            <div className="detail-row"><span>Confidence</span><strong>{confidence(event.confidence)}</strong></div>
            <div className="detail-row"><span>Radar</span><strong>{event.radar_detected ? "DETECTED" : "STANDBY"}</strong></div>
            <div className="detail-row"><span>Distance</span><strong>{event.radar_distance != null ? `${event.radar_distance} m` : "—"}</strong></div>
            <div className="detail-row"><span>Track ID</span><strong>#{event.track_id ?? "—"}</strong></div>
          </div>
          <div className="actuator-grid tight">
            <div className={`actuator ${event.laser_active ? "on" : ""}`}><Zap size={16} /><span>Laser</span><b>{event.laser_active ? "ON" : "OFF"}</b></div>
            <div className={`actuator ${event.led_active ? "on" : ""}`}><CircleDot size={16} /><span>LED</span><b>{event.led_active ? "ON" : "OFF"}</b></div>
            <div className={`actuator ${event.buzzer_active ? "on" : ""}`}><AlertTriangle size={16} /><span>Buzzer</span><b>{event.buzzer_active ? "ON" : "OFF"}</b></div>
          </div>
          <div className="modal-actions">
            {canAck && (
              <button className={`btn ${isAcked ? "ghost" : "primary"}`} disabled={isAcked} onClick={() => onAck([event.id])}>
                <Check size={14} /> {isAcked ? "Acknowledged" : "Acknowledge incident"}
              </button>
            )}
            <button className="btn ghost" onClick={copy}><Copy size={14} /> {copied ? "Copied" : "Copy JSON"}</button>
            {image && !String(event.snapshot_path).startsWith("demo:") && (
              <a className="btn ghost" href={image} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open image</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Toasts ---------------- */
export function ToastStack({ toasts, onDismiss, onOpen }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.toastId} className={`toast ${riskClass(t.risk_level)}`}>
          <button className="toast-main" onClick={() => { onOpen(t); onDismiss(t.toastId); }}>
            <span className="toast-emoji">{speciesEmoji(t.animal)}</span>
            <span className="toast-copy">
              <strong>{t.animal || "Detection"}</strong>
              <span>{t.risk_level || "NORMAL"} · {confidence(t.confidence)}{t.radar_distance != null ? ` · ${t.radar_distance} m` : ""}</span>
            </span>
          </button>
          <button className="toast-x" onClick={() => onDismiss(t.toastId)} aria-label="Dismiss"><X size={14} /></button>
          <i className="toast-timer" />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Command palette ---------------- */
export function CommandPalette({ open, onClose, commands }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return commands.filter((c) => !needle || `${c.label} ${c.group}`.toLowerCase().includes(needle));
  }, [q, commands]);

  useEffect(() => setSel(0), [q]);

  if (!open) return null;

  const run = (cmd) => {
    onClose();
    setTimeout(() => cmd.run(), 0);
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    if (e.key === "Enter" && results[sel]) run(results[sel]);
    if (e.key === "Escape") onClose();
  };

  let lastGroup = null;
  return (
    <div className="modal-backdrop palette-backdrop" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="palette-input">
          <Search size={16} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Type a command or jump to a page…" />
          <kbd>esc</kbd>
        </div>
        <ul className="palette-list">
          {results.length === 0 && <li className="palette-empty"><PawPrint size={16} /> Nothing matches “{q}”</li>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? <li className="palette-group" key={`g-${c.group}`}>{c.group}</li> : null;
            lastGroup = c.group;
            return (
              <React.Fragment key={c.id}>
                {header}
                <li>
                  <button className={i === sel ? "active" : ""} onMouseEnter={() => setSel(i)} onClick={() => run(c)}>
                    {c.icon}
                    <span>{c.label}</span>
                    {c.hint && <kbd>{c.hint}</kbd>}
                  </button>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

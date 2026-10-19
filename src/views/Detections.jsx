import React, { useEffect, useMemo, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Clock3, Download, FileJson, LayoutGrid, Rows3, Search } from "lucide-react";
import { EmptyState, RiskBadge, Segmented, Skeleton } from "../components/ui";
import {
  confidence, exportCsv, exportJson, formatTime, formatDate, relativeTime, riskRank, snapshotUrl, speciesEmoji
} from "../lib/utils";

const SORTS = {
  newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
  oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
  confidence: (a, b) => Number(b.confidence) - Number(a.confidence),
  risk: (a, b) => riskRank(b.risk_level) - riskRank(a.risk_level) || new Date(b.created_at) - new Date(a.created_at),
  distance: (a, b) => (a.radar_distance ?? 1e9) - (b.radar_distance ?? 1e9)
};

export default function Detections({ events, loading, flashId, onOpen, now, onFiltered }) {
  const [mode, setMode] = useState("table");
  const [search, setSearch] = useState("");
  const [animal, setAnimal] = useState("all");
  const [risk, setRisk] = useState("all");
  const [radarOnly, setRadarOnly] = useState(false);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const pageSize = mode === "table" ? 14 : 12;

  const animals = useMemo(() => Array.from(new Set(events.map((e) => e.animal).filter(Boolean))).sort(), [events]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return events
      .filter((e) => {
        if (animal !== "all" && e.animal !== animal) return false;
        if (risk !== "all" && String(e.risk_level || "NORMAL").toLowerCase() !== risk) return false;
        if (radarOnly && !e.radar_detected) return false;
        if (needle && !`${e.animal} ${e.track_id ?? ""}`.toLowerCase().includes(needle)) return false;
        return true;
      })
      .sort(SORTS[sort]);
  }, [events, animal, risk, radarOnly, search, sort]);

  useEffect(() => setPage(0), [animal, risk, radarOnly, search, sort, mode]);
  useEffect(() => onFiltered?.(filtered), [filtered, onFiltered]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const hasFilters = animal !== "all" || risk !== "all" || radarOnly || search;

  return (
    <div className="view">
      <section className="panel">
        <div className="toolbar">
          <div className="search-field">
            <Search size={14} />
            <input type="text" placeholder="Search species or track ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={animal} onChange={(e) => setAnimal(e.target.value)} aria-label="Species filter">
            <option value="all">All species</option>
            {animals.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Risk filter">
            <option value="all">All risk levels</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="confidence">Highest confidence</option>
            <option value="risk">Highest risk</option>
            <option value="distance">Closest radar range</option>
          </select>
          <label className={`chip ${radarOnly ? "on" : ""}`}>
            <input type="checkbox" checked={radarOnly} onChange={(e) => setRadarOnly(e.target.checked)} />
            Radar confirmed
          </label>
          <span className="toolbar-spacer" />
          <Segmented
            label="View mode"
            value={mode}
            onChange={setMode}
            options={[
              { id: "table", label: "", icon: <Rows3 size={15} />, title: "Table" },
              { id: "grid", label: "", icon: <LayoutGrid size={15} />, title: "Gallery" }
            ]}
          />
          <button className="btn ghost small" onClick={() => exportCsv(filtered)} disabled={!filtered.length}><Download size={13} /> CSV</button>
          <button className="btn ghost small" onClick={() => exportJson(filtered)} disabled={!filtered.length}><FileJson size={13} /> JSON</button>
        </div>
        <div className="result-line">
          <span>{filtered.length} of {events.length} detections</span>
          {hasFilters && (
            <button className="link" onClick={() => { setSearch(""); setAnimal("all"); setRisk("all"); setRadarOnly(false); }}>Clear filters</button>
          )}
        </div>

        {loading && !events.length ? (
          <div className="panel-pad skeleton-stack">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} h={44} />)}</div>
        ) : !filtered.length ? (
          <EmptyState icon={Camera} title={events.length ? "No detections match your filters" : "No detections yet"} text={events.length ? "Try clearing a filter." : "They will appear here in real time."} />
        ) : mode === "table" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>TIME</th><th>ANIMAL</th><th>CONFIDENCE</th><th>RADAR</th><th>DISTANCE</th><th>RISK</th><th>ACTUATION</th></tr>
              </thead>
              <tbody>
                {slice.map((e) => (
                  <tr key={e.id} className={e.id === flashId ? "row-flash" : ""} onClick={() => onOpen(e, filtered)} tabIndex={0} onKeyDown={(ev) => ev.key === "Enter" && onOpen(e, filtered)}>
                    <td><div className="cell-time"><Clock3 size={14} /> {formatTime(e.created_at)}<small>{relativeTime(e.created_at, now)}</small></div></td>
                    <td><strong className="animal-name">{speciesEmoji(e.animal)} {e.animal}</strong></td>
                    <td>
                      <div className="confidence-cell">
                        <span>{confidence(e.confidence)}</span>
                        <div className="meter"><i style={{ width: `${Number(e.confidence || 0) * 100}%` }} /></div>
                      </div>
                    </td>
                    <td><span className={`mini-status ${e.radar_detected ? "active" : ""}`}>{e.radar_detected ? "DETECTED" : "STANDBY"}</span></td>
                    <td>{e.radar_distance != null ? `${e.radar_distance} m` : "—"}</td>
                    <td><RiskBadge risk={e.risk_level} /></td>
                    <td>
                      <span className="actuation-text">
                        {[e.laser_active && "Laser", e.led_active && "LED", e.buzzer_active && "Buzzer"].filter(Boolean).join(" · ") || "None"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gallery">
            {slice.map((e, i) => (
              <button key={e.id} className={`shot ${e.id === flashId ? "row-flash" : ""}`} style={{ animationDelay: `${i * 35}ms` }} onClick={() => onOpen(e, filtered)}>
                <div className="shot-img">
                  {snapshotUrl(e) ? <img loading="lazy" src={snapshotUrl(e)} alt={e.animal} /> : <Camera size={28} />}
                  <span className="shot-risk"><RiskBadge risk={e.risk_level} /></span>
                </div>
                <div className="shot-meta">
                  <strong>{speciesEmoji(e.animal)} {e.animal}</strong>
                  <small>{confidence(e.confidence)} · {formatDate(e.created_at)}</small>
                </div>
              </button>
            ))}
          </div>
        )}

        {filtered.length > pageSize && (
          <div className="pager">
            <button className="btn ghost small" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><ChevronLeft size={14} /> Prev</button>
            <span>Page {safePage + 1} of {pages}</span>
            <button className="btn ghost small" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Next <ChevronRight size={14} /></button>
          </div>
        )}
      </section>
    </div>
  );
}

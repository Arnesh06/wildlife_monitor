import React, { useMemo } from "react";
import { Lightbulb } from "lucide-react";
import { AreaChart, Bars, Donut, Heatmap, Ring, RiskStack } from "../components/charts";
import { EmptyState, PanelHead } from "../components/ui";
import {
  buildInsights, confidenceHistogram, heatmap, hourOfDay, riskCounts, speciesCounts, timelineBins
} from "../lib/analytics";

export default function Analytics({ events, summary, range, now }) {
  const bins = useMemo(() => timelineBins(events, range, now), [events, range, now]);
  const species = useMemo(() => speciesCounts(events), [events]);
  const risks = useMemo(() => riskCounts(events), [events]);
  const hours = useMemo(() => hourOfDay(events), [events]);
  const hist = useMemo(() => confidenceHistogram(events), [events]);
  const heat = useMemo(() => heatmap(events, now), [events, now]);
  const insights = useMemo(() => buildInsights(events), [events]);
  const peak = hours.indexOf(Math.max(...hours));

  return (
    <div className="view">
      <section className="panel">
        <PanelHead eyebrow="TREND" title="Activity timeline" />
        <div className="panel-pad"><AreaChart bins={bins} height={260} /></div>
      </section>

      <section className="grid-two even">
        <div className="panel">
          <PanelHead eyebrow="WEEKLY RHYTHM" title="When animals show up" />
          <div className="panel-pad">
            <p className="hint">{range === "1h" || range === "24h" ? "Showing the last 7 days by hour — pick 7D or ALL in the range selector to fill the whole week." : "Last 7 days by hour of day."}</p>
            <Heatmap data={heat} />
          </div>
        </div>
        <div className="panel">
          <PanelHead eyebrow="INSIGHTS" title="What the data says" />
          <div className="panel-pad">
            {insights.length ? (
              <ul className="insights">
                {insights.map((i, k) => (
                  <li key={k} className={i.tone} style={{ animationDelay: `${k * 70}ms` }}>
                    <Lightbulb size={16} />
                    <div><strong>{i.title}</strong><span>{i.text}</span></div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Lightbulb} title="Not enough data yet" text="Insights unlock after a few detections in this range." />
            )}
          </div>
        </div>
      </section>

      <section className="grid-three">
        <div className="panel">
          <PanelHead eyebrow="BY HOUR" title="Crossing hours" />
          <div className="panel-pad">
            <Bars values={hours} labels={hours.map((_, h) => String(h).padStart(2, "0"))} highlight={summary.total ? peak : -1} height={110} format={(v) => `${v} detections`} />
          </div>
        </div>
        <div className="panel">
          <PanelHead eyebrow="RISK" title="Risk distribution" />
          <div className="panel-pad"><RiskStack counts={risks} /></div>
        </div>
        <div className="panel">
          <PanelHead eyebrow="RESPONSE" title="Deterrent rate" />
          <div className="panel-pad center">
            <Ring value={summary.responseRate} label="of incidents" tone="var(--amber)" />
            <p className="hint tc">Medium/high-risk events where the laser, LED or buzzer fired.</p>
          </div>
        </div>
      </section>

      <section className="grid-two even">
        <div className="panel">
          <PanelHead eyebrow="SPECIES" title="Who's visiting" />
          <div className="panel-pad">{species.length ? <Donut data={species.slice(0, 8)} size={190} /> : <EmptyState title="No data" />}</div>
        </div>
        <div className="panel">
          <PanelHead eyebrow="MODEL" title="Detection confidence" />
          <div className="panel-pad">
            <Bars values={hist} labels={hist.map((_, i) => `${i * 10}%`)} height={140} format={(v) => `${v} detections`} />
            <p className="hint">Average confidence {(summary.avgConf * 100).toFixed(0)}%. Low-confidence clusters may need a retrained model or better lighting.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

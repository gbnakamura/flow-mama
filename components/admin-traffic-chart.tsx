"use client";

import { useState } from "react";

type TrafficPoint = {
  date: string;
  visitors: number;
  pageviews: number;
};

type AdminTrafficChartProps = {
  points: TrafficPoint[];
  visitors: number;
  pageviews: number;
};

type Metric = "visitors" | "pageviews";

const WIDTH = 1000;
const HEIGHT = 310;
const PLOT = { left: 54, right: 18, top: 28, bottom: 42 };
const dateLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
const tooltipDate = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });

function niceMaximum(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const rounded = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return rounded * magnitude;
}

export function AdminTrafficChart({ points, visitors, pageviews }: AdminTrafficChartProps) {
  const [metric, setMetric] = useState<Metric>("visitors");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const values = points.map((point) => point[metric]);
  const maximum = niceMaximum(Math.max(...values, 1));
  const plotWidth = WIDTH - PLOT.left - PLOT.right;
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const xFor = (index: number) => PLOT.left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const yFor = (value: number) => PLOT.top + plotHeight - (value / maximum) * plotHeight;
  const coordinates = points.map((point, index) => ({ x: xFor(index), y: yFor(point[metric]), point }));
  const line = coordinates.map(({ x, y }, index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ");
  const area = coordinates.length ? `${line} L ${coordinates.at(-1)!.x} ${PLOT.top + plotHeight} L ${coordinates[0].x} ${PLOT.top + plotHeight} Z` : "";
  const active = activeIndex === null ? null : coordinates[activeIndex];
  const labelEvery = points.length > 14 ? 5 : points.length > 8 ? 2 : 1;
  const accent = metric === "visitors" ? "coral" : "sage";

  return (
    <section className={`admin-panel analytics-traffic-panel analytics-traffic-${accent}`}>
      <div className="analytics-metric-tabs" role="tablist" aria-label="Traffic metric">
        <button className={metric === "visitors" ? "active" : ""} role="tab" aria-selected={metric === "visitors"} onClick={() => { setMetric("visitors"); setActiveIndex(null); }}>
          <span>Visitors</span><strong>{visitors.toLocaleString("en-GB")}</strong>
        </button>
        <button className={metric === "pageviews" ? "active" : ""} role="tab" aria-selected={metric === "pageviews"} onClick={() => { setMetric("pageviews"); setActiveIndex(null); }}>
          <span>Page views</span><strong>{pageviews.toLocaleString("en-GB")}</strong>
        </button>
      </div>

      <div className="analytics-area-scroll">
        <div className="analytics-area-chart" onPointerLeave={() => setActiveIndex(null)}>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${metric === "visitors" ? "Visitors" : "Page views"} by day`}>
            <defs>
              <linearGradient id={`analytics-fill-${accent}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = PLOT.top + plotHeight - ratio * plotHeight;
              return <g key={ratio}><line className="analytics-grid-line" x1={PLOT.left} x2={WIDTH - PLOT.right} y1={y} y2={y} /><text className="analytics-axis-label" x={PLOT.left - 14} y={y + 4} textAnchor="end">{Math.round(maximum * ratio)}</text></g>;
            })}
            {area && <path className="analytics-area-fill" d={area} fill={`url(#analytics-fill-${accent})`} />}
            {line && <path className="analytics-area-line" d={line} />}
            {coordinates.map(({ x, point }, index) => (
              <g key={point.date}>
                {(index % labelEvery === 0 || index === coordinates.length - 1) && <text className="analytics-date-label" x={x} y={HEIGHT - 12} textAnchor={index === 0 ? "start" : index === coordinates.length - 1 ? "end" : "middle"}>{dateLabel.format(new Date(`${point.date}T12:00:00.000Z`))}</text>}
                <rect className="analytics-hit-area" x={x - Math.max(8, plotWidth / Math.max(points.length, 1) / 2)} y={PLOT.top} width={Math.max(16, plotWidth / Math.max(points.length, 1))} height={plotHeight} tabIndex={0} aria-label={`${tooltipDate.format(new Date(`${point.date}T12:00:00.000Z`))}: ${point[metric]} ${metric === "visitors" ? "visitors" : "page views"}`} onPointerEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} />
              </g>
            ))}
            {active && <g className="analytics-active-marker"><line x1={active.x} x2={active.x} y1={PLOT.top} y2={PLOT.top + plotHeight} /><circle cx={active.x} cy={active.y} r="5" /></g>}
          </svg>
          {active && (
            <div className={`analytics-tooltip${active.x > WIDTH * 0.76 ? " align-right" : ""}`} style={{ left: `${(active.x / WIDTH) * 100}%`, top: `${Math.max(8, (active.y / HEIGHT) * 100 - 2)}%` }}>
              <strong><i />{metric === "visitors" ? "Visitors" : "Page views"} <span>{active.point[metric].toLocaleString("en-GB")}</span></strong>
              <small>{tooltipDate.format(new Date(`${active.point.date}T12:00:00.000Z`))}</small>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

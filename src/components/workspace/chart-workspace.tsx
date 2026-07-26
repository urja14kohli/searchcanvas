"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ChartColumn, ChartLine, ChartPie, Table2 } from "lucide-react";
import type { ChartKind, ChartPoint, ChartWorkspaceData } from "@/lib/types";
import { formatValue } from "@/lib/format";
import { TableWorkspace } from "@/components/workspace/table-workspace";

/**
 * A chart of sourced figures.
 *
 * The whole reason this is hand-drawn SVG rather than a chart library: every
 * point has to be an anchor to the page it was read from. The dot is the
 * citation, so hovering explains the number and clicking opens the proof.
 */

const W = 920;
const H = 380;
const PAD = { top: 24, right: 28, bottom: 52, left: 68 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** The one non-monochrome colour in the app, reserved for data. */
const ACCENT = "#e11d48";

type Props = {
  data: ChartWorkspaceData;
};

type View = ChartKind | "table";

export function ChartWorkspace({ data }: Props) {
  const [view, setView] = useState<View>(data.chartKind);
  const [active, setActive] = useState<number | null>(null);

  const points = data.points;
  // A single point is a fact, not a chart; show the figures instead.
  const plottable = points.length >= 2;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            {data.title}
          </h1>
          <p className="mt-2 text-zinc-500">{data.subtitle}</p>
        </div>

        {plottable && (
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-white/10 dark:bg-zinc-900">
            <ViewButton current={view} value="line" onSelect={setView} label="Line">
              <ChartLine className="h-3.5 w-3.5" />
            </ViewButton>
            <ViewButton current={view} value="bar" onSelect={setView} label="Bar">
              <ChartColumn className="h-3.5 w-3.5" />
            </ViewButton>
            <ViewButton current={view} value="pie" onSelect={setView} label="Pie">
              <ChartPie className="h-3.5 w-3.5" />
            </ViewButton>
            <ViewButton current={view} value="table" onSelect={setView} label="Table">
              <Table2 className="h-3.5 w-3.5" />
            </ViewButton>
          </div>
        )}
      </div>

      {view === "table" || !plottable ? (
        <TableWorkspace
          data={{
            type: "spreadsheet",
            title: data.title,
            subtitle: "The figures behind the chart, with the page each came from",
            columns: data.table?.columns ?? [],
            rows: data.table?.rows ?? [],
            found: data.table?.rows.length,
          }}
        />
      ) : (
        <>
          <div className="relative rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-zinc-900">
            {view === "pie" ? (
              <PieChart points={points} unit={data.unit} active={active} onActive={setActive} />
            ) : (
              <AxisChart
                kind={view}
                points={points}
                unit={data.unit}
                valueLabel={data.valueLabel}
                active={active}
                onActive={setActive}
              />
            )}
          </div>

          <SourceList points={points} unit={data.unit} onHover={setActive} />
        </>
      )}
    </div>
  );
}

function ViewButton({
  current,
  value,
  onSelect,
  label,
  children,
}: {
  current: View;
  value: View;
  onSelect: (v: View) => void;
  label: string;
  children: React.ReactNode;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={selected}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs transition ${
        selected
          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

type Scale = {
  /** value -> 0..1 across the plot height */
  project: (value: number) => number;
  ticks: number[];
  log: boolean;
};

/**
 * Chooses a value axis that neither lies nor flattens.
 *
 * Growth series routinely span orders of magnitude — $1M in 2023 against $4B
 * in 2026 — and a linear axis pins every early year flat against zero. Once
 * the spread is that wide a log axis is the readable and honest option, and
 * one bad figure from one source no longer squashes the rest of the chart.
 *
 * Bars stay linear whatever the spread: bar length has to stay proportional.
 */
function scaleFor(values: number[], allowLog: boolean): Scale {
  if (values.length === 0) {
    return { project: () => 0, ticks: [0], log: false };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (allowLog && min > 0 && max / min > 100) {
    const loExp = Math.floor(Math.log10(min));
    const hiExp = Math.ceil(Math.log10(max));
    const span = hiExp - loExp || 1;
    // Every decade, thinned out so a six-decade axis stays legible.
    const stride = Math.ceil(span / 5);
    const ticks: number[] = [];
    for (let exp = loExp; exp <= hiExp; exp += stride) ticks.push(10 ** exp);

    return {
      project: (value) => (Math.log10(Math.max(value, 10 ** loExp)) - loExp) / span,
      ticks,
      log: true,
    };
  }

  const { lo, hi } =
    min >= 0 && min <= max * 0.5
      ? { lo: 0, hi: max * 1.08 || 1 }
      : (() => {
          const span = max - min || Math.abs(max) || 1;
          return { lo: min - span * 0.25, hi: max + span * 0.15 };
        })();

  const span = hi - lo || 1;

  return {
    project: (value) => (value - lo) / span,
    ticks: Array.from({ length: 5 }, (_, i) => lo + (span / 4) * i),
    log: false,
  };
}

/** Catmull-Rom through every point, converted to cubic beziers. */
function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length < 2) return "";

  let d = `M ${coords[0].x} ${coords[0].y}`;

  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

function AxisChart({
  kind,
  points,
  unit,
  valueLabel,
  active,
  onActive,
}: {
  kind: "line" | "bar";
  points: ChartPoint[];
  unit: string;
  valueLabel: string;
  active: number | null;
  onActive: (i: number | null) => void;
}) {
  const { coords, ticks, log, zeroY } = useMemo(() => {
    const values = points.map((p) => p.value);
    const scale = scaleFor(values, kind === "line");
    const y = (v: number) => PAD.top + PLOT_H - scale.project(v) * PLOT_H;

    // Bars sit in the middle of their band; line points span edge to edge.
    const x = (i: number) =>
      kind === "bar"
        ? PAD.left + (PLOT_W / points.length) * (i + 0.5)
        : PAD.left + (points.length === 1 ? PLOT_W / 2 : (PLOT_W / (points.length - 1)) * i);

    const zero = scale.project(0);

    return {
      log: scale.log,
      coords: points.map((p, i) => ({ x: x(i), y: y(p.value) })),
      ticks: scale.ticks.map((value) => ({ value, y: y(value) })),
      // Negative figures need a mid-plot baseline; a log axis has no zero.
      zeroY: !scale.log && zero > 0 && zero < 1 ? y(0) : null,
    };
  }, [points, kind]);

  // Crowded axes get every other label; anything denser gets every fourth.
  const labelEvery = points.length > 16 ? 4 : points.length > 9 ? 2 : 1;
  const last = points.length - 1;
  const barWidth = Math.min(48, (PLOT_W / points.length) * 0.6);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`${valueLabel} by period`}
      >
        <defs>
          <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.18" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>

        <text
          x={PAD.left}
          y={12}
          className="fill-zinc-400 text-[12px] uppercase tracking-wide dark:fill-zinc-500"
        >
          {valueLabel}
          {log ? " · log scale" : ""}
        </text>

        {ticks.map((tick, i) => (
          <g key={`tick-${i}`}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={tick.y}
              y2={tick.y}
              className="stroke-zinc-200 dark:stroke-white/10"
              strokeWidth="1"
              strokeDasharray="3 5"
            />
            <text
              x={PAD.left - 12}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-zinc-400 text-[13px] tabular-nums dark:fill-zinc-500"
            >
              {formatValue(tick.value, unit)}
            </text>
          </g>
        ))}

        {/* axes, drawn last of the furniture so they sit over the gridlines */}
        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={PAD.top + PLOT_H}
          className="stroke-zinc-300 dark:stroke-white/20"
          strokeWidth="1.5"
        />
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={zeroY ?? PAD.top + PLOT_H}
          y2={zeroY ?? PAD.top + PLOT_H}
          className="stroke-zinc-300 dark:stroke-white/20"
          strokeWidth="1.5"
        />

        {kind === "line" && coords.length > 1 && (
          <>
            <motion.path
              d={`${smoothPath(coords)} L ${coords[coords.length - 1].x} ${
                zeroY ?? PAD.top + PLOT_H
              } L ${coords[0].x} ${zeroY ?? PAD.top + PLOT_H} Z`}
              fill="url(#chart-area)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            />
            <motion.path
              d={smoothPath(coords)}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="stroke-zinc-900 dark:stroke-white"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
            />
          </>
        )}

        {points.map((point, i) => {
          const { x, y } = coords[i];
          const isActive = active === i;
          const baseline = zeroY ?? PAD.top + PLOT_H;

          return (
            <Anchor key={point.id} href={point.url}>
              <g
                onMouseEnter={() => onActive(i)}
                onMouseLeave={() => onActive(null)}
                onFocus={() => onActive(i)}
                onBlur={() => onActive(null)}
                className="cursor-pointer outline-none"
              >
                {kind === "bar" ? (
                  <motion.rect
                    x={x - barWidth / 2}
                    width={barWidth}
                    rx="6"
                    fill={ACCENT}
                    fillOpacity={isActive ? 1 : 0.85}
                    initial={{ y: baseline, height: 0 }}
                    animate={{ y: Math.min(y, baseline), height: Math.abs(baseline - y) }}
                    transition={{ duration: 0.5, delay: i * 0.04, ease: "easeOut" }}
                  />
                ) : (
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={isActive ? 8 : 5.5}
                    fill={ACCENT}
                    className="stroke-white dark:stroke-zinc-900"
                    strokeWidth="2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
                  />
                )}

                {/* generous invisible hit area — the dots are small targets */}
                <rect
                  x={x - Math.max(barWidth, 40) / 2}
                  y={PAD.top}
                  width={Math.max(barWidth, 40)}
                  height={PLOT_H}
                  fill="transparent"
                />

                {/* The last period always gets a label, and any regular label
                    that would crowd it is dropped. Ends anchor inward so they
                    do not run off the plot. */}
                {((i % labelEvery === 0 && last - i >= labelEvery) || i === last) && (
                  <text
                    x={x}
                    y={PAD.top + PLOT_H + 26}
                    textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
                    className={`text-[13px] ${
                      isActive
                        ? "fill-zinc-900 dark:fill-white"
                        : "fill-zinc-400 dark:fill-zinc-500"
                    }`}
                  >
                    {point.label.length > 14 ? `${point.label.slice(0, 13)}…` : point.label}
                  </text>
                )}
              </g>
            </Anchor>
          );
        })}
      </svg>

      {active !== null && points[active] && (
        <Tooltip
          point={points[active]}
          unit={unit}
          xPercent={(coords[active].x / W) * 100}
          yPercent={(coords[active].y / H) * 100}
        />
      )}
    </div>
  );
}

/** Wraps a mark in a link when we know where the figure came from. */
function Anchor({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return <g>{children}</g>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function Tooltip({
  point,
  unit,
  xPercent,
  yPercent,
}: {
  point: ChartPoint;
  unit: string;
  xPercent: number;
  yPercent: number;
}) {
  return (
    <div
      className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-full pb-3"
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
    >
      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-zinc-950">
        <p className="text-xs text-zinc-400">{point.label}</p>
        <p className="mt-0.5 text-lg font-medium tabular-nums text-zinc-900 dark:text-white">
          {formatValue(point.value, unit)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">as reported: {point.display}</p>
        {point.note && (
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{point.note}</p>
        )}
        {point.source && (
          <p className="mt-2 flex items-center gap-1 border-t border-zinc-100 pt-2 text-[11px] text-zinc-400 dark:border-white/10">
            {point.source}
            {point.url && <ArrowUpRight className="h-3 w-3" />}
          </p>
        )}
      </div>
    </div>
  );
}

const PIE_R = 130;
const PIE_CX = 170;
const PIE_CY = 170;
const MAX_SLICES = 10;

type Arc = { point: ChartPoint; share: number; d: string };

/** Walks the slices clockwise from twelve o'clock into wedge paths. */
function buildArcs(slices: ChartPoint[], total: number): Arc[] {
  const arcs: Arc[] = [];
  let angle = -Math.PI / 2;

  for (const point of slices) {
    const share = point.value / total;
    const sweep = share * Math.PI * 2;
    const start = angle;
    angle += sweep;

    const x1 = PIE_CX + PIE_R * Math.cos(start);
    const y1 = PIE_CY + PIE_R * Math.sin(start);
    const x2 = PIE_CX + PIE_R * Math.cos(angle);
    const y2 = PIE_CY + PIE_R * Math.sin(angle);

    arcs.push({
      point,
      share,
      d: `M ${PIE_CX} ${PIE_CY} L ${x1} ${y1} A ${PIE_R} ${PIE_R} 0 ${
        sweep > Math.PI ? 1 : 0
      } 1 ${x2} ${y2} Z`,
    });
  }

  return arcs;
}

function PieChart({
  points,
  unit,
  active,
  onActive,
}: {
  points: ChartPoint[];
  unit: string;
  active: number | null;
  onActive: (i: number | null) => void;
}) {
  // Slices only mean something as non-negative parts of a whole.
  const arcs = useMemo(() => {
    const slices = points.filter((p) => p.value > 0).slice(0, MAX_SLICES);
    const total = slices.reduce((sum, p) => sum + p.value, 0);
    return total ? buildArcs(slices, total) : [];
  }, [points]);

  if (arcs.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        These figures are a trend rather than parts of a whole — try the line or bar view.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-10">
      <svg viewBox="0 0 340 340" className="h-auto w-full max-w-[340px] shrink-0" role="img">
        {arcs.map(({ point, d }, i) => (
          <Anchor key={point.id} href={point.url}>
            <motion.path
              d={d}
              fill={ACCENT}
              fillOpacity={0.25 + (0.72 * (arcs.length - i)) / arcs.length}
              className="cursor-pointer stroke-white dark:stroke-zinc-900"
              strokeWidth="2"
              onMouseEnter={() => onActive(i)}
              onMouseLeave={() => onActive(null)}
              animate={{ scale: active === i ? 1.04 : 1 }}
              style={{ transformOrigin: `${PIE_CX}px ${PIE_CY}px` }}
              transition={{ duration: 0.2 }}
            />
          </Anchor>
        ))}
      </svg>

      <ul className="w-full space-y-1">
        {arcs.map(({ point, share }, i) => (
          <li key={point.id}>
            <LegendRow
              point={point}
              unit={unit}
              share={share}
              opacity={0.25 + (0.72 * (arcs.length - i)) / arcs.length}
              activeRow={active === i}
              onHover={() => onActive(i)}
              onLeave={() => onActive(null)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegendRow({
  point,
  unit,
  share,
  opacity = 1,
  activeRow = false,
  onHover,
  onLeave,
}: {
  point: ChartPoint;
  unit: string;
  /** rendered as a percentage when the points are parts of a whole */
  share?: number;
  opacity?: number;
  activeRow?: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const body = (
    <>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: ACCENT, opacity }}
      />
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
        {point.label}
      </span>
      <span className="shrink-0 text-sm tabular-nums text-zinc-900 dark:text-white">
        {formatValue(point.value, unit)}
      </span>
      {share !== undefined && (
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-zinc-400">
          {Math.round(share * 100)}%
        </span>
      )}
      {point.source && (
        <span className="hidden w-32 shrink-0 items-center gap-1 truncate text-[11px] text-zinc-400 sm:flex">
          {point.source}
          {point.url && (
            <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-100" />
          )}
        </span>
      )}
    </>
  );

  const className = `group flex items-center gap-3 rounded-xl px-3 py-2 transition ${
    activeRow ? "bg-zinc-50 dark:bg-white/[0.06]" : "hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
  }`;

  if (!point.url) {
    return (
      <div className={className} onMouseEnter={onHover} onMouseLeave={onLeave}>
        {body}
      </div>
    );
  }

  return (
    <a
      href={point.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={className}
    >
      {body}
    </a>
  );
}

/**
 * Every point again, as plain rows. The chart is the nice version; this is the
 * one you can scan, keyboard through, and click without hunting for a dot.
 */
function SourceList({
  points,
  unit,
  onHover,
}: {
  points: ChartPoint[];
  unit: string;
  onHover: (i: number | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <p className="px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-400">
        Every point, and where it came from
      </p>
      <ul className="grid gap-0.5 sm:grid-cols-2">
        {points.map((point, i) => (
          <li key={point.id}>
            <LegendRow
              point={point}
              unit={unit}
              onHover={() => onHover(i)}
              onLeave={() => onHover(null)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

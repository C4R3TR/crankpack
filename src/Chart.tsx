import { useId, useMemo, useRef, useState } from 'react';

import { Segmented } from './Segmented';
import { useAppStore } from './store';
import type { ChartWindow, HistoryPoint } from './types';

const WINDOWS: { value: ChartWindow; label: string; ms: number }[] = [
  { value: '1m', label: '1 min', ms: 60_000 },
  { value: '5m', label: '5 min', ms: 5 * 60_000 },
  { value: '15m', label: '15 min', ms: 15 * 60_000 },
];

type Point = { x: number; y: number };
type Smoothing = 'none' | 'light' | 'balanced' | 'heavy';

function movingAverage(values: number[], windowSize: number): number[] {
  if (values.length <= windowSize) return values;
  const result: number[] = [];
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < values.length; i += 1) {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length, i + half + 1);
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += values[j];
    result.push(sum / (end - start));
  }
  return result;
}

function exponentialSmooth(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i += 1) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

function applySmoothing(values: number[], smoothing: Smoothing): number[] {
  if (values.length < 2) return values;
  if (smoothing === 'light') return exponentialSmooth(values, 0.6);
  if (smoothing === 'balanced') return movingAverage(exponentialSmooth(values, 0.5), 3);
  if (smoothing === 'heavy') return movingAverage(exponentialSmooth(values, 0.35), 5);
  return values;
}

function smoothPath(points: Point[]) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Keep spikes visible while capping the path length so each update stays cheap. */
function downsample(values: number[], times: number[], max = 96) {
  if (values.length <= max) return { values, times };
  const outV: number[] = [];
  const outT: number[] = [];
  const bucket = (values.length - 1) / (max - 1);
  for (let i = 0; i < max; i += 1) {
    if (i === max - 1) {
      outV.push(values[values.length - 1]);
      outT.push(times[times.length - 1]);
      break;
    }
    const start = Math.floor(i * bucket);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucket));
    let best = start;
    const anchor = values[start];
    for (let j = start; j < end && j < values.length; j += 1) {
      if (Math.abs(values[j] - anchor) >= Math.abs(values[best] - anchor)) best = j;
    }
    outV.push(values[best]);
    outT.push(times[best]);
  }
  return { values: outV, times: outT };
}

function formatTick(n: number, decimals: number) {
  return n.toFixed(decimals);
}

function formatClock(t: number, spanMs: number) {
  return new Date(t).toLocaleTimeString([], spanMs <= 120_000
    ? { hour: 'numeric', minute: '2-digit', second: '2-digit' }
    : { hour: 'numeric', minute: '2-digit' });
}

export function sliceHistory(points: HistoryPoint[], window: ChartWindow) {
  const ms = WINDOWS.find((item) => item.value === window)?.ms ?? 5 * 60_000;
  const cutoff = Date.now() - ms;
  const sliced = points.filter((point) => point.t >= cutoff);
  return sliced.length >= 2 ? sliced : points.slice(-2);
}

export function useChartSlice() {
  const history = useAppStore((s) => s.history);
  const window = useAppStore((s) => s.settings.chartWindow);
  return useMemo(() => sliceHistory(history, window), [history, window]);
}

export function ChartRange() {
  const value = useAppStore((s) => s.settings.chartWindow);
  const patchSettings = useAppStore((s) => s.patchSettings);
  return (
    <Segmented
      label="Chart history"
      value={value}
      onChange={(chartWindow) => patchSettings({ chartWindow })}
      options={WINDOWS.map((item) => ({ value: item.value, label: item.label }))}
    />
  );
}

export function Chart({
  label,
  values,
  times,
  unit = '',
  decimals = 1,
  tone = 'accent',
  domain,
  height = 168,
  emptyText = 'Waiting for samples',
  compact = false,
  smoothing = 'none',
}: {
  label: string;
  values: number[];
  times?: number[];
  unit?: string;
  decimals?: number;
  tone?: 'accent' | 'live';
  domain?: { min: number; max: number };
  height?: number;
  emptyText?: string;
  compact?: boolean;
  smoothing?: Smoothing;
}) {
  const gradientId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const plotHeight = compact ? 64 : height;

  const domainMin = domain?.min;
  const domainMax = domain?.max;
  const geometry = useMemo(() => {
    if (values.length < 2) return null;
    const smoothed = applySmoothing(values, smoothing);
    const stamps = times && times.length === smoothed.length ? times : smoothed.map((_, i) => i);
    const sampled = downsample(smoothed, stamps);
    const dataMin = Math.min(...sampled.values);
    const dataMax = Math.max(...sampled.values);
    const min = domainMin ?? dataMin;
    const max = domainMax ?? dataMax;
    const span = max - min || 1;
    const top = 8;
    const bottom = 92;
    const points = sampled.values.map((v, i) => ({
      x: (i / (sampled.values.length - 1)) * 100,
      y: top + (1 - (v - min) / span) * (bottom - top),
    }));
    const line = smoothPath(points);
    const ticks = [max, min + span / 2, min];
    return { sampled, points, line, ticks, min, max, span };
  }, [values, times, domainMin, domainMax, smoothing]);

  if (!geometry) {
    return (
      <div className="chart-block">
        <div className="chart-head">
          <span className="chart-label">{label}</span>
        </div>
        <div className="empty">{emptyText}</div>
      </div>
    );
  }

  const index = scrub == null ? geometry.sampled.values.length - 1 : scrub;
  const shown = geometry.sampled.values[index];
  const shownTime = geometry.sampled.times[index];
  const here = geometry.points[index];
  const spanMs =
    typeof geometry.sampled.times[0] === 'number' && geometry.sampled.times[0] > 1_000_000_000
      ? geometry.sampled.times[geometry.sampled.times.length - 1] - geometry.sampled.times[0]
      : 0;

  const pick = (clientX: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setScrub(Math.round(x * (geometry.points.length - 1)));
  };

  const summary = `${label}, ${formatTick(shown, decimals)}${unit}${
    spanMs ? `, ${formatClock(shownTime, spanMs)}` : ''
  }. Drag across the chart to inspect earlier samples.`;

  return (
    <div className={`chart-block chart-${tone}`}>
      <div className="chart-head">
        <span className="chart-label">{scrub == null ? label : 'At ' + (spanMs ? formatClock(shownTime, spanMs) : label)}</span>
        <span className="chart-now">
          {formatTick(shown, decimals)}
          {unit ? <em>{unit}</em> : null}
        </span>
      </div>
      <div className="chart-frame" style={{ height: plotHeight }}>
        <div className="chart-ylabels" aria-hidden="true">
          {geometry.ticks.map((tick, i) => (
            <span key={i}>{formatTick(tick, decimals)}</span>
          ))}
        </div>
        <div
          ref={stageRef}
          className="chart-stage"
          role="slider"
          tabIndex={0}
          aria-label={summary}
          aria-valuemin={0}
          aria-valuemax={geometry.points.length - 1}
          aria-valuenow={index}
          aria-valuetext={`${formatTick(shown, decimals)}${unit}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pick(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event.clientX);
          }}
          onPointerUp={() => setScrub(null)}
          onPointerCancel={() => setScrub(null)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              setScrub(Math.max(0, index - 1));
            } else if (event.key === 'ArrowRight') {
              event.preventDefault();
              setScrub(Math.min(geometry.points.length - 1, index + 1));
            } else if (event.key === 'Home') {
              event.preventDefault();
              setScrub(0);
            } else if (event.key === 'End' || event.key === 'Escape') {
              event.preventDefault();
              setScrub(null);
            }
          }}
          onBlur={() => setScrub(null)}
        >
          <svg className="chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop className="chart-stop-top" offset="0" />
                <stop className="chart-stop-bottom" offset="1" />
              </linearGradient>
            </defs>
            {geometry.ticks.map((tick, i) => {
              const y = 8 + (1 - (tick - geometry.min) / geometry.span) * 84;
              return <line key={i} className="chart-grid" x1="0" y1={y} x2="100" y2={y} />;
            })}
            <path className="chart-fill" d={`${geometry.line} L 100 100 L 0 100 Z`} fill={`url(#${gradientId})`} />
            <path className="chart-line" d={geometry.line} vectorEffect="non-scaling-stroke" />
          </svg>
          {scrub != null ? <span className="chart-rule" style={{ left: `${here.x}%` }} /> : null}
          <span className="chart-dot-wrap" style={{ left: `${here.x}%`, top: `${here.y}%` }}>
            <span className="chart-dot" />
          </span>
        </div>
      </div>
      {spanMs ? (
        <div className="chart-axis" aria-hidden="true">
          <span>{formatClock(geometry.sampled.times[0], spanMs)}</span>
          <span>{formatClock(geometry.sampled.times[geometry.sampled.times.length - 1], spanMs)}</span>
        </div>
      ) : null}
    </div>
  );
}

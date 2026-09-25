import { useId } from 'react';

type Point = { x: number; y: number };

/**
 * Catmull-Rom through every sample, emitted as cubic beziers. Sensor traces are
 * noisy, so a smooth line reads as a trend where a polyline reads as jitter.
 */
function smoothPath(points: Point[]) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function Chart({
  label,
  values,
  unit = '',
  decimals = 1,
  tone = 'accent',
  compact = false,
  emptyText = 'Waiting for samples',
}: {
  label: string;
  values: number[];
  unit?: string;
  decimals?: number;
  tone?: 'accent' | 'live';
  compact?: boolean;
  emptyText?: string;
}) {
  const gradientId = useId();
  const width = 320;
  const height = compact ? 64 : 104;
  const pad = 6;

  if (values.length < 2) {
    return (
      <div className="chart-block">
        <div className="chart-head">
          <span className="chart-label">{label}</span>
        </div>
        <div className="empty">{emptyText}</div>
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const current = values[values.length - 1];

  // Sparklines scale to their own range, so a 0.08-degree wiggle would fill the
  // plot. Label the bounds at enough precision to tell them apart, otherwise
  // the scale reads as a dramatic swing.
  let boundDecimals = decimals;
  while (boundDecimals < 3 && min.toFixed(boundDecimals) === max.toFixed(boundDecimals)) {
    boundDecimals += 1;
  }
  const flat = min.toFixed(boundDecimals) === max.toFixed(boundDecimals);
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    // A flat series draws through the middle rather than amplifying float noise.
    y: flat ? height / 2 : height - pad - ((v - min) / span) * (height - pad * 2),
  }));
  const line = smoothPath(points);
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const here = points[points.length - 1];

  return (
    <div className={`chart-block chart-${tone}`}>
      <div className="chart-head">
        <span className="chart-label">{label}</span>
        <span className="chart-now">
          {current.toFixed(decimals)}
          {unit ? <em>{unit}</em> : null}
        </span>
      </div>
      {flat ? null : (
        <div className="chart-bound" aria-hidden="true">
          {max.toFixed(boundDecimals)}
          {unit}
        </div>
      )}
      <div className={`chart-plot ${compact ? 'chart-plot-compact' : ''}`}>
        <svg
          className={`chart ${compact ? 'chart-compact' : ''}`}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${label}: now ${current.toFixed(decimals)}${unit}, range ${min.toFixed(decimals)} to ${max.toFixed(decimals)}${unit}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop className="chart-stop-top" offset="0" />
              <stop className="chart-stop-bottom" offset="1" />
            </linearGradient>
          </defs>
          <path className="chart-fill" d={area} fill={`url(#${gradientId})`} />
          <path className="chart-line" d={line} pathLength={1} vectorEffect="non-scaling-stroke" />
        </svg>
        <span
          className="chart-dot-wrap"
          style={{ left: `${(here.x / width) * 100}%`, top: `${(here.y / height) * 100}%` }}
          aria-hidden="true"
        >
          <span className="chart-dot" />
        </span>
      </div>
      {flat ? (
        <div className="chart-bound" aria-hidden="true">
          Flat at {min.toFixed(decimals)}
          {unit}
        </div>
      ) : (
        <div className="chart-bound" aria-hidden="true">
          {min.toFixed(boundDecimals)}
          {unit}
        </div>
      )}
    </div>
  );
}

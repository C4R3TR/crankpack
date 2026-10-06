import { useId, useMemo } from 'react';

type Point = { x: number; y: number };

function movingAverage(values: number[], windowSize: number): number[] {
  if (values.length <= windowSize) return values;
  const result: number[] = [];
  const half = Math.floor(windowSize / 2);
  
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length, i + half + 1);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += values[j];
    }
    result.push(sum / (end - start));
  }
  return result;
}

function exponentialSmooth(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

function smoothPath(points: Point[]) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const tension = 0.35;
    const c1x = p1.x + (p2.x - p0.x) * tension;
    const c1y = p1.y + (p2.y - p0.y) * tension;
    const c2x = p2.x - (p3.x - p1.x) * tension;
    const c2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function niceScale(min: number, max: number, targetTicks: number = 4): { min: number; max: number; step: number } {
  const range = max - min;
  if (range === 0) {
    const padding = Math.abs(min) * 0.1 || 1;
    return { min: min - padding, max: max + padding, step: padding / 2 };
  }
  
  const roughStep = range / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  
  let niceStep: number;
  if (normalized <= 1) niceStep = magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;
  
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;
  
  return { min: niceMin, max: niceMax, step: niceStep };
}

export function Chart({
  label,
  values,
  unit = '',
  decimals = 1,
  tone = 'accent',
  compact = false,
  emptyText = 'Waiting for samples',
  smoothing = 'balanced',
}: {
  label: string;
  values: number[];
  unit?: string;
  decimals?: number;
  tone?: 'accent' | 'live';
  compact?: boolean;
  emptyText?: string;
  smoothing?: 'none' | 'light' | 'balanced' | 'heavy';
}) {
  const gradientId = useId();
  const width = 320;
  const height = compact ? 64 : 104;
  const padY = 8;
  const padX = 4;

  const processedValues = useMemo(() => {
    if (values.length < 2) return values;
    
    switch (smoothing) {
      case 'none':
        return values;
      case 'light':
        return exponentialSmooth(values, 0.6);
      case 'balanced':
        return movingAverage(exponentialSmooth(values, 0.5), 3);
      case 'heavy':
        return movingAverage(exponentialSmooth(values, 0.35), 5);
      default:
        return values;
    }
  }, [values, smoothing]);

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

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawCurrent = values[values.length - 1];
  
  const scale = niceScale(rawMin, rawMax);
  const { min, max } = scale;
  const span = max - min;

  let boundDecimals = decimals;
  while (boundDecimals < 4 && min.toFixed(boundDecimals) === max.toFixed(boundDecimals)) {
    boundDecimals += 1;
  }
  const flat = span < Math.pow(10, -boundDecimals);
  
  const effectiveWidth = width - padX * 2;
  const effectiveHeight = height - padY * 2;
  
  const points = processedValues.map((v, i) => ({
    x: padX + (i / (processedValues.length - 1)) * effectiveWidth,
    y: flat 
      ? height / 2 
      : padY + effectiveHeight - ((v - min) / span) * effectiveHeight,
  }));
  
  const line = smoothPath(points);
  const area = `${line} L ${padX + effectiveWidth} ${height} L ${padX} ${height} Z`;
  const here = points[points.length - 1];

  const gridLines = [];
  if (!flat && !compact) {
    const numLines = 3;
    for (let i = 1; i < numLines; i++) {
      const y = padY + (effectiveHeight * i) / numLines;
      gridLines.push(
        <line 
          key={i} 
          className="chart-grid" 
          x1={padX} 
          y1={y} 
          x2={width - padX} 
          y2={y} 
        />
      );
    }
  }

  return (
    <div className={`chart-block chart-${tone}`}>
      <div className="chart-head">
        <span className="chart-label">{label}</span>
        <span className="chart-now">
          {rawCurrent.toFixed(decimals)}
          {unit ? <em>{unit}</em> : null}
        </span>
      </div>
      {flat ? null : (
        <div className="chart-bound chart-bound-top" aria-hidden="true">
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
          aria-label={`${label}: now ${rawCurrent.toFixed(decimals)}${unit}, range ${rawMin.toFixed(decimals)} to ${rawMax.toFixed(decimals)}${unit}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop className="chart-stop-top" offset="0%" />
              <stop className="chart-stop-mid" offset="50%" />
              <stop className="chart-stop-bottom" offset="100%" />
            </linearGradient>
          </defs>
          {gridLines}
          <path className="chart-fill" d={area} fill={`url(#${gradientId})`} />
          <path className="chart-line" d={line} pathLength={1} vectorEffect="non-scaling-stroke" />
        </svg>
        <span
          className="chart-dot-wrap"
          style={{ 
            left: `${(here.x / width) * 100}%`, 
            top: `${(here.y / height) * 100}%` 
          }}
          aria-hidden="true"
        >
          <span className="chart-dot" />
        </span>
      </div>
      {flat ? (
        <div className="chart-bound" aria-hidden="true">
          Stable at {rawMin.toFixed(decimals)}
          {unit}
        </div>
      ) : (
        <div className="chart-bound chart-bound-bottom" aria-hidden="true">
          {min.toFixed(boundDecimals)}
          {unit}
        </div>
      )}
    </div>
  );
}

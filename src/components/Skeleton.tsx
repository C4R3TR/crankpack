export function Skeleton({ width, height, circle }: { width?: string; height?: string; circle?: boolean }) {
  return (
    <span
      className={`skeleton ${circle ? 'skeleton-circle' : ''}`}
      style={{ width: width ?? '100%', height: height ?? '1em' }}
      aria-hidden="true"
    />
  );
}

export function SkeletonChart({ compact }: { compact?: boolean }) {
  return (
    <div className="chart-block skeleton-chart">
      <div className="chart-head">
        <Skeleton width="80px" height="1rem" />
        <Skeleton width="50px" height="1.25rem" />
      </div>
      <div className={`chart-plot ${compact ? 'chart-plot-compact' : ''}`}>
        <div className="skeleton-wave" />
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="stats">
      <div className="stat">
        <Skeleton width="60px" height="1rem" />
        <Skeleton width="40px" height="0.75rem" />
      </div>
      <div className="stat">
        <Skeleton width="50px" height="1rem" />
        <Skeleton width="35px" height="0.75rem" />
      </div>
      <div className="stat">
        <Skeleton width="55px" height="1rem" />
        <Skeleton width="30px" height="0.75rem" />
      </div>
    </div>
  );
}

export function SkeletonDial() {
  return (
    <div className="power-hero">
      <div className="skeleton-dial">
        <Skeleton circle width="176px" height="176px" />
      </div>
    </div>
  );
}

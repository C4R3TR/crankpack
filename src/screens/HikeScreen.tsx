import { useEffect, useState } from 'react';

import { Header } from './PowerScreen';
import { useAppStore, useDisplayedTelemetry } from '../store';
import { startHikeTracking, stopHikeTracking } from '../hike/tracker';
import { TrailMap } from '../hike/TrailMap';
import { getCurrentFix, watchFix, type Fix } from '../hike/location';
import { formatDuration, formatKm } from '../units';
import { Chart } from '../Chart';

/** Tracks the device position so the map is centred before a hike begins. */
function useHomeFix() {
  const [fix, setFix] = useState<Fix | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | null = null;
    getCurrentFix().then((first) => {
      if (!cancelled && first) setFix(first);
    });
    watchFix((next) => {
      if (!cancelled) setFix(next);
    }).then((cleanup) => {
      if (cancelled) cleanup?.();
      else stop = cleanup;
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return fix;
}

export function HikeScreen() {
  const hike = useAppStore((s) => s.hike);
  const startHike = useAppStore((s) => s.startHike);
  const stopHike = useAppStore((s) => s.stopHike);
  const t = useDisplayedTelemetry();
  const home = useHomeFix();
  const consumed = hike.active || hike.startedAt ? hike.startPct - t.batteryPct : 0;
  const elevation = Math.round(hike.active ? hike.elevationM : t.altitudeM);

  return (
    <section className="screen screen-hike">
      <div className="hike-stage">
        <TrailMap points={hike.points} follow={hike.active} home={home} />
        <div className="hike-top">
          <Header title="Hike" />
        </div>
      </div>

      <div className="hike-sheet group">
        <div className="group-pad">
          <div className="grabber" aria-hidden="true" />
          <div className="hero">
            <div className="hero-value">{formatKm(hike.distanceM)}</div>
            <div className="hero-meta">{hike.active ? 'Live trail' : 'Distance'}</div>
          </div>
          <div className="stats">
            <div className={`stat ${hike.active ? 'live' : ''}`}>
              <strong>{formatDuration(hike.elapsedMs)}</strong>
              <span>Duration</span>
            </div>
            <div className="stat">
              <strong>{elevation} m</strong>
              <span>Elevation</span>
            </div>
            <div className="stat">
              <strong>+{Math.round(hike.elevationGainM)} m</strong>
              <span>Gain</span>
            </div>
          </div>
          <button
            type="button"
            className={`btn btn-block ${hike.active ? 'danger' : ''}`}
            onClick={() => {
              if (hike.active) {
                stopHike();
                stopHikeTracking();
              } else {
                startHike();
                startHikeTracking();
              }
            }}
          >
            {hike.active ? 'Stop Hike' : 'Start Hike'}
          </button>
        </div>
        <div className="cell">
          <span className="cell-label">Average speed</span>
          <span className="cell-value">{hike.avgSpeedKmh.toFixed(1)} km/h</span>
        </div>
        <div className="cell">
          <span className="cell-label">Battery used</span>
          <span className="cell-value">{Math.max(0, consumed).toFixed(1)}%</span>
        </div>
        <div className="cell">
          <span className="cell-label">Energy used</span>
          <span className="cell-value strong">{hike.usedWh.toFixed(1)} Wh</span>
        </div>
        <div className="cell">
          <span className="cell-label">Generated</span>
          <span className="cell-value strong">{hike.generatedWh.toFixed(1)} Wh</span>
        </div>
        <div className="group-pad">
          <Chart
            label="Elevation"
            values={hike.points.map((p) => p.alt)}
            unit=" m"
            decimals={0}
            compact
            emptyText="Start a hike to draw the route"
          />
        </div>
      </div>
    </section>
  );
}

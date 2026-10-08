import { useEffect, useState } from 'react';

import { Header } from './PowerScreen';
import { useAppStore, useDisplayedTelemetry } from '../store';
import { startHikeTracking, stopHikeTracking } from '../hike/tracker';
import { TrailMap } from '../hike/TrailMap';
import { getCurrentFix, watchFix, type Fix } from '../hike/location';
import { formatDuration, formatKm } from '../units';
import { ActivityFeed } from '../components/ActivityFeed';
import { ActivityDetail } from '../components/ActivityDetail';
import { WeeklyStats, PersonalRecords } from '../components/WeeklyStats';
import { Achievements, NewAchievementToast } from '../components/Achievements';

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
  const saveActivity = useAppStore((s) => s.saveActivity);
  const selectedActivityId = useAppStore((s) => s.selectedActivityId);
  const t = useDisplayedTelemetry();
  const home = useHomeFix();
  const consumed = hike.active || hike.startedAt ? hike.startPct - t.batteryPct : 0;

  const handleStopHike = () => {
    stopHike();
    stopHikeTracking();
    saveActivity();
  };

  const handleStartHike = () => {
    startHike();
    startHikeTracking();
  };

  const paceMinPerKm = hike.avgSpeedKmh > 0 ? 60 / hike.avgSpeedKmh : 0;
  const paceMin = Math.floor(paceMinPerKm);
  const paceSec = Math.round((paceMinPerKm - paceMin) * 60);

  if (hike.active) {
    return (
      <section className="screen screen-hike">
        <div className="hike-stage hike-stage-active">
          <TrailMap points={hike.points} follow={true} home={home} />
          <div className="hike-top">
            <div className="live-badge">
              <span className="live-dot" />
              LIVE
            </div>
          </div>
        </div>

        <div className="hike-sheet hike-sheet-active group">
          <div className="group-pad">
            <div className="grabber" aria-hidden="true" />
            
            <div className="live-hero">
              <div className="live-hero-main">
                <span className="live-hero-value">{formatKm(hike.distanceM)}</span>
                <span className="live-hero-label">Distance</span>
              </div>
              <div className="live-hero-secondary">
                <div className="live-hero-stat">
                  <span className="live-stat-value">{formatDuration(hike.elapsedMs)}</span>
                  <span className="live-stat-label">Time</span>
                </div>
                <div className="live-hero-stat">
                  <span className="live-stat-value">{paceMin}:{paceSec.toString().padStart(2, '0')}</span>
                  <span className="live-stat-label">Pace /km</span>
                </div>
              </div>
            </div>

            <div className="live-stats">
              <div className="live-stat-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20V4M8 8l4-4 4 4" />
                </svg>
                <div>
                  <span className="live-card-value">+{Math.round(hike.elevationGainM)}m</span>
                  <span className="live-card-label">Elevation</span>
                </div>
              </div>
              <div className="live-stat-card highlight">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <div>
                  <span className="live-card-value">{hike.generatedWh.toFixed(1)}Wh</span>
                  <span className="live-card-label">Generated</span>
                </div>
              </div>
              <div className="live-stat-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="7" width="16" height="10" rx="2" />
                  <path d="M19 10h2v4h-2" />
                </svg>
                <div>
                  <span className="live-card-value">{Math.max(0, consumed).toFixed(0)}%</span>
                  <span className="live-card-label">Used</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-block danger stop-btn"
              onClick={handleStopHike}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Stop Hike
            </button>
          </div>
        </div>
        
        <NewAchievementToast />
      </section>
    );
  }

  return (
    <section className="screen screen-hike screen-hike-feed">
      <div className="hike-header">
        <Header title="Activity" />
        <button
          type="button"
          className="start-hike-btn"
          onClick={handleStartHike}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        </button>
      </div>

      <WeeklyStats />
      <PersonalRecords />
      
      <div className="feed-section">
        <h3 className="feed-title">Recent Activities</h3>
        <ActivityFeed />
      </div>

      <Achievements />

      {selectedActivityId && <ActivityDetail />}
      <NewAchievementToast />
    </section>
  );
}

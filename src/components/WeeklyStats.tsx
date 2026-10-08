import { useWeeklyStats, useAppStore } from '../store';
import { formatDuration, formatKm } from '../units';

export function WeeklyStats() {
  const stats = useWeeklyStats();
  const weekProgress = Math.min(100, (stats.activityCount / 5) * 100);

  return (
    <div className="weekly-stats">
      <div className="weekly-header">
        <h3 className="weekly-title">This Week</h3>
        <span className="weekly-count">{stats.activityCount} {stats.activityCount === 1 ? 'activity' : 'activities'}</span>
      </div>
      
      <div className="weekly-progress">
        <div className="weekly-progress-bar">
          <div className="weekly-progress-fill" style={{ width: `${weekProgress}%` }} />
        </div>
        <span className="weekly-progress-label">{stats.activityCount}/5 weekly goal</span>
      </div>

      <div className="weekly-grid">
        <div className="weekly-stat">
          <div className="weekly-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 20c4-8 5-8 8-8s4 0 8 8" />
            </svg>
          </div>
          <div className="weekly-stat-content">
            <span className="weekly-stat-value">{formatKm(stats.totalDistanceM)}</span>
            <span className="weekly-stat-label">Total Distance</span>
          </div>
        </div>
        
        <div className="weekly-stat">
          <div className="weekly-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20V4M8 8l4-4 4 4" />
            </svg>
          </div>
          <div className="weekly-stat-content">
            <span className="weekly-stat-value">+{Math.round(stats.totalElevationGainM)}m</span>
            <span className="weekly-stat-label">Elevation Gain</span>
          </div>
        </div>
        
        <div className="weekly-stat">
          <div className="weekly-stat-icon energy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="weekly-stat-content">
            <span className="weekly-stat-value">{stats.totalGeneratedWh.toFixed(1)}Wh</span>
            <span className="weekly-stat-label">Energy Generated</span>
          </div>
        </div>
        
        <div className="weekly-stat">
          <div className="weekly-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="weekly-stat-content">
            <span className="weekly-stat-value">{formatDuration(stats.totalDurationMs)}</span>
            <span className="weekly-stat-label">Total Time</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PersonalRecords() {
  const records = useAppStore((s) => s.records);
  const activities = useAppStore((s) => s.activities);
  const selectActivity = useAppStore((s) => s.selectActivity);

  if (activities.length === 0) {
    return null;
  }

  const hasRecords = records.longestDistanceM > 0 || records.mostElevationGainM > 0 || records.mostEnergyGeneratedWh > 0;

  if (!hasRecords) {
    return null;
  }

  const paceMin = Math.floor(records.fastestPaceMinPerKm);
  const paceSec = Math.round((records.fastestPaceMinPerKm - paceMin) * 60);

  return (
    <div className="personal-records">
      <h3 className="records-title">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M12 2L9 9H2l5.5 4.5L5 22l7-5 7 5-2.5-8.5L22 9h-7L12 2z" />
        </svg>
        Personal Records
      </h3>
      
      <div className="records-grid">
        {records.longestDistanceM > 0 && (
          <button 
            type="button"
            className="record-card"
            onClick={() => records.longestDistanceActivityId && selectActivity(records.longestDistanceActivityId)}
          >
            <span className="record-label">Longest Distance</span>
            <span className="record-value">{formatKm(records.longestDistanceM)}</span>
          </button>
        )}
        
        {records.mostElevationGainM > 0 && (
          <button
            type="button"
            className="record-card"
            onClick={() => records.mostElevationActivityId && selectActivity(records.mostElevationActivityId)}
          >
            <span className="record-label">Most Elevation</span>
            <span className="record-value">+{Math.round(records.mostElevationGainM)}m</span>
          </button>
        )}
        
        {records.mostEnergyGeneratedWh > 0 && (
          <button
            type="button"
            className="record-card highlight"
            onClick={() => records.mostEnergyActivityId && selectActivity(records.mostEnergyActivityId)}
          >
            <span className="record-label">Most Energy</span>
            <span className="record-value">{records.mostEnergyGeneratedWh.toFixed(1)}Wh</span>
          </button>
        )}
        
        {records.fastestPaceMinPerKm < Infinity && (
          <button
            type="button"
            className="record-card"
            onClick={() => records.fastestPaceActivityId && selectActivity(records.fastestPaceActivityId)}
          >
            <span className="record-label">Fastest Pace</span>
            <span className="record-value">{paceMin}:{paceSec.toString().padStart(2, '0')}/km</span>
          </button>
        )}
        
        {records.longestDurationMs > 0 && (
          <button
            type="button"
            className="record-card"
            onClick={() => records.longestDurationActivityId && selectActivity(records.longestDurationActivityId)}
          >
            <span className="record-label">Longest Duration</span>
            <span className="record-value">{formatDuration(records.longestDurationMs)}</span>
          </button>
        )}
      </div>
    </div>
  );
}

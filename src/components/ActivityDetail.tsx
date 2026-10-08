import { useState } from 'react';
import { useAppStore, useSelectedActivity } from '../store';
import { formatDuration, formatKm } from '../units';
import { Chart } from '../Chart';

export function ActivityDetail() {
  const activity = useSelectedActivity();
  const selectActivity = useAppStore((s) => s.selectActivity);
  const deleteActivity = useAppStore((s) => s.deleteActivity);
  const renameActivity = useAppStore((s) => s.renameActivity);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  if (!activity) return null;

  const handleClose = () => selectActivity(null);
  
  const handleStartEdit = () => {
    setName(activity.name);
    setEditing(true);
  };
  
  const handleSaveName = () => {
    if (name.trim()) {
      renameActivity(activity.id, name.trim());
    }
    setEditing(false);
  };
  
  const handleDelete = () => {
    deleteActivity(activity.id);
    setShowDelete(false);
  };

  const startTime = new Date(activity.startedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  const dateStr = new Date(activity.startedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const paceMinPerKm = activity.avgSpeedKmh > 0 ? 60 / activity.avgSpeedKmh : 0;
  const paceMin = Math.floor(paceMinPerKm);
  const paceSec = Math.round((paceMinPerKm - paceMin) * 60);

  return (
    <div className="activity-detail-overlay" onClick={handleClose}>
      <div className="activity-detail" onClick={(e) => e.stopPropagation()}>
        <div className="activity-detail-header">
          <button type="button" className="activity-detail-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <button type="button" className="activity-detail-more" onClick={() => setShowDelete(!showDelete)}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {showDelete && (
            <div className="activity-menu">
              <button type="button" onClick={handleStartEdit}>Rename</button>
              <button type="button" className="danger" onClick={handleDelete}>Delete Activity</button>
            </div>
          )}
        </div>

        <div className="activity-detail-content">
          {editing ? (
            <div className="activity-edit-name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
              />
              <button type="button" className="btn" onClick={handleSaveName}>Save</button>
            </div>
          ) : (
            <h2 className="activity-detail-title" onClick={handleStartEdit}>{activity.name}</h2>
          )}
          <p className="activity-detail-date">{dateStr} at {startTime}</p>

          <div className="activity-hero-stats">
            <div className="activity-hero-stat">
              <span className="activity-hero-value">{formatKm(activity.distanceM)}</span>
              <span className="activity-hero-label">Distance</span>
            </div>
            <div className="activity-hero-stat">
              <span className="activity-hero-value">{formatDuration(activity.elapsedMs)}</span>
              <span className="activity-hero-label">Moving Time</span>
            </div>
            <div className="activity-hero-stat highlight">
              <span className="activity-hero-value">{activity.generatedWh.toFixed(1)}<em>Wh</em></span>
              <span className="activity-hero-label">Generated</span>
            </div>
          </div>

          <div className="activity-stats-grid">
            <div className="activity-grid-stat">
              <span className="activity-grid-value">{paceMin}:{paceSec.toString().padStart(2, '0')}</span>
              <span className="activity-grid-label">Avg Pace /km</span>
            </div>
            <div className="activity-grid-stat">
              <span className="activity-grid-value">{activity.avgSpeedKmh.toFixed(1)}</span>
              <span className="activity-grid-label">Avg Speed km/h</span>
            </div>
            <div className="activity-grid-stat">
              <span className="activity-grid-value">{activity.maxSpeedKmh.toFixed(1)}</span>
              <span className="activity-grid-label">Max Speed km/h</span>
            </div>
            <div className="activity-grid-stat">
              <span className="activity-grid-value">+{Math.round(activity.elevationGainM)}</span>
              <span className="activity-grid-label">Elevation Gain m</span>
            </div>
            <div className="activity-grid-stat">
              <span className="activity-grid-value">{activity.usedWh.toFixed(1)}</span>
              <span className="activity-grid-label">Energy Used Wh</span>
            </div>
            <div className="activity-grid-stat">
              <span className="activity-grid-value">{activity.startPct.toFixed(0)}→{activity.endPct.toFixed(0)}%</span>
              <span className="activity-grid-label">Battery</span>
            </div>
          </div>

          {activity.elevationProfile.length > 2 && (
            <div className="activity-section">
              <h3 className="activity-section-title">Elevation Profile</h3>
              <div className="activity-elevation-chart">
                <Chart
                  label=""
                  values={activity.elevationProfile}
                  unit=" m"
                  decimals={0}
                  compact
                  smoothing="heavy"
                />
              </div>
            </div>
          )}

          {activity.splits.length > 0 && (
            <div className="activity-section">
              <h3 className="activity-section-title">Splits</h3>
              <div className="activity-splits">
                <div className="activity-splits-header">
                  <span>KM</span>
                  <span>Pace</span>
                  <span>Elev</span>
                  <span>Energy</span>
                </div>
                {activity.splits.map((split) => {
                  const splitPaceMin = Math.floor(split.paceMinPerKm);
                  const splitPaceSec = Math.round((split.paceMinPerKm - splitPaceMin) * 60);
                  return (
                    <div key={split.km} className="activity-split-row">
                      <span className="split-km">{split.km}</span>
                      <span className="split-pace">{splitPaceMin}:{splitPaceSec.toString().padStart(2, '0')}</span>
                      <span className="split-elev">+{Math.round(split.elevationGainM)}m</span>
                      <span className="split-energy">{split.generatedWh.toFixed(1)}Wh</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

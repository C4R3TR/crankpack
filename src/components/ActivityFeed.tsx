import { useAppStore } from '../store';
import { formatDuration, formatKm } from '../units';
import type { Activity } from '../types';

export function ActivityFeed() {
  const activities = useAppStore((s) => s.activities);
  const selectActivity = useAppStore((s) => s.selectActivity);

  if (activities.length === 0) {
    return (
      <div className="activity-empty">
        <div className="activity-empty-icon">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 40c8-16 10-16 16-16s8 0 16 16" />
            <path d="M16 18l4 4 6-8 6 6" />
          </svg>
        </div>
        <p className="activity-empty-title">No activities yet</p>
        <p className="activity-empty-desc">Complete a hike to see it here</p>
      </div>
    );
  }

  const groupedActivities = groupByDate(activities);

  return (
    <div className="activity-feed">
      {Object.entries(groupedActivities).map(([dateKey, dayActivities]) => (
        <div key={dateKey} className="activity-day">
          <div className="activity-day-header">{dateKey}</div>
          {dayActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onClick={() => selectActivity(activity.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ActivityCard({ activity, onClick }: { activity: Activity; onClick: () => void }) {
  const duration = formatDuration(activity.elapsedMs);
  const distance = formatKm(activity.distanceM);
  const startTime = new Date(activity.startedAt).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <button type="button" className="activity-card" onClick={onClick}>
      <div className="activity-card-header">
        <div className="activity-card-title">{activity.name}</div>
        <div className="activity-card-time">{startTime}</div>
      </div>
      
      <div className="activity-card-stats">
        <div className="activity-stat">
          <span className="activity-stat-value">{distance}</span>
          <span className="activity-stat-label">Distance</span>
        </div>
        <div className="activity-stat">
          <span className="activity-stat-value">{duration}</span>
          <span className="activity-stat-label">Time</span>
        </div>
        <div className="activity-stat">
          <span className="activity-stat-value">+{Math.round(activity.elevationGainM)}m</span>
          <span className="activity-stat-label">Elevation</span>
        </div>
        <div className="activity-stat highlight">
          <span className="activity-stat-value">{activity.generatedWh.toFixed(1)}Wh</span>
          <span className="activity-stat-label">Generated</span>
        </div>
      </div>

      {activity.points.length > 2 && (
        <div className="activity-card-map">
          <MiniMap points={activity.points} />
        </div>
      )}
    </button>
  );
}

function MiniMap({ points }: { points: { lat: number; lng: number }[] }) {
  if (points.length < 2) return null;
  
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  const padding = 0.1;
  const latRange = (maxLat - minLat) || 0.001;
  const lngRange = (maxLng - minLng) || 0.001;
  
  const pathData = points.map((p, i) => {
    const x = ((p.lng - minLng) / lngRange) * (1 - 2 * padding) + padding;
    const y = 1 - (((p.lat - minLat) / latRange) * (1 - 2 * padding) + padding);
    return `${i === 0 ? 'M' : 'L'} ${(x * 100).toFixed(1)} ${(y * 100).toFixed(1)}`;
  }).join(' ');

  return (
    <svg className="mini-map" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">
      <path d={pathData} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pathData.split(' ')[1]} cy={pathData.split(' ')[2]} r="3" fill="var(--live)" />
    </svg>
  );
}

function groupByDate(activities: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  for (const activity of activities) {
    const dateStr = new Date(activity.startedAt).toDateString();
    let label: string;
    
    if (dateStr === today) {
      label = 'Today';
    } else if (dateStr === yesterday) {
      label = 'Yesterday';
    } else {
      label = new Date(activity.startedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
    
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(activity);
  }
  
  return groups;
}

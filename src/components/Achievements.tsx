import { useAppStore } from '../store';
import type { AchievementType } from '../types';

const ACHIEVEMENT_INFO: Record<AchievementType, { name: string; description: string; icon: string }> = {
  first_hike: { name: 'First Steps', description: 'Complete your first hike', icon: '👟' },
  distance_5k: { name: '5K Club', description: 'Complete a 5km hike', icon: '🏃' },
  distance_10k: { name: '10K Warrior', description: 'Complete a 10km hike', icon: '🏅' },
  distance_marathon: { name: 'Marathon Legend', description: 'Complete a marathon distance hike', icon: '🏆' },
  elevation_500m: { name: 'Hill Climber', description: 'Gain 500m elevation in one hike', icon: '⛰️' },
  elevation_1000m: { name: 'Mountain Goat', description: 'Gain 1000m elevation in one hike', icon: '🏔️' },
  energy_10wh: { name: 'Power Up', description: 'Generate 10Wh in one hike', icon: '⚡' },
  energy_50wh: { name: 'Energy Master', description: 'Generate 50Wh in one hike', icon: '🔋' },
  energy_100wh: { name: 'Power Plant', description: 'Generate 100Wh in one hike', icon: '💪' },
  streak_3_days: { name: 'Hat Trick', description: 'Hike 3 days in a row', icon: '🔥' },
  streak_7_days: { name: 'Week Warrior', description: 'Hike 7 days in a row', icon: '🌟' },
  early_bird: { name: 'Early Bird', description: 'Start a hike before 7am', icon: '🌅' },
  night_owl: { name: 'Night Owl', description: 'Start a hike after 9pm', icon: '🌙' },
};

const ALL_ACHIEVEMENTS: AchievementType[] = [
  'first_hike',
  'distance_5k',
  'distance_10k',
  'distance_marathon',
  'elevation_500m',
  'elevation_1000m',
  'energy_10wh',
  'energy_50wh',
  'energy_100wh',
  'streak_3_days',
  'streak_7_days',
  'early_bird',
  'night_owl',
];

export function Achievements() {
  const achievements = useAppStore((s) => s.achievements);
  const unlockedTypes = new Set(achievements.map((a) => a.type));

  return (
    <div className="achievements">
      <h3 className="achievements-title">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M5 3h14a2 2 0 012 2v2a5 5 0 01-5 5h-1v4h2a2 2 0 012 2v1H5v-1a2 2 0 012-2h2v-4H8a5 5 0 01-5-5V5a2 2 0 012-2z" />
        </svg>
        Achievements
        <span className="achievements-count">{achievements.length}/{ALL_ACHIEVEMENTS.length}</span>
      </h3>

      <div className="achievements-grid">
        {ALL_ACHIEVEMENTS.map((type) => {
          const info = ACHIEVEMENT_INFO[type];
          const unlocked = unlockedTypes.has(type);
          const achievement = achievements.find((a) => a.type === type);

          return (
            <div
              key={type}
              className={`achievement-badge ${unlocked ? 'unlocked' : 'locked'}`}
              title={unlocked ? `Unlocked ${new Date(achievement!.unlockedAt).toLocaleDateString()}` : info.description}
            >
              <span className="achievement-icon">{info.icon}</span>
              <span className="achievement-name">{info.name}</span>
              {!unlocked && <span className="achievement-lock">🔒</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NewAchievementToast() {
  const newAchievements = useAppStore((s) => s.newAchievements);
  const dismiss = useAppStore((s) => s.dismissNewAchievements);

  if (newAchievements.length === 0) return null;

  return (
    <div className="achievement-toast-container">
      {newAchievements.map((achievement) => {
        const info = ACHIEVEMENT_INFO[achievement.type];
        return (
          <div key={achievement.type} className="achievement-toast">
            <div className="achievement-toast-icon">{info.icon}</div>
            <div className="achievement-toast-content">
              <span className="achievement-toast-label">Achievement Unlocked!</span>
              <span className="achievement-toast-name">{info.name}</span>
              <span className="achievement-toast-desc">{info.description}</span>
            </div>
            <button type="button" className="achievement-toast-close" onClick={dismiss}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

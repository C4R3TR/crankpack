import { create } from 'zustand';
import { useMemo } from 'react';

import type {
  Achievement,
  AchievementType,
  Activity,
  ActivitySplit,
  BleCommand,
  ConnectionStatus,
  Diagnostics,
  HikeState,
  HistoryPoint,
  PersonalRecords,
  ScannedDevice,
  Settings,
  Telemetry,
  WeeklyStats,
} from './types';
import { applyOffsets, packWh } from './units';
import { createSeedHistory } from './sim/simulator';

const SETTINGS_KEY = 'crankpack.settings.v1';
const ACTIVITIES_KEY = 'crankpack.activities.v1';
const RECORDS_KEY = 'crankpack.records.v1';
const ACHIEVEMENTS_KEY = 'crankpack.achievements.v1';
const HISTORY_LIMIT = 15 * 60;
const HISTORY_EVERY_MS = 1000;
const SEED_HISTORY_COUNT = 30;
const MAX_ACTIVITIES = 50;

export const defaultSettings: Settings = {
  tempUnit: 'C',
  pressureUnit: 'hPa',
  tempOffsetC: 0,
  humidityOffset: 0,
  seaLevelHpa: 1013.25,
  capacityMah: 4000,
  emptyVoltage: 3.0,
  fullVoltage: 4.2,
  useVoltageCurve: false,
  deviceAlias: '',
  chartWindow: '5m',
};

export const idleTelemetry: Telemetry = {
  batteryPct: 0,
  batteryV: 0,
  charging: false,
  crankA: 0,
  crankW: 0,
  usbW: 0,
  usbA: 0,
  remainingMah: 0,
  capacityMah: 4000,
  temperatureC: 0,
  pressureHpa: 0,
  humidityPct: 0,
  altitudeM: 0,
  batteryHealth: 0,
  firmware: '—',
  deviceName: 'CrankPack',
  rssi: null,
  timestamp: 0,
};

const idleHike: HikeState = {
  active: false,
  startedAt: null,
  elapsedMs: 0,
  distanceM: 0,
  elevationM: 0,
  elevationGainM: 0,
  avgSpeedKmh: 0,
  points: [],
  startWh: 0,
  generatedWh: 0,
  usedWh: 0,
  startPct: 0,
};

const defaultRecords: PersonalRecords = {
  longestDistanceM: 0,
  longestDistanceActivityId: null,
  mostElevationGainM: 0,
  mostElevationActivityId: null,
  mostEnergyGeneratedWh: 0,
  mostEnergyActivityId: null,
  fastestPaceMinPerKm: Infinity,
  fastestPaceActivityId: null,
  longestDurationMs: 0,
  longestDurationActivityId: null,
};

function generateActivityId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getWeekStart(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

function calculateSplits(points: { lat: number; lng: number; alt: number; t: number }[], generatedWh: number): ActivitySplit[] {
  if (points.length < 2) return [];
  
  const splits: ActivitySplit[] = [];
  let currentKm = 1;
  let kmStartTime = points[0].t;
  let kmElevationGain = 0;
  let totalDistanceM = 0;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const segmentM = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    totalDistanceM += segmentM;
    
    if (curr.alt > prev.alt) {
      kmElevationGain += curr.alt - prev.alt;
    }
    
    while (totalDistanceM >= currentKm * 1000) {
      const elapsedMs = curr.t - kmStartTime;
      const paceMinPerKm = elapsedMs / 60000;
      
      splits.push({
        km: currentKm,
        elapsedMs,
        paceMinPerKm,
        elevationGainM: kmElevationGain,
        generatedWh: generatedWh / (totalDistanceM / 1000) * currentKm - (splits.reduce((sum, s) => sum + s.generatedWh, 0)),
      });
      
      kmStartTime = curr.t;
      kmElevationGain = 0;
      currentKm++;
    }
  }
  
  return splits;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkAchievements(
  activity: Activity,
  activities: Activity[],
  existing: Achievement[]
): Achievement[] {
  const newAchievements: Achievement[] = [];
  const has = (type: AchievementType) => existing.some(a => a.type === type);
  
  if (!has('first_hike')) {
    newAchievements.push({ type: 'first_hike', unlockedAt: Date.now(), activityId: activity.id });
  }
  
  if (!has('distance_5k') && activity.distanceM >= 5000) {
    newAchievements.push({ type: 'distance_5k', unlockedAt: Date.now(), activityId: activity.id });
  }
  if (!has('distance_10k') && activity.distanceM >= 10000) {
    newAchievements.push({ type: 'distance_10k', unlockedAt: Date.now(), activityId: activity.id });
  }
  if (!has('distance_marathon') && activity.distanceM >= 42195) {
    newAchievements.push({ type: 'distance_marathon', unlockedAt: Date.now(), activityId: activity.id });
  }
  
  if (!has('elevation_500m') && activity.elevationGainM >= 500) {
    newAchievements.push({ type: 'elevation_500m', unlockedAt: Date.now(), activityId: activity.id });
  }
  if (!has('elevation_1000m') && activity.elevationGainM >= 1000) {
    newAchievements.push({ type: 'elevation_1000m', unlockedAt: Date.now(), activityId: activity.id });
  }
  
  if (!has('energy_10wh') && activity.generatedWh >= 10) {
    newAchievements.push({ type: 'energy_10wh', unlockedAt: Date.now(), activityId: activity.id });
  }
  if (!has('energy_50wh') && activity.generatedWh >= 50) {
    newAchievements.push({ type: 'energy_50wh', unlockedAt: Date.now(), activityId: activity.id });
  }
  if (!has('energy_100wh') && activity.generatedWh >= 100) {
    newAchievements.push({ type: 'energy_100wh', unlockedAt: Date.now(), activityId: activity.id });
  }
  
  const startHour = new Date(activity.startedAt).getHours();
  if (!has('early_bird') && startHour >= 5 && startHour < 7) {
    newAchievements.push({ type: 'early_bird', unlockedAt: Date.now(), activityId: activity.id });
  }
  if (!has('night_owl') && (startHour >= 21 || startHour < 5)) {
    newAchievements.push({ type: 'night_owl', unlockedAt: Date.now(), activityId: activity.id });
  }
  
  if (!has('streak_3_days') || !has('streak_7_days')) {
    const allActivities = [...activities, activity];
    const days = new Set(allActivities.map(a => new Date(a.startedAt).toDateString()));
    const sortedDays = Array.from(days).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    let streak = 1;
    let maxStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]).getTime();
      const curr = new Date(sortedDays[i]).getTime();
      if (curr - prev === 86400000) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 1;
      }
    }
    
    if (!has('streak_3_days') && maxStreak >= 3) {
      newAchievements.push({ type: 'streak_3_days', unlockedAt: Date.now(), activityId: activity.id });
    }
    if (!has('streak_7_days') && maxStreak >= 7) {
      newAchievements.push({ type: 'streak_7_days', unlockedAt: Date.now(), activityId: activity.id });
    }
  }
  
  return newAchievements;
}

type AppState = {
  connection: ConnectionStatus;
  bleAvailable: boolean;
  bleReason: string | null;
  error: string | null;
  devices: ScannedDevice[];
  connectedId: string | null;
  rawTelemetry: Telemetry;
  history: HistoryPoint[];
  settings: Settings;
  hike: HikeState;
  demoCranking: boolean;
  packets: number;
  settingsOpen: boolean;
  activities: Activity[];
  records: PersonalRecords;
  achievements: Achievement[];
  newAchievements: Achievement[];
  selectedActivityId: string | null;
  ingestTelemetry: (raw: Telemetry) => void;
  setConnection: (connection: ConnectionStatus, extra?: { error?: string | null; connectedId?: string | null }) => void;
  setBleMeta: (available: boolean, reason: string | null) => void;
  upsertDevice: (device: ScannedDevice) => void;
  clearDevices: () => void;
  setDemoCranking: (on: boolean) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  startHike: () => void;
  stopHike: () => void;
  saveActivity: () => Activity | null;
  updateHike: (patch: Partial<HikeState>) => void;
  selectActivity: (id: string | null) => void;
  deleteActivity: (id: string) => void;
  renameActivity: (id: string, name: string) => void;
  dismissNewAchievements: () => void;
  hydrate: () => void;
  setSettingsOpen: (open: boolean) => void;
};

function diagnose(t: Telemetry, connection: ConnectionStatus, packets: number): Diagnostics {
  const age = t.timestamp ? Date.now() - t.timestamp : Number.POSITIVE_INFINITY;
  const bmeOk =
    t.temperatureC > -40 && t.temperatureC < 85 && t.pressureHpa > 300 && t.pressureHpa < 1100;
  const batteryOk = t.batteryV >= 2.5 && t.batteryV <= 4.4;
  const bleOk = connection === 'connected' || connection === 'demo';
  let message = 'Waiting for the pack';
  if (connection === 'demo') message = 'Demo pack is streaming simulated telemetry';
  else if (connection === 'connected' && bmeOk && batteryOk) message = 'Sensors look healthy';
  else if (connection === 'connected' && !bmeOk) message = 'BME280 values are out of range';
  else if (connection === 'connected' && !batteryOk) message = 'Battery voltage looks implausible';
  else if (connection === 'scanning') message = 'Scanning for CrankPack';
  return {
    lastPacketAgeMs: Number.isFinite(age) ? age : -1,
    packets,
    bmeOk,
    batteryOk,
    bleOk,
    message,
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  connection: 'demo',
  bleAvailable: false,
  bleReason: null,
  error: null,
  devices: [],
  connectedId: null,
  rawTelemetry: idleTelemetry,
  history: [],
  settings: defaultSettings,
  hike: idleHike,
  demoCranking: false,
  packets: 0,
  settingsOpen: false,
  activities: [],
  records: defaultRecords,
  achievements: [],
  newAchievements: [],
  selectedActivityId: null,
  ingestTelemetry: (raw) => {
    const packets = get().packets + 1;
    const history = get().history;
    const last = history[history.length - 1];
    const point: HistoryPoint = {
      t: raw.timestamp,
      temperatureC: raw.temperatureC,
      pressureHpa: raw.pressureHpa,
      humidityPct: raw.humidityPct,
      altitudeM: raw.altitudeM,
      batteryPct: raw.batteryPct,
      crankW: raw.crankW,
    };
    const nextHistory =
      !last || raw.timestamp - last.t >= HISTORY_EVERY_MS
        ? (history.length >= HISTORY_LIMIT ? history.slice(1) : history).concat(point)
        : history;

    const hike = get().hike;
    let nextHike = hike;
    if (hike.active) {
      const prev = get().rawTelemetry;
      const dtHours = prev.timestamp ? Math.max(0, (raw.timestamp - prev.timestamp) / 3_600_000) : 0;
      const generatedWh = hike.generatedWh + raw.crankW * dtHours;
      const currentWh = packWh(applyOffsets(raw, get().settings));
      nextHike = {
        ...hike,
        generatedWh,
        usedWh: Math.max(0, generatedWh - (currentWh - hike.startWh)),
      };
    }

    set({ rawTelemetry: raw, history: nextHistory, packets, hike: nextHike, error: null });
  },
  setConnection: (connection, extra) => {
    set({
      connection,
      error: extra?.error === undefined ? get().error : extra.error,
      connectedId: extra?.connectedId === undefined ? get().connectedId : extra.connectedId,
    });
  },
  setBleMeta: (bleAvailable, bleReason) => set({ bleAvailable, bleReason }),
  upsertDevice: (device) => {
    const devices = get().devices;
    const index = devices.findIndex((d) => d.id === device.id);
    if (index < 0) set({ devices: [...devices, device].sort((a, b) => b.rssi - a.rssi) });
    else {
      const next = devices.slice();
      next[index] = device;
      set({ devices: next.sort((a, b) => b.rssi - a.rssi) });
    }
  },
  clearDevices: () => set({ devices: [] }),
  setDemoCranking: (demoCranking) => set({ demoCranking }),
  patchSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
  startHike: () => {
    const telemetry = applyOffsets(get().rawTelemetry, get().settings);
    set({
      hike: {
        ...idleHike,
        active: true,
        startedAt: Date.now(),
        elevationM: telemetry.altitudeM,
        startWh: packWh(telemetry),
        startPct: telemetry.batteryPct,
      },
    });
  },
  stopHike: () => set({ hike: { ...get().hike, active: false } }),
  saveActivity: () => {
    const hike = get().hike;
    const telemetry = get().rawTelemetry;
    
    if (!hike.startedAt || hike.distanceM < 50) {
      return null;
    }
    
    const maxSpeedKmh = hike.points.length > 1 
      ? Math.max(...hike.points.slice(1).map((p, i) => {
          const prev = hike.points[i];
          const dist = haversineDistance(prev.lat, prev.lng, p.lat, p.lng);
          const time = (p.t - prev.t) / 3600000;
          return time > 0 ? (dist / 1000) / time : 0;
        }))
      : 0;
    
    const activity: Activity = {
      id: generateActivityId(),
      name: `Hike on ${new Date(hike.startedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
      startedAt: hike.startedAt,
      endedAt: Date.now(),
      elapsedMs: hike.elapsedMs,
      distanceM: hike.distanceM,
      elevationGainM: hike.elevationGainM,
      avgSpeedKmh: hike.avgSpeedKmh,
      maxSpeedKmh,
      generatedWh: hike.generatedWh,
      usedWh: hike.usedWh,
      startPct: hike.startPct,
      endPct: telemetry.batteryPct,
      points: hike.points,
      elevationProfile: hike.points.map(p => p.alt),
      splits: calculateSplits(hike.points, hike.generatedWh),
    };
    
    const activities = [activity, ...get().activities].slice(0, MAX_ACTIVITIES);
    
    const records = { ...get().records };
    if (activity.distanceM > records.longestDistanceM) {
      records.longestDistanceM = activity.distanceM;
      records.longestDistanceActivityId = activity.id;
    }
    if (activity.elevationGainM > records.mostElevationGainM) {
      records.mostElevationGainM = activity.elevationGainM;
      records.mostElevationActivityId = activity.id;
    }
    if (activity.generatedWh > records.mostEnergyGeneratedWh) {
      records.mostEnergyGeneratedWh = activity.generatedWh;
      records.mostEnergyActivityId = activity.id;
    }
    if (activity.elapsedMs > records.longestDurationMs) {
      records.longestDurationMs = activity.elapsedMs;
      records.longestDurationActivityId = activity.id;
    }
    if (activity.distanceM > 1000 && activity.avgSpeedKmh > 0) {
      const paceMinPerKm = 60 / activity.avgSpeedKmh;
      if (paceMinPerKm < records.fastestPaceMinPerKm) {
        records.fastestPaceMinPerKm = paceMinPerKm;
        records.fastestPaceActivityId = activity.id;
      }
    }
    
    const existingAchievements = get().achievements;
    const newAchievements = checkAchievements(activity, get().activities, existingAchievements);
    const achievements = [...existingAchievements, ...newAchievements];
    
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
    
    set({ activities, records, achievements, newAchievements });
    return activity;
  },
  updateHike: (patch) => set({ hike: { ...get().hike, ...patch } }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  selectActivity: (id) => set({ selectedActivityId: id }),
  deleteActivity: (id) => {
    const activities = get().activities.filter(a => a.id !== id);
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
    set({ activities, selectedActivityId: null });
  },
  renameActivity: (id, name) => {
    const activities = get().activities.map(a => a.id === id ? { ...a, name } : a);
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
    set({ activities });
  },
  dismissNewAchievements: () => set({ newAchievements: [] }),
  hydrate: () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        set({ settings: { ...defaultSettings, ...(JSON.parse(raw) as Settings) } });
      }
    } catch {
      // keep defaults
    }
    
    try {
      const activitiesRaw = localStorage.getItem(ACTIVITIES_KEY);
      if (activitiesRaw) {
        set({ activities: JSON.parse(activitiesRaw) as Activity[] });
      }
    } catch {
      // keep defaults
    }
    
    try {
      const recordsRaw = localStorage.getItem(RECORDS_KEY);
      if (recordsRaw) {
        set({ records: { ...defaultRecords, ...(JSON.parse(recordsRaw) as PersonalRecords) } });
      }
    } catch {
      // keep defaults
    }
    
    try {
      const achievementsRaw = localStorage.getItem(ACHIEVEMENTS_KEY);
      if (achievementsRaw) {
        set({ achievements: JSON.parse(achievementsRaw) as Achievement[] });
      }
    } catch {
      // keep defaults
    }
    
    const { history } = get();
    if (history.length === 0) {
      set({ history: createSeedHistory(SEED_HISTORY_COUNT) });
    }
  },
}));

export function useDisplayedTelemetry() {
  const raw = useAppStore((s) => s.rawTelemetry);
  const settings = useAppStore((s) => s.settings);
  return useMemo(() => applyOffsets(raw, settings), [raw, settings]);
}

export function useDiagnostics(): Diagnostics {
  const raw = useAppStore((s) => s.rawTelemetry);
  const connection = useAppStore((s) => s.connection);
  const packets = useAppStore((s) => s.packets);
  return useMemo(() => diagnose(raw, connection, packets), [raw, connection, packets]);
}

export function useWeeklyStats(): WeeklyStats {
  const activities = useAppStore((s) => s.activities);
  return useMemo(() => {
    const weekStart = getWeekStart(Date.now());
    const weekActivities = activities.filter(a => a.startedAt >= weekStart);
    
    return {
      weekStart,
      totalDistanceM: weekActivities.reduce((sum, a) => sum + a.distanceM, 0),
      totalElevationGainM: weekActivities.reduce((sum, a) => sum + a.elevationGainM, 0),
      totalGeneratedWh: weekActivities.reduce((sum, a) => sum + a.generatedWh, 0),
      totalDurationMs: weekActivities.reduce((sum, a) => sum + a.elapsedMs, 0),
      activityCount: weekActivities.length,
    };
  }, [activities]);
}

export function useSelectedActivity(): Activity | null {
  const activities = useAppStore((s) => s.activities);
  const selectedId = useAppStore((s) => s.selectedActivityId);
  return useMemo(() => activities.find(a => a.id === selectedId) ?? null, [activities, selectedId]);
}

export type { BleCommand };

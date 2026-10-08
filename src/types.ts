export type ConnectionStatus =
  | 'demo'
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected';

export type TempUnit = 'C' | 'F';
export type PressureUnit = 'hPa' | 'inHg';

export type Telemetry = {
  batteryPct: number;
  batteryV: number;
  charging: boolean;
  crankA: number;
  crankW: number;
  usbW: number;
  usbA: number;
  remainingMah: number;
  capacityMah: number;
  temperatureC: number;
  pressureHpa: number;
  humidityPct: number;
  altitudeM: number;
  batteryHealth: number;
  firmware: string;
  deviceName: string;
  rssi: number | null;
  timestamp: number;
};

export type HistoryPoint = {
  t: number;
  temperatureC: number;
  pressureHpa: number;
  humidityPct: number;
  altitudeM: number;
  batteryPct: number;
  crankW: number;
};

export type ScannedDevice = {
  id: string;
  name: string;
  rssi: number;
  isCrankPack: boolean;
};

export type ChartWindow = '1m' | '5m' | '15m';

export type Settings = {
  tempUnit: TempUnit;
  pressureUnit: PressureUnit;
  tempOffsetC: number;
  humidityOffset: number;
  seaLevelHpa: number;
  capacityMah: number;
  emptyVoltage: number;
  fullVoltage: number;
  useVoltageCurve: boolean;
  deviceAlias: string;
  chartWindow: ChartWindow;
};

export type GeoPoint = {
  lat: number;
  lng: number;
  alt: number;
  t: number;
};

export type HikeState = {
  active: boolean;
  startedAt: number | null;
  elapsedMs: number;
  distanceM: number;
  elevationM: number;
  elevationGainM: number;
  avgSpeedKmh: number;
  points: GeoPoint[];
  startWh: number;
  generatedWh: number;
  usedWh: number;
  startPct: number;
};

export type Diagnostics = {
  lastPacketAgeMs: number;
  packets: number;
  bmeOk: boolean;
  batteryOk: boolean;
  bleOk: boolean;
  message: string;
};

export type BleCommand =
  | { cmd: 'cal_batt'; emptyV: number; fullV: number; cap: number }
  | { cmd: 'cal_bme'; sea: number }
  | { cmd: 'set_name'; name: string }
  | { cmd: 'diag' };

export type Activity = {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number;
  elapsedMs: number;
  distanceM: number;
  elevationGainM: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  generatedWh: number;
  usedWh: number;
  startPct: number;
  endPct: number;
  points: GeoPoint[];
  elevationProfile: number[];
  splits: ActivitySplit[];
};

export type ActivitySplit = {
  km: number;
  elapsedMs: number;
  paceMinPerKm: number;
  elevationGainM: number;
  generatedWh: number;
};

export type PersonalRecords = {
  longestDistanceM: number;
  longestDistanceActivityId: string | null;
  mostElevationGainM: number;
  mostElevationActivityId: string | null;
  mostEnergyGeneratedWh: number;
  mostEnergyActivityId: string | null;
  fastestPaceMinPerKm: number;
  fastestPaceActivityId: string | null;
  longestDurationMs: number;
  longestDurationActivityId: string | null;
};

export type WeeklyStats = {
  weekStart: number;
  totalDistanceM: number;
  totalElevationGainM: number;
  totalGeneratedWh: number;
  totalDurationMs: number;
  activityCount: number;
};

export type AchievementType =
  | 'first_hike'
  | 'distance_5k'
  | 'distance_10k'
  | 'distance_marathon'
  | 'elevation_500m'
  | 'elevation_1000m'
  | 'energy_10wh'
  | 'energy_50wh'
  | 'energy_100wh'
  | 'streak_3_days'
  | 'streak_7_days'
  | 'early_bird'
  | 'night_owl';

export type Achievement = {
  type: AchievementType;
  unlockedAt: number;
  activityId: string | null;
};

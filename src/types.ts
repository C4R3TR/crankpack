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

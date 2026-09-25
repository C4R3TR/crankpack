import type { Settings, Telemetry } from './types';

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function altitudeFromPressure(hpa: number, seaLevelHpa: number) {
  if (hpa <= 0 || seaLevelHpa <= 0) return 0;
  return 44330 * (1 - Math.pow(hpa / seaLevelHpa, 1 / 5.255));
}

export function voltageToPct(v: number, empty: number, full: number) {
  if (full <= empty) return 0;
  return clamp(((v - empty) / (full - empty)) * 100, 0, 100);
}

export function remainingMah(pct: number, capacityMah: number) {
  return (pct / 100) * capacityMah;
}

export function packWh(t: Telemetry) {
  return (t.remainingMah / 1000) * t.batteryV;
}

export function displayTemp(c: number, unit: Settings['tempUnit']) {
  return unit === 'F' ? (c * 9) / 5 + 32 : c;
}

export function tempSuffix(unit: Settings['tempUnit']) {
  return unit === 'F' ? '°F' : '°C';
}

export function displayPressure(hpa: number, unit: Settings['pressureUnit']) {
  return unit === 'inHg' ? hpa * 0.0295299830714 : hpa;
}

export function pressureSuffix(unit: Settings['pressureUnit']) {
  return unit === 'inHg' ? 'inHg' : 'hPa';
}

export function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function formatKm(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function applyOffsets(raw: Telemetry, settings: Settings): Telemetry {
  const temperatureC = raw.temperatureC + settings.tempOffsetC;
  const humidityPct = clamp(raw.humidityPct + settings.humidityOffset, 0, 100);
  const altitudeM =
    raw.altitudeM || altitudeFromPressure(raw.pressureHpa, settings.seaLevelHpa);
  const batteryPct = settings.useVoltageCurve
    ? voltageToPct(raw.batteryV, settings.emptyVoltage, settings.fullVoltage)
    : raw.batteryPct;
  const capacityMah = settings.capacityMah || raw.capacityMah;
  return {
    ...raw,
    temperatureC,
    humidityPct,
    altitudeM,
    batteryPct,
    capacityMah,
    remainingMah: remainingMah(batteryPct, capacityMah),
    deviceName: settings.deviceAlias || raw.deviceName,
  };
}

export function pressureTrend(points: { pressureHpa: number }[]): 'rising' | 'falling' | 'steady' {
  if (points.length < 6) return 'steady';
  const recent = points.slice(-6);
  const delta = recent[recent.length - 1].pressureHpa - recent[0].pressureHpa;
  if (delta > 0.4) return 'rising';
  if (delta < -0.4) return 'falling';
  return 'steady';
}

export function crankHint(watts: number, charging: boolean) {
  if (watts >= 8) return 'Strong cadence';
  if (watts >= 4) return 'Good power — keep it up';
  if (watts >= 0.4) return 'Crank harder → more power';
  if (charging) return 'Charging slowly';
  return 'Crank to charge';
}

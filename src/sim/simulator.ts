import type { HistoryPoint, Telemetry } from '../types';

function noise(scale: number) {
  return (Math.random() - 0.5) * scale;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function seededNoise(seed: number, scale: number) {
  return (seededRandom(seed) - 0.5) * scale;
}

const DEFAULT_BASE: Omit<Telemetry, 'timestamp'> & { timestamp: number } = {
  batteryPct: 72,
  batteryV: 3.91,
  charging: false,
  crankA: 0,
  crankW: 0,
  usbW: 2.1,
  usbA: 0.42,
  remainingMah: 2880,
  capacityMah: 4000,
  temperatureC: 14.8,
  pressureHpa: 1008.2,
  humidityPct: 68,
  altitudeM: 428,
  batteryHealth: 96,
  firmware: 'demo-1.0.0',
  deviceName: 'CrankPack',
  rssi: -47,
  timestamp: Date.now(),
};

export function createSeedHistory(count: number): HistoryPoint[] {
  const now = Date.now();
  const points: HistoryPoint[] = [];
  
  let temp = DEFAULT_BASE.temperatureC;
  let pressure = DEFAULT_BASE.pressureHpa;
  let humidity = DEFAULT_BASE.humidityPct;
  let altitude = DEFAULT_BASE.altitudeM;
  let battery = DEFAULT_BASE.batteryPct;
  let crankW = 0;
  
  for (let i = 0; i < count; i++) {
    const seed = i * 17;
    const progress = i / count;
    
    const wasCranking = progress > 0.3 && progress < 0.6;
    crankW = wasCranking 
      ? Math.max(0, 4 + seededNoise(seed, 3)) 
      : Math.max(0, crankW * 0.7 + seededNoise(seed + 1, 0.1));
    
    temp += seededNoise(seed + 2, 0.12) + (wasCranking ? 0.02 : -0.01);
    pressure += seededNoise(seed + 3, 0.2);
    humidity = Math.min(95, Math.max(20, humidity + seededNoise(seed + 4, 0.3)));
    altitude = Math.max(0, altitude + seededNoise(seed + 5, 0.5));
    
    if (wasCranking) {
      battery = Math.min(100, battery + 0.08);
    } else {
      battery = Math.max(8, battery - 0.02);
    }
    
    points.push({
      t: now - (count - i) * 2000,
      temperatureC: temp,
      pressureHpa: pressure,
      humidityPct: humidity,
      altitudeM: altitude,
      batteryPct: battery,
      crankW,
    });
  }
  
  return points;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothStep(x: number) {
  return x * x * (3 - 2 * x);
}

export function createDemoTelemetry(prev: Telemetry | null, cranking: boolean, dtSec: number): Telemetry {
  const base = prev ?? { ...DEFAULT_BASE, timestamp: Date.now() };

  const smoothingFactor = Math.min(1, dtSec * 3);
  
  const targetW = cranking ? 5.8 + noise(1.5) : 0;
  const crankW = Math.max(0, lerp(base.crankW, targetW, smoothStep(smoothingFactor)));
  const crankA = crankW > 0.1 ? crankW / Math.max(base.batteryV, 3.3) : 0;
  
  const usbW = Math.max(0.4, lerp(base.usbW, 1.9 + noise(0.2), 0.15));
  const usbA = usbW / 5;
  const charging = crankW > 0.3;
  
  const netW = crankW - usbW - 0.25;
  const batteryCapacityWh = (base.capacityMah / 1000) * base.batteryV;
  const deltaPct = batteryCapacityWh > 0 ? (netW * dtSec / 3600) / batteryCapacityWh * 100 : 0;
  const batteryPct = Math.min(100, Math.max(8, base.batteryPct + deltaPct));
  
  const targetVoltage = 3.3 + (batteryPct / 100) * 0.9;
  const batteryV = lerp(base.batteryV, targetVoltage, 0.2) + noise(0.005);
  
  const tempTarget = DEFAULT_BASE.temperatureC + (cranking ? 0.5 : 0);
  const temperatureC = lerp(base.temperatureC, tempTarget, 0.02) + noise(0.04);
  
  const pressureHpa = lerp(base.pressureHpa, DEFAULT_BASE.pressureHpa, 0.01) + noise(0.08);
  
  const humidityTarget = DEFAULT_BASE.humidityPct + noise(1);
  const humidityPct = Math.min(95, Math.max(20, lerp(base.humidityPct, humidityTarget, 0.05)));
  
  const altitudeM = Math.max(0, lerp(base.altitudeM, DEFAULT_BASE.altitudeM, 0.02) + noise(0.2));

  return {
    ...base,
    batteryPct,
    batteryV,
    charging,
    crankA,
    crankW,
    usbW,
    usbA,
    remainingMah: (batteryPct / 100) * base.capacityMah,
    temperatureC,
    pressureHpa,
    humidityPct,
    altitudeM,
    timestamp: Date.now(),
  };
}

export function createSimulatedPoint(
  prev: { lat: number; lng: number; alt: number } | null,
  headingRad: number,
  stepM: number
) {
  const origin = prev ?? { lat: 54.9783, lng: -1.6178, alt: 428 };
  const dLat = (stepM * Math.cos(headingRad)) / 111_111;
  const dLng = (stepM * Math.sin(headingRad)) / (111_111 * Math.cos((origin.lat * Math.PI) / 180));
  return {
    lat: origin.lat + dLat,
    lng: origin.lng + dLng,
    alt: origin.alt + 0.4 + noise(0.6),
    headingRad: headingRad + noise(0.18),
  };
}

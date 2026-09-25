import type { Telemetry } from '../types';

function noise(scale: number) {
  return (Math.random() - 0.5) * scale;
}

export function createDemoTelemetry(prev: Telemetry | null, cranking: boolean, dtSec: number): Telemetry {
  const base = prev ?? {
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

  const targetW = cranking ? 6.4 + noise(2.2) : Math.max(0, base.crankW * 0.55 + noise(0.08));
  const crankW = Math.max(0, targetW);
  const crankA = crankW > 0.15 ? crankW / Math.max(base.batteryV, 3.3) : 0;
  const usbW = Math.max(0.4, 1.8 + noise(0.35));
  const usbA = usbW / 5;
  const charging = crankW > 0.4;
  const netW = crankW - usbW - 0.3;
  const deltaPct = (netW * dtSec) / (base.capacityMah / 1000 * base.batteryV * 3600) * 100;
  const batteryPct = Math.min(100, Math.max(8, base.batteryPct + deltaPct));
  const batteryV = 3.3 + (batteryPct / 100) * 0.9 + noise(0.01);
  const temperatureC = base.temperatureC + noise(0.08) + (cranking ? 0.01 : -0.004);
  const pressureHpa = base.pressureHpa + noise(0.12);
  const humidityPct = Math.min(95, Math.max(20, base.humidityPct + noise(0.2)));
  const altitudeM = Math.max(0, base.altitudeM + noise(0.35));

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

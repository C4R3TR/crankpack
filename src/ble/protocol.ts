import type { BleCommand, Telemetry } from '../types';

function num(v: unknown, fallback = 0) {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = '') {
  return typeof v === 'string' && v.length ? v : fallback;
}

function bool(v: unknown) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

export function parseTelemetry(raw: string, rssi: number | null = null): Telemetry | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const battery = (data.battery as Record<string, unknown> | undefined) ?? {};
    const crank = (data.crank as Record<string, unknown> | undefined) ?? {};
    const usb = (data.usb as Record<string, unknown> | undefined) ?? {};
    const env = (data.env as Record<string, unknown> | undefined) ?? {};

    const batteryV = num(data.v ?? data.batteryV ?? battery.v, 0);
    const batteryPct = num(data.pct ?? data.batteryPct ?? battery.pct, 0);
    const capacityMah = num(data.cap ?? data.capacityMah ?? battery.cap, 4000);
    const remainingMah = num(data.mah ?? data.remainingMah ?? battery.mah, (batteryPct / 100) * capacityMah);

    return {
      batteryPct,
      batteryV,
      charging: bool(data.chg ?? data.charging ?? battery.charging),
      crankA: num(data.crankA ?? crank.a),
      crankW: num(data.crankW ?? crank.w),
      usbW: num(data.usbW ?? usb.w),
      usbA: num(data.usbA ?? usb.a),
      remainingMah,
      capacityMah,
      temperatureC: num(data.t ?? data.temp ?? env.t),
      pressureHpa: num(data.p ?? data.pressure ?? env.p),
      humidityPct: num(data.h ?? data.humidity ?? env.h),
      altitudeM: num(data.alt ?? env.alt),
      batteryHealth: num(data.health ?? battery.health, 100),
      firmware: str(data.fw ?? data.firmware, 'unknown'),
      deviceName: str(data.name ?? data.deviceName, 'CrankPack'),
      rssi,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

export function encodeCommand(command: BleCommand) {
  return JSON.stringify(command);
}

export function extractCompleteJson(buffer: string): { json: string; rest: string } | null {
  const start = buffer.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < buffer.length; i += 1) {
    if (buffer[i] === '{') depth += 1;
    if (buffer[i] === '}') depth -= 1;
    if (depth === 0) {
      return {
        json: buffer.slice(start, i + 1),
        rest: buffer.slice(i + 1),
      };
    }
  }
  return null;
}

import { create } from 'zustand';
import { useMemo } from 'react';

import type {
  BleCommand,
  ConnectionStatus,
  Diagnostics,
  HikeState,
  HistoryPoint,
  ScannedDevice,
  Settings,
  Telemetry,
} from './types';
import { applyOffsets, packWh } from './units';

const SETTINGS_KEY = 'crankpack.settings.v1';
const HISTORY_LIMIT = 180;

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
  ingestTelemetry: (raw: Telemetry) => void;
  setConnection: (connection: ConnectionStatus, extra?: { error?: string | null; connectedId?: string | null }) => void;
  setBleMeta: (available: boolean, reason: string | null) => void;
  upsertDevice: (device: ScannedDevice) => void;
  clearDevices: () => void;
  setDemoCranking: (on: boolean) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  startHike: () => void;
  stopHike: () => void;
  updateHike: (patch: Partial<HikeState>) => void;
  hydrate: () => void;
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
  ingestTelemetry: (raw) => {
    const packets = get().packets + 1;
    const history = get().history;
    const last = history[history.length - 1];
    const nextHistory =
      !last || raw.timestamp - last.t >= 2000
        ? [
            ...history,
            {
              t: raw.timestamp,
              temperatureC: raw.temperatureC,
              pressureHpa: raw.pressureHpa,
              humidityPct: raw.humidityPct,
              altitudeM: raw.altitudeM,
              batteryPct: raw.batteryPct,
              crankW: raw.crankW,
            },
          ].slice(-HISTORY_LIMIT)
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
  updateHike: (patch) => set({ hike: { ...get().hike, ...patch } }),
  hydrate: () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        set({ settings: { ...defaultSettings, ...(JSON.parse(raw) as Settings) } });
      }
    } catch {
      // keep defaults
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

export type { BleCommand };

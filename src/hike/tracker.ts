import { getCurrentFix, watchFix } from './location';
import { haversineM } from './geo';
import { createSimulatedPoint } from '../sim/simulator';
import { useAppStore } from '../store';
import { applyOffsets } from '../units';

let stopWatch: (() => void) | null = null;
let tick: number | null = null;
let simTick: number | null = null;
let heading = 0.4;
let simPoint: { lat: number; lng: number; alt: number } | null = null;

function applyPoint(lat: number, lng: number, alt: number) {
  const hike = useAppStore.getState().hike;
  if (!hike.active) return;
  const last = hike.points[hike.points.length - 1];
  const delta = last ? haversineM(last.lat, last.lng, lat, lng) : 0;
  const gain = last && alt - last.alt > 1.2 ? alt - last.alt : 0;
  const points = [...hike.points, { lat, lng, alt, t: Date.now() }].slice(-4000);
  const elapsedMs = Date.now() - (hike.startedAt ?? Date.now());
  const distanceM = hike.distanceM + (delta < 40 ? delta : 0);
  const hours = elapsedMs / 3_600_000;
  useAppStore.getState().updateHike({
    points,
    distanceM,
    elevationM: alt,
    elevationGainM: hike.elevationGainM + gain,
    elapsedMs,
    avgSpeedKmh: hours > 0 ? distanceM / 1000 / hours : 0,
  });
}

export async function startHikeTracking() {
  stopHikeTracking();
  const connection = useAppStore.getState().connection;
  tick = window.setInterval(() => {
    const hike = useAppStore.getState().hike;
    if (!hike.active || !hike.startedAt) return;
    useAppStore.getState().updateHike({ elapsedMs: Date.now() - hike.startedAt });
  }, 1000);

  if (connection !== 'demo') {
    stopWatch = await watchFix((fix) => applyPoint(fix.lat, fix.lng, fix.alt));
    if (stopWatch) return;
  }

  // No usable GPS (demo pack, denied permission, or unsupported): simulate a
  // walk starting from the last real fix so the route sits where the user is.
  simPoint = simPoint ?? (await getCurrentFix());

  simTick = window.setInterval(() => {
    const telemetry = applyOffsets(useAppStore.getState().rawTelemetry, useAppStore.getState().settings);
    const next = createSimulatedPoint(simPoint, heading, 1.2);
    heading = next.headingRad;
    simPoint = next;
    applyPoint(next.lat, next.lng, telemetry.altitudeM || next.alt);
  }, 1000);
  {
    const telemetry = applyOffsets(useAppStore.getState().rawTelemetry, useAppStore.getState().settings);
    const next = createSimulatedPoint(simPoint, heading, 0);
    heading = next.headingRad;
    simPoint = next;
    applyPoint(next.lat, next.lng, telemetry.altitudeM || next.alt);
  }
}

export function stopHikeTracking() {
  stopWatch?.();
  stopWatch = null;
  if (tick) window.clearInterval(tick);
  if (simTick) window.clearInterval(simTick);
  tick = null;
  simTick = null;
}

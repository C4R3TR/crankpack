import { BleClient, dataViewToText, numbersToDataView } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

import { encodeCommand, extractCompleteJson, parseTelemetry } from './protocol';
import { COMMAND_UUID, SERVICE_UUID, TELEMETRY_UUID, looksLikeCrankPack } from './uuids';
import { useAppStore } from '../store';
import type { BleCommand } from '../types';

function textToDataView(text: string) {
  return numbersToDataView(Array.from(new TextEncoder().encode(text)));
}

let buffer = '';
let initialized = false;

async function ensureInit() {
  if (initialized) return;
  await BleClient.initialize();
  initialized = true;
}

export async function scanForPack() {
  const { clearDevices, upsertDevice, setConnection } = useAppStore.getState();
  clearDevices();
  setConnection('scanning', { error: null, connectedId: null });
  try {
    await ensureInit();
    await BleClient.requestLEScan({ allowDuplicates: true }, (result) => {
      const name = result.device.name || result.localName || 'Unknown device';
      upsertDevice({
        id: result.device.deviceId,
        name,
        rssi: result.rssi ?? -100,
        isCrankPack: looksLikeCrankPack(name, result.uuids),
      });
    });
  } catch (error) {
    setConnection('disconnected', {
      error: error instanceof Error ? error.message : 'Scan failed',
    });
  }
}

export async function stopScan() {
  try {
    await BleClient.stopLEScan();
  } catch {
    // already stopped
  }
  if (useAppStore.getState().connection === 'scanning') {
    useAppStore.getState().setConnection('disconnected');
  }
}

export async function connectToPack(id: string) {
  const { setConnection, ingestTelemetry } = useAppStore.getState();
  await stopScan();
  setConnection('connecting', { error: null, connectedId: id });
  buffer = '';
  try {
    await ensureInit();
    await BleClient.connect(id, () => {
      setConnection('disconnected', { connectedId: null, error: 'Pack disconnected' });
    });
    await BleClient.discoverServices(id);
    await BleClient.startNotifications(id, SERVICE_UUID, TELEMETRY_UUID, (value) => {
      buffer += dataViewToText(value);
      let extracted = extractCompleteJson(buffer);
      while (extracted) {
        const parsed = parseTelemetry(extracted.json, null);
        if (parsed) ingestTelemetry(parsed);
        buffer = extracted.rest;
        extracted = extractCompleteJson(buffer);
      }
      if (buffer.length > 4096) buffer = '';
    });
    setConnection('connected', { connectedId: id });
  } catch (error) {
    setConnection('disconnected', {
      connectedId: null,
      error: error instanceof Error ? error.message : 'Could not connect',
    });
  }
}

export async function disconnectPack() {
  const id = useAppStore.getState().connectedId;
  if (id) {
    try {
      await BleClient.disconnect(id);
    } catch {
      // already gone
    }
  }
  useAppStore.getState().setConnection('disconnected', { connectedId: null });
}

export async function enableDemo() {
  await stopScan();
  await disconnectPack();
  useAppStore.getState().setConnection('demo', { connectedId: null, error: null });
}

export async function sendCommand(command: BleCommand) {
  const id = useAppStore.getState().connectedId;
  if (!id) throw new Error('Not connected');
  await BleClient.write(id, SERVICE_UUID, COMMAND_UUID, textToDataView(encodeCommand(command)));
}

export function blePlatformNote() {
  if (Capacitor.isNativePlatform()) {
    return 'Connect to the backpack charger.';
  }
  return 'Bluetooth requires the iPhone app. Demo data is shown here.';
}

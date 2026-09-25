/** CrankPack BLE service — advertise this UUID from the ESP32. */
export const SERVICE_UUID = 'a1b2c3d4-0001-4000-8000-123456789abc';
export const TELEMETRY_UUID = 'a1b2c3d4-0002-4000-8000-123456789abc';
export const COMMAND_UUID = 'a1b2c3d4-0003-4000-8000-123456789abc';

export const DEVICE_NAME_HINTS = ['crankpack', 'crank pack', 'engine', 'backpack'];

export function looksLikeCrankPack(name?: string | null, serviceUuids?: string[] | null) {
  const lower = (name ?? '').toLowerCase();
  if (DEVICE_NAME_HINTS.some((hint) => lower.includes(hint))) return true;
  return (serviceUuids ?? []).some(
    (uuid) => uuid.replace(/-/g, '').toLowerCase() === SERVICE_UUID.replace(/-/g, '').toLowerCase()
  );
}

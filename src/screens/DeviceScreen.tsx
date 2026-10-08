import { Header } from './PowerScreen';
import {
  blePlatformNote,
  connectToPack,
  disconnectPack,
  enableDemo,
  scanForPack,
  stopScan,
} from '../ble/client';
import { useAppStore, useDiagnostics, useDisplayedTelemetry } from '../store';

export function DeviceScreen() {
  const connection = useAppStore((s) => s.connection);
  const devices = useAppStore((s) => s.devices);
  const error = useAppStore((s) => s.error);
  const t = useDisplayedTelemetry();
  const diagnostics = useDiagnostics();
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  return (
    <section className="screen">
      <Header title="Device" />

      <p className="group-title">Bluetooth</p>
      <div className="group">
        <div className="group-pad">
          {error ? <p className="error">{error}</p> : <p className="body">{blePlatformNote()}</p>}
        </div>
        {connection === 'connected' ? (
          <button type="button" className="btn danger" onClick={() => disconnectPack()}>
            Disconnect Pack
          </button>
        ) : connection === 'scanning' ? (
          <button type="button" className="btn secondary" onClick={() => stopScan()}>
            Stop Scanning
          </button>
        ) : (
          <button
            type="button"
            className={connection === 'demo' ? 'btn secondary' : 'btn'}
            onClick={() => scanForPack()}
          >
            Scan for Pack
          </button>
        )}
        {connection !== 'demo' ? (
          <button type="button" className="btn secondary" onClick={() => enableDemo()}>
            Use Demo Pack
          </button>
        ) : null}
      </div>

      {devices.length ? (
        <>
          <p className="group-title">Nearby</p>
          <div className="group">
            {devices.map((device) => (
              <button key={device.id} type="button" className="cell" onClick={() => connectToPack(device.id)}>
                <div>
                  <div className="cell-label">{device.name}</div>
                  <div className="cell-note">{device.isCrankPack ? 'CrankPack' : device.id}</div>
                </div>
                <span className="cell-value">{device.rssi} dBm</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <p className="group-title">Pack</p>
      <div className="group">
        <div className="cell">
          <span className="cell-label">Firmware</span>
          <span className="cell-value">{t.firmware}</span>
        </div>
        <div className="cell">
          <span className="cell-label">Battery health</span>
          <span className="cell-value">{Math.round(t.batteryHealth)}%</span>
        </div>
        <div className="cell">
          <span className="cell-label">Signal</span>
          <span className="cell-value">{t.rssi == null ? '—' : `${t.rssi} dBm`}</span>
        </div>
        <button type="button" className="cell" onClick={() => setSettingsOpen(true)}>
          <span className="cell-label">Settings</span>
          <span className="cell-value">Units, calibration</span>
        </button>
      </div>

      <p className="group-title">Diagnostics</p>
      <div className="group">
        <div className="cell">
          <span className="cell-label">Status</span>
          <span className="cell-value">{diagnostics.message}</span>
        </div>
        <div className="cell">
          <span className="cell-label">Packets</span>
          <span className="cell-value">{diagnostics.packets}</span>
        </div>
        <div className="cell">
          <span className="cell-label">Last packet</span>
          <span className="cell-value">
            {diagnostics.lastPacketAgeMs < 0 ? '—' : `${Math.round(diagnostics.lastPacketAgeMs / 1000)}s`}
          </span>
        </div>
        <div className="cell">
          <span className="cell-label">BME280</span>
          <span className="cell-value">{diagnostics.bmeOk ? 'OK' : 'Check wiring'}</span>
        </div>
        <div className="cell">
          <span className="cell-label">Battery sense</span>
          <span className="cell-value">{diagnostics.batteryOk ? 'OK' : 'Check divider'}</span>
        </div>
        <div className="cell">
          <span className="cell-label">Link</span>
          <span className="cell-value">{diagnostics.bleOk ? 'OK' : 'Down'}</span>
        </div>
      </div>
    </section>
  );
}

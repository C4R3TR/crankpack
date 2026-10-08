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
  const bleAvailable = useAppStore((s) => s.bleAvailable);
  const error = useAppStore((s) => s.error);
  const t = useDisplayedTelemetry();
  const diagnostics = useDiagnostics();
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const isScanning = connection === 'scanning';
  const isConnecting = connection === 'connecting';

  return (
    <section className="screen">
      <Header title="Device" />

      {/* Connection Status Card */}
      <ConnectionCard 
        connection={connection}
        deviceName={t.deviceName}
        rssi={t.rssi}
        error={error}
        bleAvailable={bleAvailable}
      />

      {/* Nearby Devices */}
      {(isScanning || devices.length > 0) && (
        <>
          <p className="group-title">
            {isScanning ? 'Scanning nearby' : 'Nearby devices'}
            {isScanning && <span className="scanning-dot" />}
          </p>
          <div className="group">
            {devices.length === 0 && isScanning ? (
              <div className="empty-scan">
                <div className="spinner" />
                <span>Looking for CrankPack devices…</span>
              </div>
            ) : (
              devices.map((device) => (
                <button 
                  key={device.id} 
                  type="button" 
                  className="device-row cell" 
                  onClick={() => connectToPack(device.id)}
                  disabled={isConnecting}
                >
                  <div className="device-info">
                    <div className="device-name">{device.name}</div>
                    <div className="device-meta">
                      {device.isCrankPack ? (
                        <span className="device-badge">CrankPack</span>
                      ) : (
                        <span className="device-id">{device.id}</span>
                      )}
                    </div>
                  </div>
                  <div className="device-signal">
                    <SignalBars rssi={device.rssi} />
                    <span className="device-rssi">{device.rssi} dBm</span>
                  </div>
                </button>
              ))
            )}
            {isScanning && (
              <button type="button" className="btn secondary" onClick={() => stopScan()}>
                Stop Scanning
              </button>
            )}
          </div>
        </>
      )}

      <p className="group-title">Pack info</p>
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

function ConnectionCard({
  connection,
  deviceName,
  rssi,
  error,
  bleAvailable,
}: {
  connection: string;
  deviceName: string;
  rssi: number | null;
  error: string | null;
  bleAvailable: boolean;
}) {
  const isConnected = connection === 'connected';
  const isDemo = connection === 'demo';
  const isScanning = connection === 'scanning';
  const isConnecting = connection === 'connecting';
  const isIdle = !isConnected && !isDemo && !isScanning && !isConnecting;

  return (
    <div className={`connection-card ${isConnected ? 'connected' : ''} ${isDemo ? 'demo' : ''}`}>
      <div className="connection-card-header">
        <div className="connection-card-icon">
          {isConnected || isDemo ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          ) : isScanning || isConnecting ? (
            <div className="spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12.55a11 11 0 0 1 14 0M8.5 16.05a6 6 0 0 1 7 0M12 20h.01" />
            </svg>
          )}
        </div>
        <div className="connection-card-info">
          <div className="connection-card-title">
            {isConnected ? deviceName : isDemo ? 'Demo Pack' : isScanning ? 'Scanning' : isConnecting ? 'Connecting' : 'Not connected'}
          </div>
          <div className="connection-card-subtitle">
            {isConnected && rssi != null ? (
              <>Signal: {rssi} dBm</>
            ) : isDemo ? (
              <>Simulated telemetry</>
            ) : isScanning ? (
              <>Looking for devices nearby</>
            ) : isConnecting ? (
              <>Please wait…</>
            ) : (
              <>Pair your CrankPack to get started</>
            )}
          </div>
        </div>
      </div>
      
      {error && (
        <div className="connection-card-error">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="connection-card-actions">
        {isConnected ? (
          <button type="button" className="btn danger" onClick={() => disconnectPack()}>
            Disconnect
          </button>
        ) : isScanning ? null : isConnecting ? null : (
          <>
            {bleAvailable && (
              <button type="button" className="btn" onClick={() => scanForPack()}>
                {isDemo ? 'Scan for Real Pack' : 'Scan for Pack'}
              </button>
            )}
            {!isDemo && (
              <button type="button" className="btn secondary" onClick={() => enableDemo()}>
                Try Demo Mode
              </button>
            )}
          </>
        )}
      </div>
      
      {!bleAvailable && isIdle && (
        <p className="connection-card-note">{blePlatformNote()}</p>
      )}
    </div>
  );
}

function SignalBars({ rssi }: { rssi: number }) {
  const bars = rssi > -50 ? 4 : rssi > -60 ? 3 : rssi > -70 ? 2 : 1;
  return (
    <div className="signal-bars" aria-label={`Signal strength: ${bars} of 4 bars`}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`signal-bar ${i <= bars ? 'active' : ''}`} style={{ height: `${i * 4 + 4}px` }} />
      ))}
    </div>
  );
}

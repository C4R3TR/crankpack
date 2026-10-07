import { useState, useCallback } from 'react';
import { Header } from './PowerScreen';
import {
  blePlatformNote,
  connectToPack,
  disconnectPack,
  enableDemo,
  scanForPack,
  sendCommand,
  stopScan,
} from '../ble/client';
import { useAppStore, useDiagnostics, useDisplayedTelemetry } from '../store';
import type { PressureUnit, TempUnit } from '../types';

export function DeviceScreen() {
  const connection = useAppStore((s) => s.connection);
  const devices = useAppStore((s) => s.devices);
  const bleAvailable = useAppStore((s) => s.bleAvailable);
  const settings = useAppStore((s) => s.settings);
  const patchSettings = useAppStore((s) => s.patchSettings);
  const error = useAppStore((s) => s.error);
  const t = useDisplayedTelemetry();
  const diagnostics = useDiagnostics();
  const live = connection === 'connected';
  const isScanning = connection === 'scanning';
  const isConnecting = connection === 'connecting';

  const [name, setName] = useState(settings.deviceAlias || t.deviceName);
  const [emptyV, setEmptyV] = useState(String(settings.emptyVoltage));
  const [fullV, setFullV] = useState(String(settings.fullVoltage));
  const [cap, setCap] = useState(String(settings.capacityMah));
  const [tempOff, setTempOff] = useState(String(settings.tempOffsetC));
  const [humOff, setHumOff] = useState(String(settings.humidityOffset));
  const [sea, setSea] = useState(String(settings.seaLevelHpa));
  const [busy, setBusy] = useState(false);

  const saveCalibration = useCallback(async () => {
    const next = {
      emptyVoltage: Number(emptyV) || settings.emptyVoltage,
      fullVoltage: Number(fullV) || settings.fullVoltage,
      capacityMah: Number(cap) || settings.capacityMah,
      tempOffsetC: Number(tempOff) || 0,
      humidityOffset: Number(humOff) || 0,
      seaLevelHpa: Number(sea) || 1013.25,
    };
    patchSettings(next);
    if (!live) return;
    setBusy(true);
    try {
      await sendCommand({
        cmd: 'cal_batt',
        emptyV: next.emptyVoltage,
        fullV: next.fullVoltage,
        cap: next.capacityMah,
      });
      await sendCommand({ cmd: 'cal_bme', sea: next.seaLevelHpa });
    } catch {
      // local offsets still apply
    }
    setBusy(false);
  }, [emptyV, fullV, cap, tempOff, humOff, sea, settings, patchSettings, live]);

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
        <div className="field">
          <label htmlFor="pack-name">Name</label>
          <input id="pack-name" value={name} onChange={(e) => setName(e.target.value)} />
          <button
            type="button"
            className="btn secondary btn-block"
            onClick={async () => {
              patchSettings({ deviceAlias: name });
              if (live) await sendCommand({ cmd: 'set_name', name });
            }}
          >
            Save Name
          </button>
        </div>
      </div>

      <p className="group-title">Units</p>
      <div className="group">
        <div className="cell">
          <span className="cell-label">Temperature</span>
          <Seg<TempUnit>
            value={settings.tempUnit}
            onChange={(tempUnit) => patchSettings({ tempUnit })}
            options={[
              { value: 'C', label: '°C' },
              { value: 'F', label: '°F' },
            ]}
          />
        </div>
        <div className="cell">
          <span className="cell-label">Pressure</span>
          <Seg<PressureUnit>
            value={settings.pressureUnit}
            onChange={(pressureUnit) => patchSettings({ pressureUnit })}
            options={[
              { value: 'hPa', label: 'hPa' },
              { value: 'inHg', label: 'inHg' },
            ]}
          />
        </div>
      </div>

      <p className="group-title">Battery calibration</p>
      <div className="group">
        <div className="cell">
          <span className="cell-label">Source</span>
          <Seg
            value={settings.useVoltageCurve ? 'curve' : 'device'}
            onChange={(value) => patchSettings({ useVoltageCurve: value === 'curve' })}
            options={[
              { value: 'device', label: 'Pack' },
              { value: 'curve', label: 'Voltage' },
            ]}
          />
        </div>
        <Field label="Empty voltage" value={emptyV} onChange={setEmptyV} suffix="V" />
        <Field label="Full voltage" value={fullV} onChange={setFullV} suffix="V" />
        <Field label="Capacity" value={cap} onChange={setCap} suffix="mAh" />
      </div>

      <p className="group-title">Sensor calibration</p>
      <div className="group">
        <Field label="Temperature offset" value={tempOff} onChange={setTempOff} suffix="°C" />
        <Field label="Humidity offset" value={humOff} onChange={setHumOff} suffix="%" />
        <Field label="Sea-level pressure" value={sea} onChange={setSea} suffix="hPa" />
        <button type="button" className="btn" disabled={busy} onClick={saveCalibration}>
          {busy ? 'Saving…' : 'Save Calibration'}
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

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="seg" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'on' : ''}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-row">
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" />
        <span className="suffix">{suffix}</span>
      </div>
    </div>
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

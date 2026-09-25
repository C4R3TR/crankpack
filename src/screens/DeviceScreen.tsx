import { useState } from 'react';
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
  const settings = useAppStore((s) => s.settings);
  const patchSettings = useAppStore((s) => s.patchSettings);
  const error = useAppStore((s) => s.error);
  const t = useDisplayedTelemetry();
  const diagnostics = useDiagnostics();
  const live = connection === 'connected';

  const [name, setName] = useState(settings.deviceAlias || t.deviceName);
  const [emptyV, setEmptyV] = useState(String(settings.emptyVoltage));
  const [fullV, setFullV] = useState(String(settings.fullVoltage));
  const [cap, setCap] = useState(String(settings.capacityMah));
  const [tempOff, setTempOff] = useState(String(settings.tempOffsetC));
  const [humOff, setHumOff] = useState(String(settings.humidityOffset));
  const [sea, setSea] = useState(String(settings.seaLevelHpa));
  const [busy, setBusy] = useState(false);

  const saveCalibration = async () => {
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
  };

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

import { useState } from 'react';

import { sendCommand } from '../ble/client';
import { Segmented } from '../Segmented';
import { defaultSettings, useAppStore } from '../store';
import type { PressureUnit, TempUnit } from '../types';

export function SettingsScreen() {
  const settings = useAppStore((s) => s.settings);
  const patchSettings = useAppStore((s) => s.patchSettings);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const connection = useAppStore((s) => s.connection);
  const live = connection === 'connected';

  const [name, setName] = useState(settings.deviceAlias);
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
      deviceAlias: name.trim(),
    };
    patchSettings(next);
    if (!live) return;
    setBusy(true);
    try {
      if (next.deviceAlias) await sendCommand({ cmd: 'set_name', name: next.deviceAlias });
      await sendCommand({
        cmd: 'cal_batt',
        emptyV: next.emptyVoltage,
        fullV: next.fullVoltage,
        cap: next.capacityMah,
      });
      await sendCommand({ cmd: 'cal_bme', sea: next.seaLevelHpa });
    } catch {
      // Local offsets still apply when the pack is out of range.
    }
    setBusy(false);
  };

  return (
    <section className="screen settings-sheet" aria-label="Settings">
      <div className="top">
        <h1 className="title">Settings</h1>
        <button type="button" className="text-btn" onClick={() => setSettingsOpen(false)}>
          Done
        </button>
      </div>

      <p className="group-title">Charts</p>
      <div className="group">
        <div className="cell cell-stack">
          <span className="cell-label">History</span>
          <Segmented
            label="Chart history"
            value={settings.chartWindow}
            onChange={(chartWindow) => patchSettings({ chartWindow })}
            options={[
              { value: '1m', label: '1 min' },
              { value: '5m', label: '5 min' },
              { value: '15m', label: '15 min' },
            ]}
          />
        </div>
      </div>

      <p className="group-title">Units</p>
      <div className="group">
        <div className="cell cell-stack">
          <span className="cell-label">Temperature</span>
          <Segmented<TempUnit>
            label="Temperature unit"
            value={settings.tempUnit}
            onChange={(tempUnit) => patchSettings({ tempUnit })}
            options={[
              { value: 'C', label: '°C' },
              { value: 'F', label: '°F' },
            ]}
          />
        </div>
        <div className="cell cell-stack">
          <span className="cell-label">Pressure</span>
          <Segmented<PressureUnit>
            label="Pressure unit"
            value={settings.pressureUnit}
            onChange={(pressureUnit) => patchSettings({ pressureUnit })}
            options={[
              { value: 'hPa', label: 'hPa' },
              { value: 'inHg', label: 'inHg' },
            ]}
          />
        </div>
      </div>

      <p className="group-title">Pack</p>
      <div className="group">
        <Field label="Name" value={name} onChange={setName} />
        <div className="cell cell-stack">
          <span className="cell-label">Charge source</span>
          <Segmented
            label="Charge source"
            value={settings.useVoltageCurve ? 'curve' : 'device'}
            onChange={(value) => patchSettings({ useVoltageCurve: value === 'curve' })}
            options={[
              { value: 'device', label: 'Pack' },
              { value: 'curve', label: 'Voltage' },
            ]}
          />
        </div>
        <Field label="Empty voltage" value={emptyV} onChange={setEmptyV} suffix="V" numeric />
        <Field label="Full voltage" value={fullV} onChange={setFullV} suffix="V" numeric />
        <Field label="Capacity" value={cap} onChange={setCap} suffix="mAh" numeric />
      </div>

      <p className="group-title">Sensors</p>
      <div className="group">
        <Field label="Temperature offset" value={tempOff} onChange={setTempOff} suffix="°C" numeric />
        <Field label="Humidity offset" value={humOff} onChange={setHumOff} suffix="%" numeric />
        <Field label="Sea-level pressure" value={sea} onChange={setSea} suffix="hPa" numeric />
        <button type="button" className="btn" disabled={busy} onClick={saveCalibration}>
          {busy ? 'Saving…' : 'Save Calibration'}
        </button>
      </div>

      <p className="group-title">Reset</p>
      <div className="group">
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            patchSettings(defaultSettings);
            setName('');
            setEmptyV(String(defaultSettings.emptyVoltage));
            setFullV(String(defaultSettings.fullVoltage));
            setCap(String(defaultSettings.capacityMah));
            setTempOff('0');
            setHumOff('0');
            setSea(String(defaultSettings.seaLevelHpa));
          }}
        >
          Restore Defaults
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  numeric?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-row">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={numeric ? 'decimal' : 'text'}
          autoComplete="off"
        />
        {suffix ? <span className="suffix">{suffix}</span> : null}
      </div>
    </div>
  );
}

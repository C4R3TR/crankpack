import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Segmented } from '@/src/components/Segmented';
import { useBleController } from '@/src/ble/useBle';
import { useAppStore, useDiagnostics, useDisplayedTelemetry } from '@/src/store';
import { colors, radius } from '@/src/theme';
import type { PressureUnit, TempUnit } from '@/src/types';

function Field({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholderTextColor={colors.faint}
          style={styles.input}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export default function DeviceScreen() {
  const connection = useAppStore((s) => s.connection);
  const devices = useAppStore((s) => s.devices);
  const settings = useAppStore((s) => s.settings);
  const patchSettings = useAppStore((s) => s.patchSettings);
  const error = useAppStore((s) => s.error);
  const bleReason = useAppStore((s) => s.bleReason);
  const telemetry = useDisplayedTelemetry();
  const diagnostics = useDiagnostics();
  const { scan, stopScan, connect, disconnect, enableDemo, sendCommand } = useBleController();

  const [name, setName] = useState(settings.deviceAlias || telemetry.deviceName);
  const [emptyV, setEmptyV] = useState(String(settings.emptyVoltage));
  const [fullV, setFullV] = useState(String(settings.fullVoltage));
  const [cap, setCap] = useState(String(settings.capacityMah));
  const [tempOff, setTempOff] = useState(String(settings.tempOffsetC));
  const [humOff, setHumOff] = useState(String(settings.humidityOffset));
  const [sea, setSea] = useState(String(settings.seaLevelHpa));
  const [busy, setBusy] = useState(false);

  const live = connection === 'connected';

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
    if (live) {
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
    }
  };

  return (
    <Screen>
      <ScreenHeader kicker="Electronics" title="Device" />

      <Card>
        <Text style={styles.section}>Bluetooth</Text>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <Text style={styles.body}>
            {connection === 'demo'
              ? 'Demo pack is on. Scan when your ESP32 is advertising as CrankPack.'
              : bleReason && connection !== 'connected'
                ? bleReason
                : 'Connect to the backpack over BLE.'}
          </Text>
        )}
        <View style={styles.actions}>
          {connection === 'connected' ? (
            <Button label="Disconnect" tone="danger" onPress={disconnect} />
          ) : connection === 'scanning' ? (
            <Button label="Stop scan" tone="ghost" onPress={stopScan} />
          ) : (
            <Button label="Scan for pack" onPress={scan} />
          )}
          {connection !== 'demo' ? (
            <Button label="Use demo pack" tone="ghost" onPress={enableDemo} />
          ) : null}
        </View>
      </Card>

      {devices.length ? (
        <Card>
          <Text style={styles.section}>Nearby</Text>
          {devices.map((device) => (
            <Pressable
              key={device.id}
              onPress={() => connect(device.id)}
              style={styles.deviceRow}>
              <View>
                <Text style={styles.deviceName}>
                  {device.name}
                  {device.isCrankPack ? '  · pack' : ''}
                </Text>
                <Text style={styles.meta}>{device.id}</Text>
              </View>
              <Text style={styles.rssi}>{device.rssi} dBm</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.section}>Pack</Text>
        <Text style={styles.meta}>Firmware {telemetry.firmware}</Text>
        <Text style={styles.meta}>Battery health {Math.round(telemetry.batteryHealth)}%</Text>
        <Text style={styles.meta}>
          RSSI {telemetry.rssi == null ? '—' : `${telemetry.rssi} dBm`}
        </Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Device name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="CrankPack"
            placeholderTextColor={colors.faint}
            style={styles.input}
          />
        </View>
        <Button
          label="Save name"
          tone="ghost"
          onPress={async () => {
            patchSettings({ deviceAlias: name });
            if (live) await sendCommand({ cmd: 'set_name', name });
          }}
        />
      </Card>

      <Card>
        <Text style={styles.section}>Units</Text>
        <Text style={styles.fieldLabel}>Temperature</Text>
        <Segmented<TempUnit>
          value={settings.tempUnit}
          onChange={(tempUnit) => patchSettings({ tempUnit })}
          options={[
            { value: 'C', label: '°C' },
            { value: 'F', label: '°F' },
          ]}
        />
        <View style={{ height: 12 }} />
        <Text style={styles.fieldLabel}>Pressure</Text>
        <Segmented<PressureUnit>
          value={settings.pressureUnit}
          onChange={(pressureUnit) => patchSettings({ pressureUnit })}
          options={[
            { value: 'hPa', label: 'hPa' },
            { value: 'inHg', label: 'inHg' },
          ]}
        />
      </Card>

      <Card>
        <Text style={styles.section}>Battery calibration</Text>
        <Segmented
          value={settings.useVoltageCurve ? 'curve' : 'device'}
          onChange={(value) => patchSettings({ useVoltageCurve: value === 'curve' })}
          options={[
            { value: 'device', label: 'Use pack %' },
            { value: 'curve', label: 'Voltage curve' },
          ]}
        />
        <Field label="Empty voltage" value={emptyV} onChange={setEmptyV} suffix="V" />
        <Field label="Full voltage" value={fullV} onChange={setFullV} suffix="V" />
        <Field label="Pack capacity" value={cap} onChange={setCap} suffix="mAh" />
      </Card>

      <Card>
        <Text style={styles.section}>Sensor calibration</Text>
        <Field label="Temperature offset" value={tempOff} onChange={setTempOff} suffix="°C" />
        <Field label="Humidity offset" value={humOff} onChange={setHumOff} suffix="%" />
        <Field label="Sea-level pressure" value={sea} onChange={setSea} suffix="hPa" />
        <Button
          label={busy ? 'Saving…' : 'Save calibration'}
          disabled={busy}
          onPress={saveCalibration}
        />
      </Card>

      <Card>
        <Text style={styles.section}>Sensor diagnostics</Text>
        <Text style={styles.body}>{diagnostics.message}</Text>
        <Text style={styles.meta}>Packets {diagnostics.packets}</Text>
        <Text style={styles.meta}>
          Last packet {diagnostics.lastPacketAgeMs < 0 ? '—' : `${Math.round(diagnostics.lastPacketAgeMs / 1000)}s ago`}
        </Text>
        <Text style={styles.meta}>BME280 {diagnostics.bmeOk ? 'OK' : 'check wiring'}</Text>
        <Text style={styles.meta}>Battery sense {diagnostics.batteryOk ? 'OK' : 'check divider'}</Text>
        <Text style={styles.meta}>Link {diagnostics.bleOk ? 'OK' : 'down'}</Text>
        {live ? (
          <View style={{ marginTop: 12 }}>
            <Button label="Request pack diagnostics" tone="ghost" onPress={() => sendCommand({ cmd: 'diag' })} />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    color: colors.muted,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  body: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  error: { color: colors.danger, marginBottom: 10 },
  actions: { gap: 10 },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  deviceName: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4, fontFamily: 'SpaceMono', fontSize: 13 },
  rssi: { color: colors.amber, fontFamily: 'SpaceMono' },
  field: { marginTop: 12 },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'SpaceMono',
    fontSize: 16,
  },
  suffix: { color: colors.muted, width: 48, textAlign: 'right' },
});

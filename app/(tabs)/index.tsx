import { StyleSheet, View } from 'react-native';

import { BatteryRing } from '@/src/components/BatteryRing';
import { Button } from '@/src/components/Button';
import { Card, MetricTile } from '@/src/components/Card';
import { CrankMeter } from '@/src/components/CrankMeter';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAppStore, useDisplayedTelemetry } from '@/src/store';
import { colors } from '@/src/theme';

export default function PowerScreen() {
  const telemetry = useDisplayedTelemetry();
  const connection = useAppStore((s) => s.connection);
  const setDemoCranking = useAppStore((s) => s.setDemoCranking);
  const remainingAh = telemetry.remainingMah / 1000;
  const remainingWh = remainingAh * telemetry.batteryV;

  return (
    <Screen>
      <ScreenHeader kicker="CrankPack" title="Power" />

      <BatteryRing pct={telemetry.batteryPct} volts={telemetry.batteryV} />

      <Card accent={telemetry.charging ? colors.lime : undefined}>
        <CrankMeter watts={telemetry.crankW} charging={telemetry.charging} />
        {connection === 'demo' ? (
          <View style={{ marginTop: 16 }}>
            <Button
              label="Hold to crank"
              onPressIn={() => setDemoCranking(true)}
              onPressOut={() => setDemoCranking(false)}
            />
          </View>
        ) : null}
      </Card>

      <View style={styles.grid}>
        <MetricTile
          label="Hand crank"
          value={telemetry.crankA.toFixed(2)}
          unit="A"
          hint={`${telemetry.crankW.toFixed(1)} W generated`}
          accent={colors.amber}
        />
        <MetricTile
          label="USB output"
          value={telemetry.usbW.toFixed(1)}
          unit="W"
          hint={`${telemetry.usbA.toFixed(2)} A at 5 V`}
          accent={colors.sky}
        />
      </View>

      <MetricTile
        label="Estimated remaining"
        value={remainingAh.toFixed(2)}
        unit="Ah"
        hint={`${remainingWh.toFixed(1)} Wh left in the pack`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 12 },
});

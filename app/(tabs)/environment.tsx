import { StyleSheet, Text, View } from 'react-native';

import { Card, MetricTile } from '@/src/components/Card';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Sparkline } from '@/src/components/Sparkline';
import { useAppStore, useDisplayedTelemetry } from '@/src/store';
import { colors } from '@/src/theme';
import {
  displayPressure,
  displayTemp,
  pressureSuffix,
  pressureTrend,
  tempSuffix,
} from '@/src/units';

const trendLabel = {
  rising: 'Rising — weather likely improving',
  falling: 'Falling — change possible',
  steady: 'Steady',
};

export default function EnvironmentScreen() {
  const telemetry = useDisplayedTelemetry();
  const settings = useAppStore((s) => s.settings);
  const history = useAppStore((s) => s.history);
  const trend = pressureTrend(history);

  return (
    <Screen>
      <ScreenHeader kicker="BME280" title="Environment" />

      <View style={styles.hero}>
        <Text style={styles.heroValue}>
          {displayTemp(telemetry.temperatureC, settings.tempUnit).toFixed(1)}
          {tempSuffix(settings.tempUnit)}
        </Text>
        <Text style={styles.heroLabel}>Temperature</Text>
      </View>

      <View style={styles.grid}>
        <MetricTile
          label="Atmospheric pressure"
          value={displayPressure(telemetry.pressureHpa, settings.pressureUnit).toFixed(
            settings.pressureUnit === 'inHg' ? 2 : 0
          )}
          unit={pressureSuffix(settings.pressureUnit)}
          hint={trendLabel[trend]}
          accent={colors.sky}
        />
        <MetricTile
          label="Humidity"
          value={Math.round(telemetry.humidityPct).toString()}
          unit="%"
          accent={colors.teal}
        />
      </View>

      <MetricTile
        label="Estimated altitude"
        value={Math.round(telemetry.altitudeM).toString()}
        unit="m"
        hint={`Sea-level set to ${settings.seaLevelHpa.toFixed(1)} hPa`}
      />

      <Card>
        <Sparkline
          label="Temperature history"
          color={colors.amber}
          values={history.map((p) => displayTemp(p.temperatureC, settings.tempUnit))}
        />
      </Card>
      <Card>
        <Sparkline
          label="Pressure history"
          color={colors.sky}
          values={history.map((p) => displayPressure(p.pressureHpa, settings.pressureUnit))}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: 8 },
  heroValue: {
    color: colors.text,
    fontSize: 56,
    fontFamily: 'SpaceMono',
    fontWeight: '700',
  },
  heroLabel: {
    color: colors.muted,
    fontSize: 16,
    marginTop: 4,
  },
  grid: { flexDirection: 'row', gap: 12 },
});

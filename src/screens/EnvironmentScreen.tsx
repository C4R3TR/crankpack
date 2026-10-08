import { useMemo, useState } from 'react';

import { Chart, ChartRange, useChartSlice } from '../Chart';
import { Header } from './PowerScreen';
import { Segmented } from '../Segmented';
import { useAppStore, useDisplayedTelemetry } from '../store';
import {
  displayPressure,
  displayTemp,
  pressureSuffix,
  pressureTrend,
  tempSuffix,
} from '../units';

const trendLabel = {
  rising: 'Pressure rising',
  falling: 'Pressure falling',
  steady: 'Pressure steady',
};

type Metric = 'temp' | 'pressure' | 'humidity' | 'altitude';

export function EnvironmentScreen() {
  const t = useDisplayedTelemetry();
  const settings = useAppStore((s) => s.settings);
  const series = useChartSlice();
  const trend = pressureTrend(series);
  const [metric, setMetric] = useState<Metric>('temp');
  const times = useMemo(() => series.map((point) => point.t), [series]);
  const tempUnit = tempSuffix(settings.tempUnit);
  const pressureUnit = pressureSuffix(settings.pressureUnit);

  const chart = useMemo(() => {
    if (metric === 'temp') {
      return {
        label: 'Temperature',
        unit: tempUnit,
        decimals: 1,
        values: series.map((point) => displayTemp(point.temperatureC, settings.tempUnit)),
      };
    }
    if (metric === 'pressure') {
      return {
        label: 'Pressure',
        unit: ` ${pressureUnit}`,
        decimals: settings.pressureUnit === 'inHg' ? 2 : 0,
        values: series.map((point) => displayPressure(point.pressureHpa, settings.pressureUnit)),
      };
    }
    if (metric === 'humidity') {
      return {
        label: 'Humidity',
        unit: '%',
        decimals: 0,
        values: series.map((point) => point.humidityPct),
        domain: { min: 0, max: 100 },
      };
    }
    return {
      label: 'Altitude',
      unit: ' m',
      decimals: 0,
      values: series.map((point) => point.altitudeM),
    };
  }, [metric, series, settings.tempUnit, settings.pressureUnit, tempUnit, pressureUnit]);

  const hero =
    metric === 'temp'
      ? { value: displayTemp(t.temperatureC, settings.tempUnit).toFixed(1), unit: tempUnit, note: `Outside · ${trendLabel[trend]}` }
      : metric === 'pressure'
        ? {
            value: displayPressure(t.pressureHpa, settings.pressureUnit).toFixed(settings.pressureUnit === 'inHg' ? 2 : 0),
            unit: pressureUnit,
            note: trendLabel[trend],
          }
        : metric === 'humidity'
          ? { value: Math.round(t.humidityPct).toString(), unit: '%', note: 'Relative humidity' }
          : { value: Math.round(t.altitudeM).toString(), unit: 'm', note: 'From the pack sensor' };

  return (
    <section className="screen">
      <Header title="Weather" />

      <div className="hero">
        <div className="hero-value">
          {hero.value}
          <span>{hero.unit}</span>
        </div>
        <div className="hero-meta">{hero.note}</div>
      </div>

      <div className="chart-toolbar">
        <ChartRange />
      </div>
      <Segmented
        label="Weather chart"
        value={metric}
        onChange={setMetric}
        options={[
          { value: 'temp', label: 'Temp' },
          { value: 'pressure', label: 'Pressure' },
          { value: 'humidity', label: 'Humidity' },
          { value: 'altitude', label: 'Altitude' },
        ]}
      />

      <div className="group group-pad chart-card">
        <Chart
          label={chart.label}
          values={chart.values}
          times={times}
          unit={chart.unit}
          decimals={chart.decimals}
          domain={'domain' in chart ? chart.domain : undefined}
        />
      </div>

      <div className="stats">
        <div className="stat">
          <strong>
            {displayTemp(t.temperatureC, settings.tempUnit).toFixed(1)}
            <em>{tempUnit}</em>
          </strong>
          <span>Temp</span>
        </div>
        <div className="stat">
          <strong>
            {displayPressure(t.pressureHpa, settings.pressureUnit).toFixed(settings.pressureUnit === 'inHg' ? 2 : 0)}
            <em>{pressureUnit}</em>
          </strong>
          <span>Pressure</span>
        </div>
        <div className="stat">
          <strong>
            {Math.round(t.humidityPct)}
            <em>%</em>
          </strong>
          <span>Humidity</span>
        </div>
      </div>
    </section>
  );
}

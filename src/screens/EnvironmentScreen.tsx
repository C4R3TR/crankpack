import { Header } from './PowerScreen';
import { useAppStore, useDisplayedTelemetry } from '../store';
import {
  displayPressure,
  displayTemp,
  pressureSuffix,
  pressureTrend,
  tempSuffix,
} from '../units';
import { Chart } from '../Chart';

const trendLabel = {
  rising: 'Pressure rising',
  falling: 'Pressure falling',
  steady: 'Pressure steady',
};

export function EnvironmentScreen() {
  const t = useDisplayedTelemetry();
  const settings = useAppStore((s) => s.settings);
  const history = useAppStore((s) => s.history);
  const trend = pressureTrend(history);
  const temp = displayTemp(t.temperatureC, settings.tempUnit);

  return (
    <section className="screen">
      <Header title="Weather" />

      <div className="hero">
        <div className="hero-value">
          {temp.toFixed(1)}
          <span>{tempSuffix(settings.tempUnit)}</span>
        </div>
        <div className="hero-meta">Outside · {trendLabel[trend]}</div>
      </div>

      <div className="group group-pad">
        <Chart
          label="Temperature"
          values={history.map((p) => displayTemp(p.temperatureC, settings.tempUnit))}
          unit={tempSuffix(settings.tempUnit)}
        />
      </div>
      <div className="group group-pad">
        <Chart
          label="Pressure"
          values={history.map((p) => displayPressure(p.pressureHpa, settings.pressureUnit))}
          unit={` ${pressureSuffix(settings.pressureUnit)}`}
          decimals={settings.pressureUnit === 'inHg' ? 2 : 0}
        />
      </div>
      <div className="group group-pad">
        <Chart label="Humidity" values={history.map((p) => p.humidityPct)} unit="%" decimals={0} />
      </div>
      <div className="group group-pad">
        <Chart label="Altitude" values={history.map((p) => p.altitudeM)} unit=" m" decimals={0} />
      </div>
    </section>
  );
}

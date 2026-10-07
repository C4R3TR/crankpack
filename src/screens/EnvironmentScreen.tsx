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
import { ConnectionBanner } from '../components/ConnectionBanner';

const trendLabel = {
  rising: 'Pressure rising',
  falling: 'Pressure falling',
  steady: 'Pressure steady',
};

const trendIcon = {
  rising: '↑',
  falling: '↓',
  steady: '→',
};

export function EnvironmentScreen() {
  const t = useDisplayedTelemetry();
  const connection = useAppStore((s) => s.connection);
  const settings = useAppStore((s) => s.settings);
  const history = useAppStore((s) => s.history);
  const trend = pressureTrend(history);
  const temp = displayTemp(t.temperatureC, settings.tempUnit);
  const isLive = connection === 'connected' || connection === 'demo';

  return (
    <section className="screen">
      <Header title="Weather" />
      
      <ConnectionBanner />

      <div className="hero weather-hero">
        <div className="hero-value">
          {isLive ? temp.toFixed(1) : '—'}
          <span>{tempSuffix(settings.tempUnit)}</span>
        </div>
        <div className="hero-meta">
          {isLive ? (
            <>
              <span className={`trend-icon trend-${trend}`}>{trendIcon[trend]}</span>
              {trendLabel[trend]}
            </>
          ) : (
            'Connect to see weather'
          )}
        </div>
      </div>

      {isLive && (
        <div className="weather-stats stats">
          <div className="stat">
            <strong>{Math.round(t.humidityPct)}<em>%</em></strong>
            <span>Humidity</span>
          </div>
          <div className="stat">
            <strong>{displayPressure(t.pressureHpa, settings.pressureUnit).toFixed(settings.pressureUnit === 'inHg' ? 2 : 0)}<em>{pressureSuffix(settings.pressureUnit)}</em></strong>
            <span>Pressure</span>
          </div>
          <div className="stat">
            <strong>{Math.round(t.altitudeM)}<em>m</em></strong>
            <span>Altitude</span>
          </div>
        </div>
      )}

      <div className="group group-pad">
        <Chart
          label="Temperature"
          values={history.map((p) => displayTemp(p.temperatureC, settings.tempUnit))}
          unit={tempSuffix(settings.tempUnit)}
          emptyText="Connect to see temperature trends"
        />
      </div>
      <div className="group group-pad">
        <Chart
          label="Pressure"
          values={history.map((p) => displayPressure(p.pressureHpa, settings.pressureUnit))}
          unit={` ${pressureSuffix(settings.pressureUnit)}`}
          decimals={settings.pressureUnit === 'inHg' ? 2 : 0}
          emptyText="Connect to see pressure trends"
        />
      </div>
      <div className="group group-pad">
        <Chart 
          label="Humidity" 
          values={history.map((p) => p.humidityPct)} 
          unit="%" 
          decimals={0}
          emptyText="Connect to see humidity trends"
        />
      </div>
      <div className="group group-pad">
        <Chart 
          label="Altitude" 
          values={history.map((p) => p.altitudeM)} 
          unit=" m" 
          decimals={0}
          emptyText="Connect to see altitude trends"
        />
      </div>
    </section>
  );
}

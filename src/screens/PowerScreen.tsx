import { useEffect, useMemo, useState } from 'react';

import { Chart, ChartRange, useChartSlice } from '../Chart';
import { Segmented } from '../Segmented';
import { useAppStore, useDisplayedTelemetry } from '../store';
import { crankHint } from '../units';

export function PowerScreen() {
  const t = useDisplayedTelemetry();
  const connection = useAppStore((s) => s.connection);
  const series = useChartSlice();
  const setDemoCranking = useAppStore((s) => s.setDemoCranking);
  const [metric, setMetric] = useState<'crank' | 'level'>('crank');
  const remainingAh = t.remainingMah / 1000;
  const low = t.batteryPct < 20;
  const times = useMemo(() => series.map((point) => point.t), [series]);
  const crank = useMemo(() => series.map((point) => point.crankW), [series]);
  const level = useMemo(() => series.map((point) => point.batteryPct), [series]);
  const crankMax = Math.max(12, ...crank, 0);

  return (
    <section className="screen">
      <Header title="Power" />

      <div className="power-hero">
        <BatteryDial pct={t.batteryPct} />
      </div>
      <div className="hero-meta hero-meta-center">
        {t.charging ? 'Charging the pack' : low ? 'Low — crank to charge' : 'Ready to crank'}
      </div>

      <div className="stats">
        <div className="stat">
          <strong>{t.crankW.toFixed(1)} W</strong>
          <span>Crank</span>
        </div>
        <div className="stat">
          <strong>{t.batteryV.toFixed(2)} V</strong>
          <span>Pack</span>
        </div>
        <div className="stat">
          <strong>{remainingAh.toFixed(2)} Ah</strong>
          <span>Left</span>
        </div>
      </div>

      <div className="chart-toolbar">
        <ChartRange />
        <Segmented
          label="Power chart"
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'crank', label: 'Crank' },
            { value: 'level', label: 'Level' },
          ]}
        />
      </div>
      <div className="group group-pad">
        {metric === 'crank' ? (
          <Chart
            label="Crank power"
            values={crank}
            times={times}
            unit=" W"
            tone="live"
            domain={{ min: 0, max: crankMax }}
            emptyText="Crank to start the trace"
          />
        ) : (
          <Chart
            label="Pack level"
            values={level}
            times={times}
            unit="%"
            decimals={0}
            domain={{ min: 0, max: 100 }}
            emptyText="Waiting for samples"
          />
        )}
      </div>

      {connection === 'demo' ? (
        <div className="group">
          <div className="group-pad">
            <div className="meter">
              <span style={{ width: `${Math.min(100, (t.crankW / 12) * 100)}%` }} />
            </div>
            <p className="hint">{crankHint(t.crankW, t.charging)}</p>
          </div>
          <button
            type="button"
            className={`btn ${t.charging ? 'charging' : ''}`}
            onPointerDown={() => setDemoCranking(true)}
            onPointerUp={() => setDemoCranking(false)}
            onPointerCancel={() => setDemoCranking(false)}
            onPointerLeave={() => setDemoCranking(false)}
          >
            Hold to Crank
          </button>
        </div>
      ) : null}

      <div className="group">
        <div className="cell">
          <span className="cell-label">Crank current</span>
          <span className="cell-value strong">{t.crankA.toFixed(2)} A</span>
        </div>
        <div className="cell">
          <span className="cell-label">USB output</span>
          <span className="cell-value strong">{t.usbW.toFixed(1)} W</span>
        </div>
        <div className="cell">
          <span className="cell-label">USB current</span>
          <span className="cell-value">{t.usbA.toFixed(2)} A</span>
        </div>
      </div>
    </section>
  );
}

function BatteryDial({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  // Start at zero on the first paint so the CSS transition on stroke-dashoffset
  // sweeps the arc up to the real level.
  const [swept, setSwept] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSwept(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const offset = c * (1 - (swept ? clamped : 0) / 100);
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const a = ((i / 36) * 360 - 90) * (Math.PI / 180);
    const inner = i % 3 === 0 ? 62 : 64;
    return {
      x1: 70 + Math.cos(a) * inner,
      y1: 70 + Math.sin(a) * inner,
      x2: 70 + Math.cos(a) * 67,
      y2: 70 + Math.sin(a) * 67,
    };
  });
  return (
    <svg className="dial" viewBox="0 0 140 140" role="img" aria-label={`Pack ${Math.round(clamped)} percent`}>
      {ticks.map((tick, i) => (
        <line key={i} className="dial-tick" x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} />
      ))}
      <circle className="dial-track" cx="70" cy="70" r={r} />
      <circle
        className="dial-value"
        cx="70"
        cy="70"
        r={r}
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
      />
      <text className="dial-num" x="70" y="74" textAnchor="middle">
        {Math.round(clamped)}
      </text>
      <text className="dial-unit" x="70" y="92" textAnchor="middle">
        %
      </text>
    </svg>
  );
}

export function Header({ title }: { title: string }) {
  const connection = useAppStore((s) => s.connection);
  const t = useDisplayedTelemetry();
  const live = connection === 'connected' || connection === 'demo';
  const label =
    connection === 'connected'
      ? t.deviceName
      : connection === 'demo'
        ? 'Demo Pack'
        : connection === 'scanning'
          ? 'Scanning'
          : connection === 'connecting'
            ? 'Connecting'
            : 'Offline';
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  return (
    <div className="top">
      <h1 className="title">{title}</h1>
      <div className="top-actions">
        <div className={`status-text ${live ? 'live' : ''}`}>{label}</div>
        <button type="button" className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h16M4 16h16" />
            <circle cx="9" cy="8" r="2.2" />
            <circle cx="15" cy="16" r="2.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

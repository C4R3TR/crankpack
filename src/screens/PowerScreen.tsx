import { useEffect, useState, useCallback } from 'react';

import { useAppStore, useDisplayedTelemetry } from '../store';
import { crankHint } from '../units';
import { Chart } from '../Chart';
import { ConnectionBanner } from '../components/ConnectionBanner';

export function PowerScreen() {
  const t = useDisplayedTelemetry();
  const connection = useAppStore((s) => s.connection);
  const history = useAppStore((s) => s.history);
  const setDemoCranking = useAppStore((s) => s.setDemoCranking);
  const remainingAh = t.remainingMah / 1000;
  const low = t.batteryPct < 20;
  const charging = t.charging || t.crankW > 0.5;
  const isLive = connection === 'connected' || connection === 'demo';

  const statusMessage = charging
    ? 'Charging the pack'
    : low
      ? 'Low — crank to charge'
      : 'Ready to crank';

  return (
    <section className="screen">
      <Header title="Power" />
      
      <ConnectionBanner />

      <div className="power-hero">
        <BatteryDial pct={t.batteryPct} charging={charging} />
      </div>
      <div className={`hero-meta power-status ${charging ? 'charging' : ''}`}>
        {isLive ? statusMessage : 'Connect to see status'}
      </div>

      <div className="stats">
        <div className={`stat ${charging ? 'live' : ''}`}>
          <strong>{t.crankW.toFixed(1)}<em>W</em></strong>
          <span>Crank</span>
        </div>
        <div className="stat">
          <strong>{t.batteryV.toFixed(2)}<em>V</em></strong>
          <span>Pack</span>
        </div>
        <div className="stat">
          <strong>{remainingAh.toFixed(2)}<em>Ah</em></strong>
          <span>Left</span>
        </div>
      </div>

      {connection === 'demo' ? (
        <CrankDemo 
          crankW={t.crankW} 
          charging={charging} 
          setDemoCranking={setDemoCranking} 
        />
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

      <div className="group group-pad">
        <Chart
          label="Crank power"
          values={history.map((p) => p.crankW)}
          unit=" W"
          tone="live"
          emptyText="Crank to start the trace"
        />
      </div>

      <div className="group group-pad">
        <Chart
          label="Pack level"
          values={history.map((p) => p.batteryPct)}
          unit="%"
          decimals={0}
          emptyText="Waiting for samples"
        />
      </div>
    </section>
  );
}

function CrankDemo({ 
  crankW, 
  charging, 
  setDemoCranking 
}: { 
  crankW: number; 
  charging: boolean; 
  setDemoCranking: (on: boolean) => void;
}) {
  const [pressed, setPressed] = useState(false);
  const powerPct = Math.min(100, (crankW / 12) * 100);
  
  const handleDown = useCallback(() => {
    setPressed(true);
    setDemoCranking(true);
  }, [setDemoCranking]);
  
  const handleUp = useCallback(() => {
    setPressed(false);
    setDemoCranking(false);
  }, [setDemoCranking]);

  return (
    <div className="crank-demo group">
      <div className="group-pad">
        <div className="crank-meter">
          <div className="crank-meter-track">
            <div 
              className={`crank-meter-fill ${charging ? 'active' : ''}`}
              style={{ width: `${powerPct}%` }} 
            />
          </div>
          <div className="crank-meter-labels">
            <span>0W</span>
            <span className="crank-meter-current">{crankW.toFixed(1)}W</span>
            <span>12W</span>
          </div>
        </div>
        <p className="crank-hint">{crankHint(crankW, charging)}</p>
      </div>
      <button
        type="button"
        className={`crank-btn ${pressed ? 'pressed' : ''} ${charging ? 'charging' : ''}`}
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onPointerLeave={handleUp}
      >
        <span className="crank-btn-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 5v2M12 17v2M5 12h2M17 12h2" />
          </svg>
        </span>
        <span className="crank-btn-text">Hold to Crank</span>
      </button>
    </div>
  );
}

function BatteryDial({ pct, charging }: { pct: number; charging: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const [swept, setSwept] = useState(false);
  
  useEffect(() => {
    const id = requestAnimationFrame(() => setSwept(true));
    return () => cancelAnimationFrame(id);
  }, []);
  
  const offset = c * (1 - (swept ? clamped : 0) / 100);
  const low = clamped < 20;
  
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
    <svg 
      className={`dial ${charging ? 'dial-charging' : ''} ${low ? 'dial-low' : ''}`} 
      viewBox="0 0 140 140" 
      role="img" 
      aria-label={`Pack ${Math.round(clamped)} percent${charging ? ', charging' : ''}`}
    >
      {ticks.map((tick, i) => (
        <line key={i} className="dial-tick" x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} />
      ))}
      <circle className="dial-track" cx="70" cy="70" r={r} />
      <circle
        className={`dial-value ${charging ? 'dial-value-charging' : ''}`}
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
        {charging ? '⚡' : '%'}
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
  return (
    <div className="top">
      <h1 className="title">{title}</h1>
      <div className={`status-text ${live ? 'live' : ''}`}>{label}</div>
    </div>
  );
}

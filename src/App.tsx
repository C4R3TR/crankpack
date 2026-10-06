import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import { PowerScreen } from './screens/PowerScreen';
import { EnvironmentScreen } from './screens/EnvironmentScreen';
import { HikeScreen } from './screens/HikeScreen';
import { DeviceScreen } from './screens/DeviceScreen';
import { createDemoTelemetry } from './sim/simulator';
import { useAppStore } from './store';

type Tab = 'power' | 'environment' | 'hike' | 'device';

export function App() {
  const [tab, setTab] = useState<Tab>('power');
  const hydrate = useAppStore((s) => s.hydrate);
  const connection = useAppStore((s) => s.connection);
  const demoCranking = useAppStore((s) => s.demoCranking);
  const ingestTelemetry = useAppStore((s) => s.ingestTelemetry);
  const setBleMeta = useAppStore((s) => s.setBleMeta);

  useEffect(() => {
    hydrate();
    const native = Capacitor.isNativePlatform();
    const webBle = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    setBleMeta(
      native || webBle,
      native
        ? 'Ready to scan for CrankPack over BLE.'
        : 'Use Demo Pack here, or run npm run cap:ios and open the app from Xcode.'
    );

    const applyAppearance = (dark: boolean) => {
      if (!native) return;
      StatusBar.setStyle({ style: dark ? Style.Light : Style.Dark }).catch(() => {});
    };
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    applyAppearance(mq.matches);
    const onChange = () => applyAppearance(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [hydrate, setBleMeta]);

  useEffect(() => {
    if (connection !== 'demo') return;
    
    const updateInterval = 250;
    const dtSec = updateInterval / 1000;
    
    const getPrev = () => {
      const state = useAppStore.getState();
      return state.rawTelemetry.timestamp ? state.rawTelemetry : null;
    };
    
    ingestTelemetry(createDemoTelemetry(getPrev(), demoCranking, dtSec));
    
    const id = window.setInterval(() => {
      ingestTelemetry(createDemoTelemetry(getPrev(), demoCranking, dtSec));
    }, updateInterval);
    
    return () => window.clearInterval(id);
  }, [connection, demoCranking, ingestTelemetry]);

  return (
    <div className="shell">
      <div className="pane">
        {tab === 'power' ? <PowerScreen /> : null}
        {tab === 'environment' ? <EnvironmentScreen /> : null}
        {tab === 'hike' ? <HikeScreen /> : null}
        {tab === 'device' ? <DeviceScreen /> : null}
      </div>
      <nav className="tabs" aria-label="Sections">
        <TabButton id="power" label="Power" current={tab} onClick={setTab} icon="battery" />
        <TabButton id="environment" label="Weather" current={tab} onClick={setTab} icon="thermo" />
        <TabButton id="hike" label="Hike" current={tab} onClick={setTab} icon="trail" />
        <TabButton id="device" label="Device" current={tab} onClick={setTab} icon="gear" />
      </nav>
    </div>
  );
}

function TabButton({
  id,
  label,
  current,
  onClick,
  icon,
}: {
  id: Tab;
  label: string;
  current: Tab;
  onClick: (id: Tab) => void;
  icon: 'battery' | 'thermo' | 'trail' | 'gear';
}) {
  const selected = current === id;
  return (
    <button
      type="button"
      className={selected ? 'on' : ''}
      onClick={() => onClick(id)}
      aria-current={selected ? 'page' : undefined}
    >
      <Icon name={icon} filled={selected} />
      {label}
    </button>
  );
}

function Icon({
  name,
  filled,
}: {
  name: 'battery' | 'thermo' | 'trail' | 'gear';
  filled: boolean;
}) {
  if (name === 'battery') {
    return (
      <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="7" width="16" height="10" rx="2" />
        <path d="M19 10h2v4h-2" fill={filled ? 'currentColor' : 'none'} />
        {filled ? null : <path d="M7 12h6" />}
      </svg>
    );
  }
  if (name === 'thermo') {
    return (
      <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <path d="M10 14V5a2 2 0 1 1 4 0v9" />
        <circle cx="12" cy="17" r="3.5" fill={filled ? 'currentColor' : 'none'} />
      </svg>
    );
  }
  if (name === 'trail') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? '2.2' : '1.8'}>
        <path d="M4 20c4-8 5-8 8-8s4 0 8 8" />
        <path d="M8 9l2 2 3-4 3 3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4" />
    </svg>
  );
}

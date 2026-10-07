import { useAppStore } from '../store';
import { scanForPack, enableDemo } from '../ble/client';

export function ConnectionBanner() {
  const connection = useAppStore((s) => s.connection);
  const bleAvailable = useAppStore((s) => s.bleAvailable);
  const error = useAppStore((s) => s.error);

  if (connection === 'connected' || connection === 'demo') {
    return null;
  }

  const isScanning = connection === 'scanning';
  const isConnecting = connection === 'connecting';

  return (
    <div className={`connection-banner ${error ? 'has-error' : ''}`}>
      <div className="connection-banner-content">
        {error ? (
          <>
            <div className="connection-icon error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <div className="connection-text">
              <span className="connection-title">Connection failed</span>
              <span className="connection-desc">{error}</span>
            </div>
          </>
        ) : isScanning || isConnecting ? (
          <>
            <div className="connection-icon scanning">
              <div className="spinner" />
            </div>
            <div className="connection-text">
              <span className="connection-title">
                {isScanning ? 'Searching for CrankPack' : 'Connecting'}
              </span>
              <span className="connection-desc">Make sure your pack is powered on</span>
            </div>
          </>
        ) : (
          <>
            <div className="connection-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12.55a11 11 0 0 1 14 0M8.5 16.05a6 6 0 0 1 7 0M12 20h.01" />
              </svg>
            </div>
            <div className="connection-text">
              <span className="connection-title">Pack not connected</span>
              <span className="connection-desc">Connect to see live data</span>
            </div>
          </>
        )}
      </div>
      
      {!isScanning && !isConnecting && (
        <div className="connection-actions">
          {bleAvailable && (
            <button type="button" className="connection-btn primary" onClick={() => scanForPack()}>
              Scan
            </button>
          )}
          <button type="button" className="connection-btn" onClick={() => enableDemo()}>
            Demo
          </button>
        </div>
      )}
    </div>
  );
}

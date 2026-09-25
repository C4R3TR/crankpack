import { useEffect, useMemo, useRef, useState } from 'react';

import type { GeoPoint } from '../types';
import type { Fix } from './location';

const FALLBACK = { lat: 54.9783, lng: -1.6178 };
const TILE = 256;
const MIN_ZOOM = 12;
const MAX_ZOOM = 18;

function lon2x(lon: number, z: number) {
  return ((lon + 180) / 360) * 2 ** z;
}

function lat2y(lat: number, z: number) {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** z;
}

function tileUrl(x: number, y: number, z: number) {
  const n = 2 ** z;
  const xx = ((x % n) + n) % n;
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${xx}`;
}

export function TrailMap({
  points,
  follow,
  home,
}: {
  points: GeoPoint[];
  follow: boolean;
  home: Fix | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const [size, setSize] = useState({ w: 390, h: 360 });
  const [zoom, setZoom] = useState(15);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const last = points[points.length - 1];
  const center = last ?? home ?? FALLBACK;
  const panned = pan.x !== 0 || pan.y !== 0;

  useEffect(() => {
    if (follow) setPan({ x: 0, y: 0 });
  }, [follow, center.lat, center.lng]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width && rect.height) setSize({ w: rect.width, h: rect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pan is stored in screen pixels, so it has to be rescaled when the zoom
  // level changes or the viewport would jump to a different place.
  const changeZoom = (next: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    setZoom((current) => {
      if (clamped === current) return current;
      const factor = 2 ** (clamped - current);
      setPan((p) => ({ x: p.x * factor, y: p.y * factor }));
      return clamped;
    });
  };

  const world = useMemo(() => {
    const cx = lon2x(center.lng, zoom);
    const cy = lat2y(center.lat, zoom);
    const originX = cx * TILE - size.w / 2 - pan.x;
    const originY = cy * TILE - size.h / 2 - pan.y;
    const minTx = Math.floor(originX / TILE);
    const maxTx = Math.floor((originX + size.w) / TILE);
    const minTy = Math.floor(originY / TILE);
    const maxTy = Math.floor((originY + size.h) / TILE);
    const tiles: { key: string; x: number; y: number; left: number; top: number }[] = [];
    const max = 2 ** zoom;
    for (let y = minTy; y <= maxTy; y += 1) {
      if (y < 0 || y >= max) continue;
      for (let x = minTx; x <= maxTx; x += 1) {
        tiles.push({
          key: `${zoom}:${x}:${y}`,
          x,
          y,
          left: x * TILE - originX,
          top: y * TILE - originY,
        });
      }
    }
    const path = points.map((p) => {
      const px = lon2x(p.lng, zoom) * TILE - originX;
      const py = lat2y(p.lat, zoom) * TILE - originY;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    });
    const here = {
      x: lon2x(center.lng, zoom) * TILE - originX,
      y: lat2y(center.lat, zoom) * TILE - originY,
    };
    return { tiles, path, here };
  }, [center.lat, center.lng, pan.x, pan.y, points, size.h, size.w, zoom]);

  return (
    <div
      className="trail-map"
      ref={wrapRef}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 1) {
          drag.current = { x: pan.x, y: pan.y, px: e.clientX, py: e.clientY };
        } else if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          drag.current = null;
          pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
        }
      }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch.current && pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch.current.dist > 0) {
            changeZoom(Math.round(pinch.current.zoom + Math.log2(dist / pinch.current.dist)));
          }
          return;
        }
        if (!drag.current) return;
        setPan({
          x: drag.current.x + (e.clientX - drag.current.px),
          y: drag.current.y + (e.clientY - drag.current.py),
        });
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        drag.current = null;
        pinch.current = null;
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        drag.current = null;
        pinch.current = null;
      }}
      onWheel={(e) => {
        e.preventDefault();
        changeZoom(zoom + (e.deltaY < 0 ? 1 : -1));
      }}
    >
      {world.tiles.map((tile) => (
        <img
          key={tile.key}
          className="map-tile"
          alt=""
          draggable={false}
          src={tileUrl(tile.x, tile.y, zoom)}
          style={{ transform: `translate(${tile.left}px, ${tile.top}px)` }}
        />
      ))}
      <svg className="map-overlay" viewBox={`0 0 ${size.w} ${size.h}`}>
        {world.path.length > 1 ? (
          <>
            <polyline className="map-path-casing" points={world.path.join(' ')} />
            <polyline className="map-path" points={world.path.join(' ')} />
          </>
        ) : null}
        <circle className="map-here-halo" cx={world.here.x} cy={world.here.y} r="11" />
        <circle className="map-here" cx={world.here.x} cy={world.here.y} r="6" />
      </svg>
      <div className="map-fade top" />
      <div className="map-fade bottom" />
      <div className="map-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => changeZoom(zoom + 1)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => changeZoom(zoom - 1)} aria-label="Zoom out">
          −
        </button>
        {panned ? (
          <button
            type="button"
            className="map-recenter"
            onClick={() => setPan({ x: 0, y: 0 })}
            aria-label="Recenter on my location"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2v3M12 19v3M2 12h3M19 12h3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </button>
        ) : null}
      </div>
      <div className="map-credit">Esri World Imagery</div>
    </div>
  );
}

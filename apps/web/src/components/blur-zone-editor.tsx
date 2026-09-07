'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { BlurZone } from './blurred-screenshot';

interface Props {
  src: string;
  zones: BlurZone[];
  onSave: (zones: BlurZone[]) => void;
  onCancel: () => void;
}

export function BlurZoneEditor({ src, zones: initial, onSave, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zones, setZones] = useState<BlurZone[]>(initial);
  const [drawing, setDrawing] = useState<{ startX: number; startY: number } | null>(null);
  const [current, setCurrent] = useState<BlurZone | null>(null);

  const toRelative = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = toRelative(e.clientX, e.clientY);
    setDrawing({ startX: pos.x, startY: pos.y });
    setCurrent(null);
  }, [toRelative]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing) return;
    const pos = toRelative(e.clientX, e.clientY);
    setCurrent({
      x: Math.min(drawing.startX, pos.x),
      y: Math.min(drawing.startY, pos.y),
      w: Math.abs(pos.x - drawing.startX),
      h: Math.abs(pos.y - drawing.startY),
    });
  }, [drawing, toRelative]);

  const handleMouseUp = useCallback(() => {
    if (current && current.w > 0.01 && current.h > 0.01) {
      setZones((prev) => [...prev, current]);
    }
    setDrawing(null);
    setCurrent(null);
  }, [current]);

  const removeZone = useCallback((index: number) => {
    setZones((prev) => prev.filter((_, i) => i !== index));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="flex flex-col items-center gap-4 max-w-[90vw] max-h-[90vh]">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/60">Click and drag to add blur zones</span>
          <span className="text-white/40">|</span>
          <span className="text-white/60">{zones.length} zone{zones.length !== 1 ? 's' : ''}</span>
        </div>

        <div
          ref={containerRef}
          className="relative cursor-crosshair select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img src={src} alt="Edit blur zones" className="max-w-full max-h-[70vh] rounded-xl" draggable={false} />

          {zones.map((z, i) => (
            <div
              key={i}
              className="absolute bg-black/80 border border-white/20 rounded flex items-center justify-center group"
              style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, width: `${z.w * 100}%`, height: `${z.h * 100}%` }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); removeZone(i); }}
                className="opacity-0 group-hover:opacity-100 bg-red-500/80 rounded-full p-1 transition-opacity"
                title="Remove zone"
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {current && (
            <div
              className="absolute bg-black/60 border-2 border-dashed border-white/40 rounded pointer-events-none"
              style={{ left: `${current.x * 100}%`, top: `${current.y * 100}%`, width: `${current.w * 100}%`, height: `${current.h * 100}%` }}
            />
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.1] transition-colors">
            Cancel
          </button>
          <button onClick={() => onSave(zones)} className="btn-brand px-5 py-2.5 text-sm">
            Save Blur Zones
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useRef, useEffect, useState } from 'react';

export type BlurZone = { x: number; y: number; w: number; h: number };

interface Props {
  src: string;
  zones: BlurZone[];
  alt: string;
  className?: string;
  onClick?: (e?: any) => void;
}

export function BlurredScreenshot({ src, zones, alt, className, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!src || zones.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setFallback(true); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      for (const z of zones) {
        const px = z.x * img.naturalWidth;
        const py = z.y * img.naturalHeight;
        const pw = z.w * img.naturalWidth;
        const ph = z.h * img.naturalHeight;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = `${Math.min(pw, ph) * 0.3}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', px + pw / 2, py + ph / 2);
      }
    };
    img.onerror = () => setFallback(true);
    img.src = src;
  }, [src, zones]);

  if (!zones || zones.length === 0 || fallback) {
    return <img src={src} alt={alt} className={className} onClick={onClick} />;
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      onClick={onClick}
      role="img"
      aria-label={alt}
      style={{ width: '100%', height: 'auto' }}
    />
  );
}

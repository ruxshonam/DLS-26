import React, { useEffect, useRef } from 'react';

interface RadarMapProps {
  radarData: {
    ball: { x: number; z: number };
    home: { x: number; z: number; controlled: boolean }[];
    away: { x: number; z: number; controlled: boolean }[];
  } | null;
  homeColor: string;
  awayColor: string;
}

export const RadarMap: React.FC<RadarMapProps> = ({ radarData, homeColor, awayColor }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !radarData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Pitch background
    ctx.fillStyle = 'rgba(6, 78, 59, 0.85)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.beginPath();
    ctx.moveTo(w / 2, 4);
    ctx.lineTo(w / 2, h - 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 16, 0, Math.PI * 2);
    ctx.stroke();

    const mapX = (x: number) => 4 + ((x + 52.5) / 105) * (w - 8);
    const mapY = (z: number) => 4 + ((z + 34) / 68) * (h - 8);

    // Home players
    radarData.home.forEach(p => {
      ctx.beginPath();
      ctx.arc(mapX(p.x), mapY(p.z), p.controlled ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = homeColor;
      ctx.fill();
      if (p.controlled) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // Away players
    radarData.away.forEach(p => {
      ctx.beginPath();
      ctx.arc(mapX(p.x), mapY(p.z), p.controlled ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = awayColor;
      ctx.fill();
      if (p.controlled) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // Ball
    ctx.beginPath();
    ctx.arc(mapX(radarData.ball.x), mapY(radarData.ball.z), 3.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fef08a';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [radarData, homeColor, awayColor]);

  return (
    <div className="rounded-xl overflow-hidden border border-white/25 shadow-2xl bg-slate-950/80 backdrop-blur-md">
      <canvas ref={canvasRef} width={186} height={116} className="block" />
    </div>
  );
};

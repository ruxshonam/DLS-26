import React, { useRef, useState } from 'react';
import { GameEngine } from '../game/gameEngine';

interface TouchControlsProps {
  engineRef: React.RefObject<GameEngine | null>;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ engineRef }) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [sprint, setSprint] = useState(false);

  const updateStick = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2 - 14;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });
    engineRef.current?.setTouchInput(dx / maxR, dy / maxR, sprint);
  };

  const resetStick = () => {
    setKnob({ x: 0, y: 0 });
    engineRef.current?.setTouchInput(0, 0, sprint);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex items-end justify-between px-4 sm:px-6 lg:hidden">
      {/* Virtual Left Joystick */}
      <div
        ref={padRef}
        onTouchStart={e => {
          if (e.touches[0]) updateStick(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchMove={e => {
          if (e.touches[0]) updateStick(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchEnd={resetStick}
        onTouchCancel={resetStick}
        className="pointer-events-auto relative w-28 h-28 rounded-full bg-slate-950/60 border-2 border-white/25 backdrop-blur-md flex items-center justify-center touch-none select-none"
      >
        <div
          className="w-11 h-11 rounded-full bg-sky-400/90 border-2 border-white shadow-lg"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Action Buttons (Right) */}
      <div className="pointer-events-auto grid grid-cols-3 gap-2 touch-none select-none">
        <button
          onTouchStart={() => {
            setSprint(true);
            engineRef.current?.setTouchInput(knob.x / 40, knob.y / 40, true);
          }}
          onTouchEnd={() => {
            setSprint(false);
            engineRef.current?.setTouchInput(knob.x / 40, knob.y / 40, false);
          }}
          className={`w-13 h-13 rounded-full text-[10px] font-black uppercase border shadow-lg ${
            sprint ? 'bg-amber-400 text-slate-950 border-white' : 'bg-slate-900/80 text-amber-300 border-amber-400/50'
          }`}
        >
          YUGUR
        </button>

        <button
          onTouchStart={() => engineRef.current?.triggerTouchAction('through')}
          className="w-13 h-13 rounded-full bg-indigo-600/85 active:scale-95 text-white text-[10px] font-black uppercase border border-white/30 shadow-lg"
        >
          Q PAS
        </button>

        <button
          onTouchStart={() => engineRef.current?.triggerTouchAction('switch')}
          className="w-13 h-13 rounded-full bg-slate-800/85 active:scale-95 text-slate-200 text-[10px] font-black uppercase border border-white/30 shadow-lg"
        >
          ALMASH
        </button>

        <button
          onTouchStart={() => engineRef.current?.triggerTouchAction('tackle')}
          className="w-13 h-13 rounded-full bg-rose-600/90 active:scale-95 text-white text-[10px] font-black uppercase border border-white/30 shadow-lg"
        >
          PODKAT
        </button>

        <button
          onTouchStart={() => engineRef.current?.triggerTouchAction('pass')}
          className="w-13 h-13 rounded-full bg-sky-600/90 active:scale-95 text-white text-xs font-black uppercase border border-white/30 shadow-lg"
        >
          PAS
        </button>

        <button
          onTouchStart={() => engineRef.current?.triggerTouchAction('shoot', 0.8)}
          className="w-14 h-14 rounded-full bg-emerald-500/95 active:scale-95 text-slate-950 text-xs font-black uppercase border-2 border-white shadow-xl"
        >
          ZARBA
        </button>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { PenaltyKickerState } from '../types/game';
import { Crosshair, ShieldAlert } from 'lucide-react';

interface PenaltyOverlayProps {
  penaltyState: PenaltyKickerState;
  homeName: string;
  awayName: string;
  onShoot: (aimX: number, aimY: number, power: number) => void;
}

export const PenaltyOverlay: React.FC<PenaltyOverlayProps> = ({
  penaltyState,
  homeName,
  awayName,
  onShoot,
}) => {
  const [aimX, setAimX] = useState(0);
  const [aimY, setAimY] = useState(0.35);
  const [power, setPower] = useState(0.75);

  useEffect(() => {
    if (penaltyState.turn !== 'home' || penaltyState.finished) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const s = (now - t0) / 1000;
      setAimX(Math.sin(s * 2.5) * 0.9);
      setAimY(0.2 + ((Math.cos(s * 1.9) + 1) / 2) * 0.65);
      setPower(0.55 + ((Math.sin(s * 3.1) + 1) / 2) * 0.42);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [penaltyState.turn, penaltyState.finished]);

  const renderDots = (results: ('goal' | 'miss' | 'pending')[]) => (
    <div className="flex items-center gap-1.5">
      {results.map((r, i) => (
        <span
          key={i}
          className={`w-3.5 h-3.5 rounded-full border ${
            r === 'goal'
              ? 'bg-emerald-400 border-emerald-200'
              : r === 'miss'
              ? 'bg-rose-500 border-rose-200'
              : 'bg-slate-800 border-slate-600'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-between py-20 px-4">
      {/* Top 5-Round Scoreboard */}
      <div className="pointer-events-auto rounded-2xl bg-slate-950/90 border border-slate-700 px-6 py-3 shadow-2xl flex flex-col items-center gap-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
          5 Martalik Penaltilar Seriyasi · Raund {penaltyState.round}/{penaltyState.maxRounds}
        </span>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1">
            <span className="font-athletic text-lg font-black text-white">{homeName} ({penaltyState.homeScore})</span>
            {renderDots(penaltyState.homeResults)}
          </div>
          <span className="text-slate-500 font-black">VS</span>
          <div className="flex flex-col items-start gap-1">
            <span className="font-athletic text-lg font-black text-white">{awayName} ({penaltyState.awayScore})</span>
            {renderDots(penaltyState.awayResults)}
          </div>
        </div>
      </div>

      {/* Bottom Aiming & Kick Control */}
      {!penaltyState.finished && (
        <div className="pointer-events-auto rounded-2xl bg-slate-950/90 border border-slate-700 p-4 shadow-2xl flex flex-col items-center gap-3 w-72">
          {penaltyState.turn === 'home' ? (
            <>
              <div className="w-full h-24 rounded-xl border-2 border-white/40 bg-emerald-950/50 relative overflow-hidden">
                <div
                  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 text-amber-400"
                  style={{
                    left: `${50 + aimX * 42}%`,
                    top: `${82 - aimY * 68}%`,
                  }}
                >
                  <Crosshair className="w-6 h-6" />
                </div>
              </div>
              <button
                onClick={() => onShoot(aimX, aimY, power)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-athletic text-lg font-black uppercase tracking-wider shadow-lg active:scale-95"
              >
                Penalti Tepish!
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 py-2 text-amber-300 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
              <span>Raqib penalti tepmoqda! (A / D bilan sakrang)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

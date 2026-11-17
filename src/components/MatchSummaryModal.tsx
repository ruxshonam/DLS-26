import React from 'react';
import { MatchStats, PenaltyKickerState, TeamData } from '../types/game';
import { Coins, Dumbbell, Home, Play, RotateCcw, Trophy, Wrench } from 'lucide-react';

interface MatchSummaryModalProps {
  type: 'halftime' | 'fulltime';
  homeTeam: TeamData;
  awayTeam: TeamData;
  stats: MatchStats;
  penaltyState?: PenaltyKickerState | null;
  matchReward?: { coins: number; fitsecPct: number; technacolPct: number } | null;
  onContinueSecondHalf?: () => void;
  onReplay: () => void;
  onBackToMenu: () => void;
}

export const MatchSummaryModal: React.FC<MatchSummaryModalProps> = ({
  type,
  homeTeam,
  awayTeam,
  stats,
  penaltyState,
  matchReward,
  onContinueSecondHalf,
  onReplay,
  onBackToMenu,
}) => {
  const totalPoss = Math.max(1, stats.homePossessionTime + stats.awayPossessionTime);
  const homePossPct = Math.round((stats.homePossessionTime / totalPoss) * 100);
  const awayPossPct = 100 - homePossPct;

  const homeWin =
    stats.homeScore > stats.awayScore ||
    (stats.homeScore === stats.awayScore && penaltyState?.winner === 'home');
  const awayWin =
    stats.awayScore > stats.homeScore ||
    (stats.homeScore === stats.awayScore && penaltyState?.winner === 'away');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div
          className={`px-6 py-4 text-center border-b border-slate-800 ${
            type === 'halftime'
              ? 'bg-slate-950'
              : homeWin
              ? 'bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950'
              : awayWin
              ? 'bg-gradient-to-r from-rose-950 via-red-900 to-rose-950'
              : 'bg-slate-950'
          }`}
        >
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
            {type === 'halftime' ? '1-Taym Yakuni · Tanaffus' : 'O\'yin Yakunlandi'}
          </span>
          {type === 'fulltime' && (
            <h2 className="font-athletic text-3xl font-black uppercase tracking-wider text-white mt-0.5 flex items-center justify-center gap-2">
              {homeWin && <Trophy className="w-6 h-6 text-amber-400" />}
              <span>{homeWin ? "G'ALABA!" : awayWin ? "MAG'LUBIYAT" : 'DURANG'}</span>
            </h2>
          )}
        </div>

        {/* Scoreline */}
        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="flex-1 text-center">
              <div className="font-athletic text-lg font-black uppercase text-white">{homeTeam.name}</div>
              {penaltyState?.finished && (
                <div className="text-xs text-amber-300 font-mono-numbers">Pen: {penaltyState.homeScore}</div>
              )}
            </div>
            <div className="px-5 font-mono-numbers text-4xl font-black text-white">
              {stats.homeScore} - {stats.awayScore}
            </div>
            <div className="flex-1 text-center">
              <div className="font-athletic text-lg font-black uppercase text-white">{awayTeam.name}</div>
              {penaltyState?.finished && (
                <div className="text-xs text-amber-300 font-mono-numbers">Pen: {penaltyState.awayScore}</div>
              )}
            </div>
          </div>

          {/* Match Stats Bars */}
          <div className="flex flex-col gap-2.5 text-xs">
            {[
              { label: "To'pga egalik (%)", h: `${homePossPct}%`, a: `${awayPossPct}%` },
              { label: 'Zarbalar (Aniq)', h: `${stats.homeShots} (${stats.homeShotsOnTarget})`, a: `${stats.awayShots} (${stats.awayShotsOnTarget})` },
              { label: 'Paslar', h: stats.homePasses, a: stats.awayPasses },
              { label: 'Podkatlar', h: stats.homeTackles, a: stats.awayTackles },
              { label: 'Burchak zarbalari', h: stats.homeCorners, a: stats.awayCorners },
              { label: 'Sariq / Qizil kartalar', h: `${stats.homeYellowCards} / ${stats.homeRedCards}`, a: `${stats.awayYellowCards} / ${stats.awayRedCards}` },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-950/60 border border-white/5">
                <span className="font-mono-numbers font-black text-sky-400 w-16 text-left">{row.h}</span>
                <span className="text-slate-400 font-bold text-center flex-1">{row.label}</span>
                <span className="font-mono-numbers font-black text-rose-400 w-16 text-right">{row.a}</span>
              </div>
            ))}
          </div>

          {/* Post-match Coin & Fitsec/Technacol Progress Reward */}
          {type === 'fulltime' && matchReward && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-wrap items-center justify-around gap-3 text-xs font-black">
              <div className="flex items-center gap-1.5 text-amber-300">
                <Coins className="w-4 h-4 fill-current" />
                <span>+{matchReward.coins.toLocaleString()} Koin</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300">
                <Dumbbell className="w-4 h-4" />
                <span>+{matchReward.fitsecPct}% Fitsec</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-300">
                <Wrench className="w-4 h-4" />
                <span>+{matchReward.technacolPct}% Technacol</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            {type === 'halftime' && onContinueSecondHalf ? (
              <button
                onClick={onContinueSecondHalf}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-athletic text-lg font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>2-Taymni Boshlash</span>
              </button>
            ) : (
              <>
                <button
                  onClick={onReplay}
                  className="flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-athletic text-lg font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Qayta O&apos;ynash</span>
                </button>
                <button
                  onClick={onBackToMenu}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-athletic text-lg font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-600"
                >
                  <Home className="w-4 h-4" />
                  <span>Bosh Menyu</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

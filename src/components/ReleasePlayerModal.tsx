import React from 'react';
import { PlayerData } from '../types/game';
import { getPlayerReleaseRewards } from '../data/clubEconomy';
import { DlsPlayerCard } from './DlsPlayerCard';
import { Coins, Dumbbell, Wrench, X } from 'lucide-react';

interface ReleasePlayerModalProps {
  player: PlayerData;
  clubTag: string;
  primaryColor: string;
  secondaryColor: string;
  onChoose: (choice: 'fitsec' | 'technacol' | 'coins') => void;
  onClose: () => void;
}

export const ReleasePlayerModal: React.FC<ReleasePlayerModalProps> = ({
  player,
  clubTag,
  primaryColor,
  secondaryColor,
  onChoose,
  onClose,
}) => {
  const { coinsValue, coachUnits } = getPlayerReleaseRewards(player.rating);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <h3 className="font-athletic text-xl font-black uppercase tracking-wider text-white">
            O&apos;yinchini Almashtirish / Sotish
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <DlsPlayerCard
            player={player}
            clubTag={clubTag}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            compact
          />

          <p className="text-xs text-slate-300 text-center font-medium">
            Bu o&apos;yinchini boshqa futbolchilarni kuchaytirish uchun <strong className="text-emerald-400">Fitsec</strong>, <strong className="text-sky-400">Technacol</strong> yoki <strong className="text-amber-400">Koin uchun</strong> sotasizmi?
          </p>

          <div className="flex flex-col gap-2.5">
            {/* Option 1: Fitsec */}
            <button
              onClick={() => onChoose('fitsec')}
              className="w-full p-3.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/50 hover:border-emerald-400 flex items-center justify-between transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-athletic text-lg font-black text-white uppercase tracking-wide group-hover:text-emerald-300">
                    Fitsec (Kuchaytirish uchun)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Tezlik va Jismoniy kuch oshiruvchi murabbiy
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-mono-numbers text-xs font-black whitespace-nowrap shrink-0">
                +{coachUnits} Fitsec
              </span>
            </button>

            {/* Option 2: Technacol */}
            <button
              onClick={() => onChoose('technacol')}
              className="w-full p-3.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/70 border border-sky-500/50 hover:border-sky-400 flex items-center justify-between transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-athletic text-lg font-black text-white uppercase tracking-wide group-hover:text-sky-300">
                    Technacol (Kuchaytirish uchun)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Zarba, Pas, Dribling va Himoyani oshiradi
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-sky-500 text-slate-950 font-mono-numbers text-xs font-black whitespace-nowrap shrink-0">
                +{coachUnits} Technacol
              </span>
            </button>

            {/* Option 3: Koin uchun */}
            <button
              onClick={() => onChoose('coins')}
              className="w-full p-3.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/50 hover:border-amber-400 flex items-center justify-between transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-athletic text-lg font-black text-white uppercase tracking-wide group-hover:text-amber-300">
                    Koin uchun (Tangaga sotish)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Tangalar hisobingizga darhol qo&apos;shiladi
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono-numbers text-xs font-black whitespace-nowrap shrink-0">
                +{coinsValue.toLocaleString()} Koin
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  CameraMode,
  FoulEvent,
  GameMode,
  MatchPlayMode,
  MatchStats,
  OutEvent,
  PlayerData,
  TeamData,
} from '../types/game';
import { RadarMap } from './RadarMap';
import {
  Camera,
  Mic,
  MicOff,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Home,
} from 'lucide-react';

interface ScoreboardHUDProps {
  homeTeam: TeamData;
  awayTeam: TeamData;
  stats: MatchStats;
  matchMinute: number;
  half: 1 | 2 | 'extra' | 'penalties' | 'ended';
  periodStatus: string;
  mode: GameMode;
  playMode: MatchPlayMode;
  powerMeter: number;
  controlledPlayer: PlayerData | null;
  p2ControlledPlayer: PlayerData | null;
  goalBanner: { scorer: string; teamName: string; isHome: boolean } | null;
  foulBanner: FoulEvent | null;
  outBanner: OutEvent | null;
  radarData: {
    ball: { x: number; z: number };
    home: { x: number; z: number; controlled: boolean }[];
    away: { x: number; z: number; controlled: boolean }[];
  } | null;
  showRadar: boolean;
  cameraMode: CameraMode;
  isSoundOn: boolean;
  isCommentaryMuted: boolean;
  isPaused: boolean;
  onToggleSound: () => void;
  onToggleCommentary: () => void;
  onCycleCamera: () => void;
  onTogglePause: () => void;
  onExitMatch: () => void;
}

export const ScoreboardHUD: React.FC<ScoreboardHUDProps> = ({
  homeTeam,
  awayTeam,
  stats,
  matchMinute,
  half,
  periodStatus,
  mode,
  playMode,
  powerMeter,
  controlledPlayer,
  p2ControlledPlayer,
  goalBanner,
  foulBanner,
  outBanner,
  radarData,
  showRadar,
  cameraMode,
  isSoundOn,
  isCommentaryMuted,
  isPaused,
  onToggleSound,
  onToggleCommentary,
  onCycleCamera,
  onTogglePause,
  onExitMatch,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Broadcast Scoreboard Bar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: Scoreboard Pill */}
        <div className="pointer-events-auto flex items-center rounded-xl overflow-hidden bg-slate-950/90 border border-white/15 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 px-3 py-2 border-r border-white/10">
            <span
              className="w-3 h-5 rounded-sm border border-white/30"
              style={{ backgroundColor: homeTeam.primaryColor }}
            />
            <span className="font-athletic text-base sm:text-lg font-black uppercase text-white tracking-wide">
              {homeTeam.shortName}
            </span>
          </div>

          <div className="px-3.5 py-1.5 bg-slate-900 flex items-center gap-2 font-mono-numbers text-xl sm:text-2xl font-black text-white">
            <span>{stats.homeScore}</span>
            <span className="text-slate-500 text-base">-</span>
            <span>{stats.awayScore}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 border-l border-white/10">
            <span className="font-athletic text-base sm:text-lg font-black uppercase text-white tracking-wide">
              {awayTeam.shortName}
            </span>
            <span
              className="w-3 h-5 rounded-sm border border-white/30"
              style={{ backgroundColor: awayTeam.primaryColor }}
            />
          </div>

          <div className="px-3 py-2 bg-emerald-600 text-slate-950 font-mono-numbers text-xs sm:text-sm font-black flex items-center gap-1.5">
            <span>{mode === 'training' ? 'MASHQ' : `${matchMinute}'`}</span>
            <span className="hidden sm:inline text-[10px] font-sans uppercase font-black bg-slate-950/20 px-1.5 py-0.5 rounded">
              {half === 'extra' ? 'QO\'SHIMCHA' : periodStatus}
            </span>
          </div>
        </div>

        {/* Right: Quick Action Controls (Sound, Commentary Mute, Camera, Pause, Exit) */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            onClick={onToggleCommentary}
            title={isCommentaryMuted ? 'Sharhlovchini yoqish' : 'Sharhlovchi ovozini o\'chirish'}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold border transition-all backdrop-blur-md whitespace-nowrap shrink-0 ${
              isCommentaryMuted
                ? 'bg-rose-950/85 text-rose-200 border-rose-500/40'
                : 'bg-slate-950/85 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {isCommentaryMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span className="hidden md:inline">{isCommentaryMuted ? 'Sharh: O\'chiq' : 'Sharhlovchi'}</span>
          </button>

          <button
            onClick={onToggleSound}
            title="Ovozni o'chirish/yoqish"
            className="p-2 rounded-lg bg-slate-950/85 border border-white/15 text-slate-200 hover:text-white backdrop-blur-md"
          >
            {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>

          <button
            onClick={onCycleCamera}
            title="Kamerani almashtirish"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-950/85 border border-white/15 text-slate-200 hover:text-white text-xs font-bold backdrop-blur-md whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline uppercase">{cameraMode.replace('_', ' ')}</span>
          </button>

          <button
            onClick={onTogglePause}
            title="Pauza"
            className="p-2 rounded-lg bg-slate-950/85 border border-white/15 text-slate-200 hover:text-white backdrop-blur-md"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={onExitMatch}
            title="Menyuga qaytish"
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-rose-950/85 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-bold backdrop-blur-md whitespace-nowrap shrink-0"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Chiqish</span>
          </button>
        </div>
      </div>

      {/* Center Broadcast Banners (GOAL / FOUL+CARD / AUT-BURCHAK) */}
      <div className="flex flex-col items-center justify-center gap-2">
        {goalBanner && (
          <div className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-[0_0_50px_rgba(250,204,21,0.75)] border-2 border-white animate-bounce text-center">
            <div className="font-athletic text-4xl sm:text-5xl font-black uppercase tracking-widest">
              GOOOOL!
            </div>
            <div className="text-xs sm:text-sm font-black uppercase tracking-wider">
              {goalBanner.teamName} · {goalBanner.scorer}
            </div>
          </div>
        )}

        {foulBanner && (
          <div className="px-5 py-2.5 rounded-xl bg-slate-950/95 border-2 border-amber-400 shadow-2xl flex items-center gap-3">
            {(foulBanner.type === 'yellow' || foulBanner.type === 'red') && (
              <span
                className={`w-4 h-6 rounded-sm border border-white/50 ${
                  foulBanner.type === 'yellow' ? 'bg-yellow-400' : 'bg-rose-600'
                }`}
              />
            )}
            <div className="text-xs font-black text-white uppercase tracking-wide">
              {foulBanner.type === 'penalty'
                ? `PENALTI! · ${foulBanner.playerName} (${foulBanner.teamName})`
                : foulBanner.type === 'red'
                ? `QIZIL KARTOCHKA! · ${foulBanner.playerName}`
                : foulBanner.type === 'yellow'
                ? `SARIQ KARTOCHKA · ${foulBanner.playerName}`
                : `JARIMA ZARBASI · ${foulBanner.teamName}`}
            </div>
          </div>
        )}

        {outBanner && (
          <div className="px-4 py-1.5 rounded-full bg-slate-950/90 border border-sky-400/60 text-xs font-black uppercase tracking-wider text-sky-300 shadow-lg">
            {outBanner.type === 'throw_in'
              ? `AUT (YON CHIZIQDAN) · ${outBanner.teamName}`
              : outBanner.type === 'corner'
              ? `BURCHAK ZARBASI (UGOL) · ${outBanner.teamName}`
              : `DARVOZADAN ZARBA · ${outBanner.teamName}`}
          </div>
        )}
      </div>

      {/* Bottom HUD: Player Name + Shot Power + Radar + Controls Hint */}
      <div className="hidden lg:flex items-end justify-between gap-4">
        {/* Bottom Left: Controlled Player & Power Meter */}
        <div className="flex flex-col gap-2">
          {controlledPlayer && (
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/90 border border-sky-500/40 backdrop-blur-md shadow-xl flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/40 font-mono-numbers font-black text-sm flex items-center justify-center">
                #{controlledPlayer.number}
              </span>
              <div>
                <div className="font-athletic text-base font-black text-white uppercase tracking-wide">
                  {controlledPlayer.name}
                </div>
                <div className="text-[10px] text-slate-400 font-bold">
                  {controlledPlayer.position} · {controlledPlayer.rating} OVR
                </div>
              </div>
            </div>
          )}

          {p2ControlledPlayer && playMode === '2p' && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-rose-500/40 text-xs font-bold text-rose-200">
              2-O&apos;yinchi: #{p2ControlledPlayer.number} {p2ControlledPlayer.name}
            </div>
          )}

          {/* Shot Charge Bar */}
          <div className="w-48 h-2.5 rounded-full bg-slate-950/90 border border-white/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-75"
              style={{ width: `${Math.round(powerMeter * 100)}%` }}
            />
          </div>
        </div>

        {/* Bottom Center: Keyboard Hints */}
        <div className="px-4 py-1.5 rounded-full bg-slate-950/80 border border-white/10 text-[10px] text-slate-300 font-semibold backdrop-blur-md">
          {playMode === '2p'
            ? '1P: WASD + SHIFT + X(Pas) + SPACE(Zarba) + Q + C(Podkat)  |  2P: Strelka + K(Pas) + L(Zarba) + I + P(Podkat)'
            : 'WASD: Harakat · SHIFT: Yugurish · X: Pas · SPACE: Zarba · Q: Uzun pas · C: Podkat · TAB: Almashtirish'}
        </div>

        {/* Bottom Right: Mini-map Radar */}
        {showRadar && (
          <RadarMap
            radarData={radarData}
            homeColor={homeTeam.primaryColor}
            awayColor={awayTeam.primaryColor}
          />
        )}
      </div>
    </div>
  );
};

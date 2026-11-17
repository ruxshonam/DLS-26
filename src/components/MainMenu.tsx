import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GameMode, MatchPlayMode, TeamData } from '../types/game';
import { INITIAL_TEAMS } from '../data/teamsData';
import { getCardTier, getCoaches, getCoins } from '../data/clubEconomy';
import { buildStadium } from '../game/stadiumBuilder';
import {
  Coins,
  Crosshair,
  Dumbbell,
  Monitor,
  Palette,
  Play,
  Settings,
  ShoppingBag,
  Trophy,
  User,
  Users,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';

interface MainMenuProps {
  userTeam: TeamData;
  opponentTeam: TeamData;
  playMode: MatchPlayMode;
  onChangePlayMode: (m: MatchPlayMode) => void;
  onSelectOpponent: (team: TeamData) => void;
  onStartMode: (mode: GameMode) => void;
  onOpenTeamManagement: () => void;
  onOpenTransferMarket: () => void;
  onOpenCustomClub: () => void;
  onOpenSettings: () => void;
  onOpenFriendMatch: () => void;
  onOpenTournament: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  userTeam,
  opponentTeam,
  playMode,
  onChangePlayMode,
  onSelectOpponent,
  onStartMode,
  onOpenTeamManagement,
  onOpenTransferMarket,
  onOpenCustomClub,
  onOpenSettings,
  onOpenFriendMatch,
  onOpenTournament,
}) => {
  const bgRef = useRef<HTMLDivElement | null>(null);
  const coins = getCoins();
  const coaches = getCoaches();

  const teamOvr = Math.round(
    userTeam.players.slice(0, 11).reduce((s, p) => s + p.rating, 0) /
      Math.max(1, Math.min(11, userTeam.players.length))
  );
  const ovrTier = getCardTier(teamOvr);

  // Subtle live 3D Stadium Flyover Backdrop
  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060d1c);
    scene.fog = new THREE.FogExp2(0x060d1c, 0.004);

    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 400);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xbfdbfe, 0x14532d, 1.0));
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.7);
    sun.position.set(30, 48, 25);
    scene.add(sun);

    const stadium = buildStadium(userTeam.primaryColor, userTeam.secondaryColor);
    scene.add(stadium.group);

    let raf = 0;
    const t0 = performance.now();
    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      const t = (now - t0) / 1000;
      camera.position.set(Math.cos(t * 0.14) * 58, 24 + Math.sin(t * 0.25) * 3, Math.sin(t * 0.14) * 44);
      camera.lookAt(0, 1, 0);
      stadium.updateCrowd(t, 0.2);
      stadium.updateAdBoards(t);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animate);

    const onResize = () => {
      const nw = el.clientWidth || window.innerWidth;
      const nh = el.clientHeight || window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [userTeam.primaryColor, userTeam.secondaryColor]);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden flex flex-col justify-between bg-slate-950 text-slate-100">
      {/* Live 3D Stadium Background */}
      <div ref={bgRef} className="fixed inset-0 z-0 opacity-80" />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-950/75 via-slate-950/45 to-slate-950/90 pointer-events-none" />

      {/* Top Navigation & Economy Bar */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-4 border-b border-white/10 backdrop-blur-md bg-slate-950/55">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center shadow-lg border border-white/30">
            <Trophy className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="font-athletic text-2xl sm:text-3xl font-black uppercase tracking-wider text-white leading-none">
              Dream League 3D
            </h1>
            <p className="text-[11px] text-sky-300 font-bold tracking-wide">
              11v11 3D Futbol · Onlayn Do&apos;stlar · DLS Kartalar
            </p>
          </div>
        </div>

        {/* Economy Badges + Settings */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-xs font-bold text-emerald-300">
            <Dumbbell className="w-3.5 h-3.5" />
            <span className="font-mono-numbers">Fitsec: {coaches.fitsec}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-950/80 border border-sky-400/40 text-xs font-bold text-sky-300">
            <Wrench className="w-3.5 h-3.5" />
            <span className="font-mono-numbers">Technacol: {coaches.technacol}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-950/85 border border-amber-400/60 text-xs font-mono-numbers font-black text-amber-300 shadow">
            <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{coins.toLocaleString()}</span>
          </div>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 whitespace-nowrap shrink-0"
          >
            <Settings className="w-4 h-4 text-sky-400" />
            <span>Sozlamalar</span>
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Match Setup & Primary Modes (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* 1P vs Bot OR 2P Local Same Computer Toggle */}
          <div className="p-4 rounded-2xl bg-slate-900/85 border border-white/15 backdrop-blur-md shadow-2xl flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                O&apos;yin Turi (1 yoki 2 Kishi)
              </span>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  onClick={() => onChangePlayMode('1p')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                    playMode === '1p' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>1 Kishi (Bot bilan)</span>
                </button>
                <button
                  onClick={() => onChangePlayMode('2p')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                    playMode === '2p' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>2 Kishi (Bitta Kompyuterda)</span>
                </button>
              </div>
            </div>

            {/* Team vs Opponent Matchup Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center bg-slate-950/75 p-4 rounded-xl border border-white/10">
              <div className="sm:col-span-5 flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl border-2 border-white/40 flex items-center justify-center font-athletic font-black text-base shadow"
                  style={{ backgroundColor: userTeam.primaryColor, color: userTeam.secondaryColor }}
                >
                  {userTeam.shortName}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-athletic text-lg font-black text-white truncate">{userTeam.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono-numbers font-black ${ovrTier.ovrBg} ${ovrTier.ovrText}`}>
                      {teamOvr}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-bold">{userTeam.formation} · Sizning klub</span>
                </div>
              </div>

              <div className="sm:col-span-1 text-center font-athletic text-xl font-black text-amber-400">
                VS
              </div>

              <div className="sm:col-span-5 flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Raqib Jamoani Tanlash</label>
                <select
                  value={opponentTeam.id}
                  onChange={e => {
                    const found = INITIAL_TEAMS.find(t => t.id === e.target.value);
                    if (found) onSelectOpponent(found);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                >
                  {INITIAL_TEAMS.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.formation})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Primary KICK OFF Button */}
            <button
              onClick={() => onStartMode('quick')}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-athletic text-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-99 transition-all whitespace-nowrap shrink-0"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>Tezkor O&apos;yinni Boshlash (Kick Off)</span>
            </button>
          </div>

          {/* Other Playable Modes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={onOpenTournament}
              className="p-3.5 rounded-2xl bg-slate-900/85 hover:bg-slate-800 border border-amber-500/40 flex flex-col items-center gap-2 text-center transition-all shadow-lg"
            >
              <Trophy className="w-6 h-6 text-amber-400" />
              <span className="font-athletic text-base font-black uppercase text-white whitespace-nowrap">Turnir Kubogi</span>
            </button>

            <button
              onClick={onOpenFriendMatch}
              className="p-3.5 rounded-2xl bg-slate-900/85 hover:bg-slate-800 border border-emerald-500/40 flex flex-col items-center gap-2 text-center transition-all shadow-lg"
            >
              <Wifi className="w-6 h-6 text-emerald-400" />
              <span className="font-athletic text-base font-black uppercase text-white whitespace-nowrap">Do&apos;stlar (Onlayn)</span>
            </button>

            <button
              onClick={() => onStartMode('penalty')}
              className="p-3.5 rounded-2xl bg-slate-900/85 hover:bg-slate-800 border border-rose-500/40 flex flex-col items-center gap-2 text-center transition-all shadow-lg"
            >
              <Crosshair className="w-6 h-6 text-rose-400" />
              <span className="font-athletic text-base font-black uppercase text-white whitespace-nowrap">Penaltilar</span>
            </button>

            <button
              onClick={() => onStartMode('training')}
              className="p-3.5 rounded-2xl bg-slate-900/85 hover:bg-slate-800 border border-sky-500/40 flex flex-col items-center gap-2 text-center transition-all shadow-lg"
            >
              <Zap className="w-6 h-6 text-sky-400" />
              <span className="font-athletic text-base font-black uppercase text-white whitespace-nowrap">Mashg&apos;ulot</span>
            </button>
          </div>
        </div>

        {/* Right: Club Management, Transfer Market (DLS Cards) & Squad Cards Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <button
            onClick={onOpenTeamManagement}
            className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/90 to-slate-900/90 hover:from-indigo-900 hover:to-slate-800 border border-sky-400/50 flex items-center justify-between gap-3 transition-all shadow-xl text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/40 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="font-athletic text-xl font-black uppercase text-white">
                  Tarkib, Kartalar &amp; Kuchaytirish
                </div>
                <div className="text-xs text-slate-300">
                  Ismlar, Taktika, Fitsec &amp; Technacol bilan kuchaytirish
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black whitespace-nowrap shrink-0">
              Ochish →
            </span>
          </button>

          <button
            onClick={onOpenTransferMarket}
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/85 to-slate-900/90 hover:from-amber-900 hover:to-slate-800 border border-amber-400/50 flex items-center justify-between gap-3 transition-all shadow-xl text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <div className="font-athletic text-xl font-black uppercase text-white">
                  Transfer Bozori (DLS Kartalar)
                </div>
                <div className="text-xs text-slate-300">
                  90+ Ful · 80-89 Sariq · &lt;80 Ko&apos;k · Sotib olish / Sotish
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-black whitespace-nowrap shrink-0">
              Bozor →
            </span>
          </button>

          <button
            onClick={onOpenCustomClub}
            className="p-4 rounded-2xl bg-slate-900/85 hover:bg-slate-800 border border-white/15 flex items-center justify-between gap-3 transition-all shadow-xl text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/40 flex items-center justify-center">
                <Palette className="w-6 h-6" />
              </div>
              <div>
                <div className="font-athletic text-xl font-black uppercase text-white">
                  Klub &amp; Forma Dizayni
                </div>
                <div className="text-xs text-slate-300">
                  Klub nomi, stadion va o&apos;yinchi formalarini tahrirlash
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold whitespace-nowrap shrink-0">
              Tahrirlash
            </span>
          </button>

          {/* Compact Starting Stars Card Strip */}
          <div className="p-4 rounded-2xl bg-slate-900/85 border border-white/15 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Asosiy Yulduzlaringiz
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                90+ Ful · 80+ Sariq · &lt;80 Ko&apos;k
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {userTeam.players
                .slice()
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 3)
                .map(p => {
                  const t = getCardTier(p.rating);
                  return (
                    <div
                      key={p.id}
                      onClick={onOpenTeamManagement}
                      className={`p-2 rounded-xl border cursor-pointer transition-transform hover:-translate-y-0.5 ${t.cardBg} ${t.borderClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-mono-numbers font-black ${t.ovrBg} ${t.ovrText}`}>
                          {p.rating}
                        </span>
                        <span className={`text-[9px] font-black ${t.subText}`}>{p.position}</span>
                      </div>
                      <div className={`mt-1 text-[11px] font-black truncate ${t.nameText}`}>
                        {p.name.split(' ')[1] || p.name}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 px-6 py-3 border-t border-white/10 bg-slate-950/75 text-center text-[11px] text-slate-400">
        Boshqaruv: WASD / Strelka · SHIFT: Yugurish · X: Pas · SPACE: Zarba · Q: Uzun pas · C: Podkat · TAB: O&apos;yinchi almashtirish · Mobil sensor tugmalar mavjud
      </footer>
    </div>
  );
};

import React, { useState } from 'react';
import { TeamData, PlayerData, FormationType, PlayerPosition } from '../types/game';
import { FORMATIONS_COORDINATES, saveUserTeam } from '../data/teamsData';
import {
  getCoins,
  saveCoins,
  getCoaches,
  applyCoachUpgrade,
  addCoachFromRelease,
  getPlayerReleaseRewards,
  getCardTier,
  CoachInventory,
  CoachUpgradeResult,
} from '../data/clubEconomy';
import { DlsPlayerCard } from './DlsPlayerCard';
import { ReleasePlayerModal } from './ReleasePlayerModal';
import { soundEngine } from '../audio/soundEngine';
import {
  X,
  ArrowLeftRight,
  Check,
  Edit3,
  User,
  Hash,
  Save,
  Sparkles,
  Zap,
  Dumbbell,
  Wrench,
  Coins,
  ShoppingBag,
  ArrowUpRight,
} from 'lucide-react';

interface TeamManagementModalProps {
  team: TeamData;
  onUpdateTeam: (updatedTeam: TeamData) => void;
  onOpenTransferMarket?: () => void;
  onClose: () => void;
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  team,
  onUpdateTeam,
  onOpenTransferMarket,
  onClose,
}) => {
  const [currentFormation, setCurrentFormation] = useState<FormationType>(team.formation);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(team.players[0]?.id || null);
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string>(team.name);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Coach / Kuchaytirish state
  const [showCoachPanel, setShowCoachPanel] = useState<boolean>(false);
  const [coaches, setCoaches] = useState<CoachInventory>(() => getCoaches());
  const [coins, setCoins] = useState<number>(() => getCoins());
  const [coachError, setCoachError] = useState<string | null>(null);
  const [upgradeResult, setUpgradeResult] = useState<CoachUpgradeResult | null>(null);

  // Release / Sell modal inside Squad
  const [releaseCandidate, setReleaseCandidate] = useState<PlayerData | null>(null);

  const starters = team.players.slice(0, 11);
  const subs = team.players.slice(11);
  const selectedPlayer = team.players.find(p => p.id === selectedPlayerId) || team.players[0];

  const triggerSaveNotification = (msg: string) => {
    setSavedNotice(msg);
    soundEngine.playUiClick();
    setTimeout(() => {
      setSavedNotice(null);
    }, 3200);
  };

  const notifyAndSave = (updated: TeamData, noticeMsg?: string) => {
    saveUserTeam(updated);
    onUpdateTeam(updated);
    if (noticeMsg) {
      triggerSaveNotification(noticeMsg);
    }
  };

  const handleClubNameChange = (newName: string) => {
    setClubName(newName);
    const updated: TeamData = {
      ...team,
      name: newName.trim() || 'My Football Club',
    };
    notifyAndSave(updated);
  };

  const handleFormationChange = (form: FormationType) => {
    setCurrentFormation(form);
    const updated: TeamData = {
      ...team,
      formation: form,
    };
    notifyAndSave(updated, `Taktika ${form} ga o'zgartirildi va saqlandi!`);
  };

  const handlePlayerClick = (player: PlayerData) => {
    if (swapSourceId) {
      if (swapSourceId !== player.id) {
        const idx1 = team.players.findIndex(p => p.id === swapSourceId);
        const idx2 = team.players.findIndex(p => p.id === player.id);
        if (idx1 !== -1 && idx2 !== -1) {
          const newPlayers = [...team.players];
          const p1 = newPlayers[idx1];
          const p2 = newPlayers[idx2];
          newPlayers[idx1] = p2;
          newPlayers[idx2] = p1;

          const updated: TeamData = {
            ...team,
            players: newPlayers,
          };
          notifyAndSave(updated, `${p1.name} va ${p2.name} almashtirildi va saqlandi!`);
        }
      }
      setSwapSourceId(null);
    } else {
      setSelectedPlayerId(player.id);
    }
  };

  const handlePlayerNameChange = (newName: string) => {
    if (!selectedPlayer) return;
    const updatedPlayers = team.players.map(p =>
      p.id === selectedPlayer.id ? { ...p, name: newName } : p
    );
    notifyAndSave({ ...team, players: updatedPlayers });
  };

  const handlePlayerNumberChange = (newNumber: number) => {
    if (!selectedPlayer) return;
    const clamped = Math.max(1, Math.min(99, newNumber || 1));
    const updatedPlayers = team.players.map(p =>
      p.id === selectedPlayer.id ? { ...p, number: clamped } : p
    );
    notifyAndSave({ ...team, players: updatedPlayers });
  };

  const handlePlayerPositionChange = (newPos: PlayerPosition) => {
    if (!selectedPlayer) return;
    const updatedPlayers = team.players.map(p =>
      p.id === selectedPlayer.id ? { ...p, position: newPos } : p
    );
    notifyAndSave({ ...team, players: updatedPlayers }, `${selectedPlayer.name} ampluasi ${newPos} ga o'zgartirildi!`);
  };

  const handleApplyCoach = (type: 'fitsec' | 'technacol') => {
    setCoachError(null);
    const outcome = applyCoachUpgrade(team, type);
    setCoaches(outcome.coaches);

    if (outcome.error || !outcome.result) {
      setCoachError(outcome.error || "Kuchaytirish amalga oshmadi.");
      return;
    }

    const res = outcome.result;
    onUpdateTeam(res.updatedTeam);
    setSelectedPlayerId(res.upgradedPlayer.id);
    setUpgradeResult(res);
    soundEngine.playGoalCelebration();
    triggerSaveNotification(
      `${res.upgradedPlayer.name} kuchaytirildi! (${res.oldRating} → ${res.newRating})`
    );
  };

  const handleConfirmRelease = (choice: 'fitsec' | 'technacol' | 'coins') => {
    if (!releaseCandidate) return;
    if (team.players.length <= 11) {
      triggerSaveNotification('Asosiy tarkibda kamida 11 nafar futbolchi qolishi shart!');
      setReleaseCandidate(null);
      return;
    }

    const target = releaseCandidate;
    const updatedPlayers = team.players.filter(p => p.id !== target.id);
    const updatedTeam = { ...team, players: updatedPlayers };
    onUpdateTeam(updatedTeam);
    saveUserTeam(updatedTeam);

    if (selectedPlayerId === target.id && updatedPlayers[0]) {
      setSelectedPlayerId(updatedPlayers[0].id);
    }

    if (choice === 'coins') {
      const { coinsValue } = getPlayerReleaseRewards(target.rating);
      const nextCoins = saveCoins(coins + coinsValue);
      setCoins(nextCoins);
      triggerSaveNotification(`${target.name} sotildi: +${coinsValue.toLocaleString()} Koin!`);
    } else if (choice === 'fitsec') {
      const { coaches: nextCoaches, addedUnits } = addCoachFromRelease('fitsec', target.rating);
      setCoaches(nextCoaches);
      triggerSaveNotification(`${target.name} -> +${addedUnits} Fitsec qo'shildi!`);
    } else {
      const { coaches: nextCoaches, addedUnits } = addCoachFromRelease('technacol', target.rating);
      setCoaches(nextCoaches);
      triggerSaveNotification(`${target.name} -> +${addedUnits} Technacol qo'shildi!`);
    }

    setReleaseCandidate(null);
  };

  const attPlayers = starters.filter(p => ['ST', 'LW', 'RW'].includes(p.position));
  const midPlayers = starters.filter(p => ['CM', 'CAM', 'CDM', 'LM', 'RM'].includes(p.position));
  const defPlayers = starters.filter(p => ['CB', 'LB', 'RB', 'GK'].includes(p.position));

  const avgRating = (list: PlayerData[]) =>
    list.length ? Math.round(list.reduce((acc, p) => acc + p.rating, 0) / list.length) : 80;

  const formationCoords = FORMATIONS_COORDINATES[currentFormation] || FORMATIONS_COORDINATES['4-3-3'];
  const totalCoaches = coaches.fitsec + coaches.technacol;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-6xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded-full border border-white/40 shadow-inner"
              style={{ backgroundColor: team.primaryColor }}
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-700">
                <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                <input
                  type="text"
                  value={clubName}
                  onChange={e => handleClubNameChange(e.target.value)}
                  placeholder="Klub nomini kiriting..."
                  maxLength={24}
                  className="font-athletic text-xl font-black uppercase tracking-wider text-white bg-transparent border-none focus:outline-none focus:ring-0 max-w-[180px] sm:max-w-[260px]"
                  title="Klub nomini o'zgartirish uchun yozing"
                />
              </div>
              <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 font-mono-numbers">
                <span>Hujum: <strong className="text-rose-400">{avgRating(attPlayers)}</strong></span>
                <span>Yarim: <strong className="text-amber-400">{avgRating(midPlayers)}</strong></span>
                <span>Himoya: <strong className="text-sky-400">{avgRating(defPlayers)}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Coins Display */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/50 border border-amber-500/40 text-xs font-mono-numbers font-black text-amber-300">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{coins.toLocaleString()}</span>
            </div>

            {/* Kuchaytirish Button */}
            <button
              onClick={() => {
                setCoachError(null);
                setUpgradeResult(null);
                setShowCoachPanel(prev => !prev);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg whitespace-nowrap shrink-0 border ${
                showCoachPanel
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white border-white/20'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Kuchaytirish</span>
              {totalCoaches > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-amber-300 font-mono-numbers text-[10px]">
                  {totalCoaches}
                </span>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Saved Alert Banner */}
        {savedNotice && (
          <div className="bg-emerald-600/95 text-white text-xs font-bold py-2 px-6 flex items-center justify-center gap-2 shadow-md">
            <Check className="w-4 h-4 text-emerald-200" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* KUCHAYTIRISH (Fitsec & Technacol Coach Panel) */}
        {showCoachPanel && (
          <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-indigo-950/50 to-slate-950">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-athletic text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <span>Kuchaytirish Bo&apos;limi · Fitsec & Technacol</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Qaysi birini bossangiz, ichida to&apos;lgani bo&apos;lsa kompyuter o&apos;zi tarkibdan bitta futbolchini tanlab kuchaytiradi!
                  </p>
                </div>

                {onOpenTransferMarket && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenTransferMarket();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-400/30 whitespace-nowrap shrink-0"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Transfer Bozoridan O&apos;yinchi Olish</span>
                  </button>
                )}
              </div>

              {coachError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-xs text-rose-200 font-semibold text-center">
                  {coachError}
                </div>
              )}

              {/* Two Coach Buttons: Fitsec & Technacol */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. FITSEC BUTTON */}
                <button
                  onClick={() => handleApplyCoach('fitsec')}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all text-left shadow-xl group ${
                    coaches.fitsec > 0
                      ? 'bg-emerald-950/80 hover:bg-emerald-900/80 border-emerald-400 active:scale-99'
                      : 'bg-slate-950/80 hover:bg-slate-900 border-slate-700 opacity-85'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/40">
                      <Dumbbell className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-athletic text-2xl font-black uppercase tracking-wider text-white group-hover:text-emerald-300">
                        Fitsec
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Tezlik (PAC) &amp; Jismoniy kuchni (PHY) oshiradi
                      </div>
                      <div className="w-40 h-1.5 rounded-full bg-slate-900 mt-1.5 overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${coaches.fitsec > 0 ? 100 : coaches.fitsecProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span
                      className={`px-3 py-1 rounded-lg font-mono-numbers text-xs font-black ${
                        coaches.fitsec > 0
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      To&apos;lgan: {coaches.fitsec} ta
                    </span>
                    <span className="text-[10px] text-emerald-300 mt-1 font-bold">
                      {coaches.fitsec > 0 ? 'Bosib kuchaytiring →' : `${coaches.fitsecProgress}%`}
                    </span>
                  </div>
                </button>

                {/* 2. TECHNACOL BUTTON */}
                <button
                  onClick={() => handleApplyCoach('technacol')}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all text-left shadow-xl group ${
                    coaches.technacol > 0
                      ? 'bg-sky-950/80 hover:bg-sky-900/80 border-sky-400 active:scale-99'
                      : 'bg-slate-950/80 hover:bg-slate-900 border-slate-700 opacity-85'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/40">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-athletic text-2xl font-black uppercase tracking-wider text-white group-hover:text-sky-300">
                        Technacol
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Zarba, Pas, Dribling &amp; Himoyani oshiradi
                      </div>
                      <div className="w-40 h-1.5 rounded-full bg-slate-900 mt-1.5 overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-sky-400 rounded-full"
                          style={{ width: `${coaches.technacol > 0 ? 100 : coaches.technacolProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span
                      className={`px-3 py-1 rounded-lg font-mono-numbers text-xs font-black ${
                        coaches.technacol > 0
                          ? 'bg-sky-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      To&apos;lgan: {coaches.technacol} ta
                    </span>
                    <span className="text-[10px] text-sky-300 mt-1 font-bold">
                      {coaches.technacol > 0 ? 'Bosib kuchaytiring →' : `${coaches.technacolProgress}%`}
                    </span>
                  </div>
                </button>
              </div>

              {/* Random Computer Upgrade Reveal Card */}
              {upgradeResult && (
                <div className="p-4 rounded-2xl bg-slate-900/95 border border-amber-400/70 shadow-2xl flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-64 shrink-0">
                    <DlsPlayerCard
                      player={upgradeResult.upgradedPlayer}
                      clubTag={team.name}
                      primaryColor={team.primaryColor}
                      secondaryColor={team.secondaryColor}
                      compact
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                        {upgradeResult.coachType === 'fitsec' ? 'FITSEC KUCHAYTIRISH' : 'TECHNACOL KUCHAYTIRISH'}
                      </span>
                      {upgradeResult.oldTier !== upgradeResult.newTier && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                          YANGI DARAJA: {getCardTier(upgradeResult.newRating).label}!
                        </span>
                      )}
                    </div>
                    <h4 className="font-athletic text-2xl font-black text-white uppercase">
                      Kompyuter tanladi: {upgradeResult.upgradedPlayer.name}
                    </h4>
                    <div className="flex items-center gap-2 text-lg font-mono-numbers font-black">
                      <span className="text-slate-400">{upgradeResult.oldRating}</span>
                      <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-400 text-2xl">{upgradeResult.newRating} OVR</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {upgradeResult.statGains.map(g => (
                        <span
                          key={g.label}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-xs font-bold text-emerald-300 font-mono-numbers"
                        >
                          +{g.delta} {g.label} ({g.newValue})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Body: Tactical Pitch + Selected DLS Card & Bench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
          {/* Tactical 2D Pitch (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Taktika va Tarkib Kartalari
              </span>
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800">
                {(['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'] as FormationType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => handleFormationChange(f)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      currentFormation === f
                        ? 'bg-sky-500 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Tier Legend */}
            <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-wider">
              <span className="px-2 py-0.5 rounded bg-zinc-950 text-amber-300 border border-amber-400">
                90+ Ful Karta
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 border border-yellow-200">
                80-89 Sariq Karta
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-600 text-white border border-sky-300">
                &lt;80 Ko&apos;k Karta
              </span>
            </div>

            {/* Pitch Container */}
            <div className="relative w-full aspect-[4/3] rounded-xl border-2 border-emerald-600/40 bg-gradient-to-b from-emerald-800 to-emerald-950 p-4 shadow-inner overflow-hidden select-none">
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white/20 -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 w-24 h-24 rounded-full border-2 border-white/20 -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute inset-x-8 top-0 h-16 border-b-2 border-x-2 border-white/20 rounded-b-lg" />
              <div className="absolute inset-x-8 bottom-0 h-16 border-t-2 border-x-2 border-white/20 rounded-t-lg" />

              {starters.map((player, idx) => {
                const coord = formationCoords[idx] || { x: -20, z: 0 };
                const topPct = 90 + (coord.x / 52.5) * 80;
                const leftPct = 50 + (coord.z / 34) * 40;

                const isSelected = selectedPlayerId === player.id;
                const isSwapping = swapSourceId === player.id;
                const cardTier = getCardTier(player.rating);

                return (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerClick(player)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-transform ${
                      isSwapping ? 'animate-pulse scale-110' : 'hover:scale-105'
                    }`}
                    style={{
                      top: `${Math.max(11, Math.min(89, topPct))}%`,
                      left: `${Math.max(10, Math.min(90, leftPct))}%`,
                    }}
                  >
                    <div
                      className={`relative w-10 h-11 rounded-lg flex flex-col items-center justify-center font-athletic font-black shadow-xl border-2 transition-all ${
                        cardTier.cardBg
                      } ${
                        isSelected
                          ? 'border-white ring-2 ring-white scale-110'
                          : isSwapping
                          ? 'border-rose-400 ring-2 ring-rose-500'
                          : cardTier.borderClass
                      }`}
                    >
                      <span
                        className={`text-[9px] font-mono-numbers font-black leading-none ${cardTier.subText}`}
                      >
                        {player.rating}
                      </span>
                      <span className={`text-sm font-black leading-none ${cardTier.nameText}`}>
                        #{player.number}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white bg-slate-950/90 px-1.5 py-0.5 rounded shadow mt-0.5 whitespace-nowrap truncate max-w-[78px] border border-white/10">
                      {player.name.split(' ')[1] || player.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {swapSourceId ? (
              <p className="text-xs text-amber-400 text-center font-bold animate-pulse">
                Almashtirish uchun boshqa o&apos;yinchini bosing (asosiy yoki zaxiradan)
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 text-center">
                O&apos;yinchi kartasini ko&apos;rish, nomini yozish yoki almashtirish uchun ustiga bosing
              </p>
            )}
          </div>

          {/* Selected DLS Card + Editor + Bench (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {selectedPlayer && (
              <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 shadow-lg grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                {/* Left: Full DLS Player Card */}
                <div className="flex flex-col gap-2">
                  <DlsPlayerCard
                    player={selectedPlayer}
                    clubTag={team.name}
                    primaryColor={team.primaryColor}
                    secondaryColor={team.secondaryColor}
                    compact
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSwapSourceId(selectedPlayer.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow whitespace-nowrap"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>O&apos;rin Almashtirish</span>
                    </button>
                    {team.players.length > 11 && (
                      <button
                        onClick={() => setReleaseCandidate(selectedPlayer)}
                        className="px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-xs font-bold transition-all whitespace-nowrap"
                        title="Fitsec, Technacol yoki Koin uchun sotish"
                      >
                        Sotish
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Name, Number & Position Editor */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs uppercase font-bold tracking-wider text-sky-400">
                    O&apos;yinchini Tahrirlash
                  </span>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-sky-400" />
                      <span>O&apos;yinchi Ismi</span>
                    </label>
                    <input
                      type="text"
                      value={selectedPlayer.name}
                      onChange={e => handlePlayerNameChange(e.target.value)}
                      placeholder="Futbolchi ismini yozing..."
                      maxLength={24}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                        <Hash className="w-3 h-3 text-amber-400" />
                        <span>Raqam (#)</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={selectedPlayer.number}
                        onChange={e => handlePlayerNumberChange(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-sky-500 font-mono-numbers"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                        Amplua
                      </label>
                      <select
                        value={selectedPlayer.position}
                        onChange={e => handlePlayerPositionChange(e.target.value as PlayerPosition)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-sky-500"
                      >
                        {(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'] as PlayerPosition[]).map(pos => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Substitutes Bench with DLS Tier Cards */}
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Zaxira Kartalari ({subs.length}) · Almashtirish uchun bosing
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {subs.map(sub => {
                  const tier = getCardTier(sub.rating);
                  const isSel = selectedPlayerId === sub.id;
                  const isSwap = swapSourceId === sub.id;
                  return (
                    <div
                      key={sub.id}
                      onClick={() => handlePlayerClick(sub)}
                      className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        tier.cardBg
                      } ${
                        isSwap
                          ? 'ring-2 ring-rose-400 border-rose-300 animate-pulse'
                          : isSel
                          ? 'ring-2 ring-white border-white'
                          : tier.borderClass
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`px-2 py-1 rounded-md font-mono-numbers text-sm font-black shrink-0 ${tier.ovrBg} ${tier.ovrText}`}
                        >
                          {sub.rating}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-black truncate ${tier.nameText}`}>
                            {sub.name}
                          </div>
                          <div className={`text-[10px] font-bold flex items-center gap-1 ${tier.subText}`}>
                            <span>{sub.position}</span>
                            <span>·</span>
                            <span>#{sub.number}</span>
                            <span>·</span>
                            <span>{tier.label}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Barcha o&apos;zgartirishlar va kartalar darajalari avtomatik saqlanadi</span>
          </div>
          <button
            onClick={() => {
              notifyAndSave(team, "Barcha nomlar va tarkib o'yinga saqlandi!");
              setTimeout(() => onClose(), 350);
            }}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-black uppercase tracking-wider text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg transition-all shadow-lg active:scale-95 whitespace-nowrap shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>Saqlash &amp; Tasdiqlash</span>
          </button>
        </div>
      </div>

      {/* 3-Choice Player Release Dialog inside Tarkib */}
      {releaseCandidate && (
        <ReleasePlayerModal
          player={releaseCandidate}
          clubTag={team.name}
          primaryColor={team.primaryColor}
          secondaryColor={team.secondaryColor}
          onChoose={handleConfirmRelease}
          onClose={() => setReleaseCandidate(null)}
        />
      )}
    </div>
  );
};

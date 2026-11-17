import { PlayerData, TeamData } from '../types/game';
import { saveUserTeam } from './teamsData';

export type DlsCardTier = 'ful' | 'sariq' | 'kok';

export interface DlsCardStyle {
  tier: DlsCardTier;
  label: string;
  badgeText: string;
  cardBg: string;
  borderClass: string;
  ovrBg: string;
  ovrText: string;
  nameText: string;
  subText: string;
  statBg: string;
  statText: string;
  pillBg: string;
}

export interface CoachInventory {
  fitsec: number;           // Number of filled Fitsec coaches ready to use
  technacol: number;        // Number of filled Technacol coaches ready to use
  fitsecProgress: number;   // 0..99 partial progress toward next Fitsec coach
  technacolProgress: number;// 0..99 partial progress toward next Technacol coach
}

export interface CoachUpgradeResult {
  updatedTeam: TeamData;
  upgradedPlayer: PlayerData;
  oldRating: number;
  newRating: number;
  oldTier: DlsCardTier;
  newTier: DlsCardTier;
  statGains: { label: string; delta: number; newValue: number }[];
  coachType: 'fitsec' | 'technacol';
}

const COINS_KEY = 'dls3d_coins';
const COACHES_KEY = 'dls3d_coaches';

export function getCardTier(rating: number): DlsCardStyle {
  if (rating >= 90) {
    return {
      tier: 'ful',
      label: 'FUL KARTA',
      badgeText: '90+ FUL',
      cardBg: 'bg-gradient-to-br from-zinc-950 via-neutral-900 to-amber-950/90',
      borderClass: 'border-amber-400/90 shadow-[0_0_24px_rgba(245,158,11,0.28)]',
      ovrBg: 'bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600',
      ovrText: 'text-zinc-950',
      nameText: 'text-amber-100',
      subText: 'text-amber-400',
      statBg: 'bg-black/60 border border-amber-500/30',
      statText: 'text-amber-300',
      pillBg: 'bg-amber-400/20 text-amber-300 border border-amber-400/50',
    };
  }
  if (rating >= 80) {
    return {
      tier: 'sariq',
      label: 'SARIQ KARTA',
      badgeText: '80+ SARIQ',
      cardBg: 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600',
      borderClass: 'border-yellow-200/90 shadow-[0_0_18px_rgba(234,179,8,0.25)]',
      ovrBg: 'bg-slate-950',
      ovrText: 'text-yellow-300',
      nameText: 'text-slate-950',
      subText: 'text-amber-950',
      statBg: 'bg-slate-950/85 border border-yellow-200/20',
      statText: 'text-yellow-300',
      pillBg: 'bg-slate-950/80 text-yellow-300 border border-slate-800',
    };
  }
  return {
    tier: 'kok',
    label: "KO'K KARTA",
    badgeText: "<80 KO'K",
    cardBg: 'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700',
    borderClass: 'border-sky-300/80 shadow-[0_0_16px_rgba(56,189,248,0.22)]',
    ovrBg: 'bg-slate-950',
    ovrText: 'text-sky-300',
    nameText: 'text-white',
    subText: 'text-sky-100',
    statBg: 'bg-slate-950/75 border border-sky-200/20',
    statText: 'text-sky-300',
    pillBg: 'bg-slate-950/70 text-sky-200 border border-sky-300/30',
  };
}

export function getCoins(): number {
  try {
    const saved = localStorage.getItem(COINS_KEY);
    if (saved !== null) {
      const n = parseInt(saved, 10);
      if (!Number.isNaN(n) && n >= 0) return n;
    }
  } catch {}
  return 25000;
}

export function saveCoins(amount: number): number {
  const safe = Math.max(0, Math.round(amount));
  try {
    localStorage.setItem(COINS_KEY, String(safe));
  } catch {}
  return safe;
}

export function addCoins(delta: number): number {
  return saveCoins(getCoins() + delta);
}

export function getCoaches(): CoachInventory {
  try {
    const saved = localStorage.getItem(COACHES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        fitsec: Math.max(0, Number(parsed.fitsec) || 0),
        technacol: Math.max(0, Number(parsed.technacol) || 0),
        fitsecProgress: Math.max(0, Math.min(99, Number(parsed.fitsecProgress) || 0)),
        technacolProgress: Math.max(0, Math.min(99, Number(parsed.technacolProgress) || 0)),
      };
    }
  } catch {}
  return {
    fitsec: 0,
    technacol: 0,
    fitsecProgress: 0,
    technacolProgress: 0,
  };
}

export function saveCoaches(inv: CoachInventory): CoachInventory {
  try {
    localStorage.setItem(COACHES_KEY, JSON.stringify(inv));
  } catch {}
  return inv;
}

export function getPlayerReleaseRewards(rating: number) {
  const coinsValue = Math.round(rating * 110);
  const coachUnits = rating >= 90 ? 3 : rating >= 80 ? 2 : 1;
  return {
    coinsValue,
    coachUnits,
  };
}

export function addCoachFromRelease(type: 'fitsec' | 'technacol', playerRating: number): { coaches: CoachInventory; addedUnits: number } {
  const inv = getCoaches();
  const { coachUnits } = getPlayerReleaseRewards(playerRating);
  if (type === 'fitsec') {
    inv.fitsec += coachUnits;
  } else {
    inv.technacol += coachUnits;
  }
  saveCoaches(inv);
  return { coaches: inv, addedUnits: coachUnits };
}

export function addMatchCoachProgress(fitsecPct: number, technacolPct: number): CoachInventory {
  const inv = getCoaches();
  inv.fitsecProgress += fitsecPct;
  while (inv.fitsecProgress >= 100) {
    inv.fitsec += 1;
    inv.fitsecProgress -= 100;
  }
  inv.technacolProgress += technacolPct;
  while (inv.technacolProgress >= 100) {
    inv.technacol += 1;
    inv.technacolProgress -= 100;
  }
  return saveCoaches(inv);
}

/**
 * Automatically picks a random eligible player from the squad and applies a Fitsec or Technacol coach boost.
 */
export function applyCoachUpgrade(
  team: TeamData,
  coachType: 'fitsec' | 'technacol'
): { error?: string; result?: CoachUpgradeResult; coaches: CoachInventory } {
  const inv = getCoaches();
  const available = coachType === 'fitsec' ? inv.fitsec : inv.technacol;

  if (available <= 0) {
    return {
      error:
        coachType === 'fitsec'
          ? "Fitsec ichida to'lgan kuchaytirish yo'q! Transfer bozori orqali o'yinchini Fitsec uchun soting."
          : "Technacol ichida to'lgan kuchaytirish yo'q! Transfer bozori orqali o'yinchini Technacol uchun soting.",
      coaches: inv,
    };
  }

  // Eligible players (< 99 rating)
  const eligible = team.players.filter(p => p.rating < 99);
  const pool = eligible.length > 0 ? eligible : team.players;
  if (pool.length === 0) {
    return { error: "Jamoangizda futbolchilar topilmadi.", coaches: inv };
  }

  // Computer randomly picks a player
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const oldRating = chosen.rating;
  const oldTier = getCardTier(oldRating).tier;

  const updatedAttrs = { ...chosen.attributes };
  const statGains: { label: string; delta: number; newValue: number }[] = [];

  if (coachType === 'fitsec') {
    const paceDelta = Math.min(99 - updatedAttrs.pace, 2 + Math.floor(Math.random() * 3));
    const phyDelta = Math.min(99 - updatedAttrs.physical, 2 + Math.floor(Math.random() * 3));
    updatedAttrs.pace = Math.min(99, updatedAttrs.pace + paceDelta);
    updatedAttrs.physical = Math.min(99, updatedAttrs.physical + phyDelta);
    if (paceDelta > 0) statGains.push({ label: 'Tezlik (PAC)', delta: paceDelta, newValue: updatedAttrs.pace });
    if (phyDelta > 0) statGains.push({ label: 'Jismoniy (PHY)', delta: phyDelta, newValue: updatedAttrs.physical });
  } else {
    const shoDelta = Math.min(99 - updatedAttrs.shooting, 2 + Math.floor(Math.random() * 2));
    const pasDelta = Math.min(99 - updatedAttrs.passing, 2 + Math.floor(Math.random() * 2));
    const driDelta = Math.min(99 - updatedAttrs.dribbling, 2 + Math.floor(Math.random() * 2));
    const defDelta = Math.min(99 - updatedAttrs.defending, 1 + Math.floor(Math.random() * 2));
    updatedAttrs.shooting = Math.min(99, updatedAttrs.shooting + shoDelta);
    updatedAttrs.passing = Math.min(99, updatedAttrs.passing + pasDelta);
    updatedAttrs.dribbling = Math.min(99, updatedAttrs.dribbling + driDelta);
    updatedAttrs.defending = Math.min(99, updatedAttrs.defending + defDelta);
    if (shoDelta > 0) statGains.push({ label: 'Zarba (SHO)', delta: shoDelta, newValue: updatedAttrs.shooting });
    if (pasDelta > 0) statGains.push({ label: 'Pas (PAS)', delta: pasDelta, newValue: updatedAttrs.passing });
    if (driDelta > 0) statGains.push({ label: 'Dribling (DRI)', delta: driDelta, newValue: updatedAttrs.dribbling });
    if (defDelta > 0) statGains.push({ label: 'Himoya (DEF)', delta: defDelta, newValue: updatedAttrs.defending });
  }

  const ovrGain = chosen.rating < 99 ? (Math.random() < 0.35 && chosen.rating <= 97 ? 2 : 1) : 0;
  const newRating = Math.min(99, chosen.rating + ovrGain);

  const upgradedPlayer: PlayerData = {
    ...chosen,
    rating: newRating,
    attributes: updatedAttrs,
    stamina: 100,
  };

  const updatedTeam: TeamData = {
    ...team,
    players: team.players.map(p => (p.id === chosen.id ? upgradedPlayer : p)),
  };

  if (coachType === 'fitsec') {
    inv.fitsec = Math.max(0, inv.fitsec - 1);
  } else {
    inv.technacol = Math.max(0, inv.technacol - 1);
  }

  saveCoaches(inv);
  saveUserTeam(updatedTeam);

  return {
    coaches: inv,
    result: {
      updatedTeam,
      upgradedPlayer,
      oldRating,
      newRating,
      oldTier,
      newTier: getCardTier(newRating).tier,
      statGains,
      coachType,
    },
  };
}

export type PlayerPosition =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'RW'
  | 'ST';

export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface PlayerData {
  id: string;
  name: string;
  number: number;
  position: PlayerPosition;
  rating: number;
  attributes: PlayerAttributes;
  stamina: number;
  skinTone?: string;
  hairColor?: string;
}

export type KitPattern = 'solid' | 'stripes' | 'hoops' | 'sash';
export type FormationType = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1';

export interface TeamData {
  id: string;
  name: string;
  shortName: string;
  stadiumName: string;
  formation: FormationType;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gkColor: string;
  pattern: KitPattern;
  isCustom?: boolean;
  players: PlayerData[];
}

export type GameMode = 'menu' | 'quick' | 'training' | 'penalty' | 'tournament' | 'friend';
export type MatchPlayMode = '1p' | '2p';
export type CameraMode = 'broadcast' | 'tv_wide' | 'pro' | 'action' | 'sideline';
export type AIDifficulty = 'amateur' | 'pro' | 'world_class' | 'legendary';

export interface GameSettings {
  cameraMode: CameraMode;
  difficulty: AIDifficulty;
  matchDurationMinutes: number; // real-time match duration in minutes (e.g. 2, 3, 5)
  sfxVolume: number;
  crowdVolume: number;
  commentaryEnabled: boolean;
  commentaryLanguage: 'uz' | 'en';
  showRadar: boolean;
  autoSwitch: boolean;
}

export interface FoulEvent {
  type: 'yellow' | 'red' | 'freekick' | 'penalty';
  playerName: string;
  teamName: string;
  isHome: boolean;
}

export interface OutEvent {
  type: 'throw_in' | 'corner' | 'goal_kick';
  teamName: string;
  isHome: boolean;
}

export interface MatchStats {
  homeScore: number;
  awayScore: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homePossessionTime: number;
  awayPossessionTime: number;
  homePasses: number;
  awayPasses: number;
  homeTackles: number;
  awayTackles: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  homeCorners: number;
  awayCorners: number;
  goalLog: { minute: number; scorer: string; isHome: boolean; penalty?: boolean }[];
}

export interface TournamentMatch {
  id: string;
  round: 'Quarter-Final' | 'Semi-Final' | 'Final';
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  winnerId?: string;
}

export interface TournamentState {
  active: boolean;
  currentRound: 'Quarter-Final' | 'Semi-Final' | 'Final' | 'Champion' | 'Eliminated';
  matches: TournamentMatch[];
  userTeamId: string;
}

export interface PenaltyKickerState {
  round: number;
  maxRounds: number;
  turn: 'home' | 'away';
  homeResults: ('goal' | 'miss' | 'pending')[];
  awayResults: ('goal' | 'miss' | 'pending')[];
  homeScore: number;
  awayScore: number;
  finished: boolean;
  winner: 'home' | 'away' | null;
}

export interface MarketPlayer {
  id: string;
  name: string;
  team: string;
  position: PlayerPosition;
  rating: number;
  price: number;
  attributes: PlayerAttributes;
}

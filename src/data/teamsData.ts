import { TeamData, PlayerData, FormationType, PlayerPosition } from '../types/game';

const SKIN_TONES = ['#f5d0b5', '#e0b892', '#c68d63', '#8d5524', '#5c3818'];
const HAIR_COLORS = ['#18120c', '#2b1f14', '#634124', '#c9a45c', '#0b0b0d'];

function makePlayer(
  id: string,
  name: string,
  number: number,
  position: PlayerPosition,
  rating: number,
  overrides?: Partial<PlayerData['attributes']>
): PlayerData {
  const base = Math.max(55, rating - 4);
  const seed = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

  const isGK = position === 'GK';
  const isDef = ['CB', 'LB', 'RB', 'CDM'].includes(position);
  const isMid = ['CM', 'CAM', 'LM', 'RM'].includes(position);

  const attributes = {
    pace: overrides?.pace ?? Math.min(99, isGK ? 48 : base + ((seed % 9) - 2)),
    shooting: overrides?.shooting ?? Math.min(99, isGK ? 24 : isDef ? base - 16 : base + 4),
    passing: overrides?.passing ?? Math.min(99, isGK ? 68 : isMid ? base + 5 : base),
    dribbling: overrides?.dribbling ?? Math.min(99, isGK ? 42 : isDef ? base - 9 : base + 3),
    defending: overrides?.defending ?? Math.min(99, isGK ? rating : isDef ? base + 6 : base - 24),
    physical: overrides?.physical ?? Math.min(99, base + ((seed % 7) - 1)),
  };

  return {
    id,
    name,
    number,
    position,
    rating,
    attributes,
    stamina: 100,
    skinTone: SKIN_TONES[seed % SKIN_TONES.length],
    hairColor: HAIR_COLORS[(seed * 3) % HAIR_COLORS.length],
  };
}

export const FORMATIONS_COORDINATES: Record<FormationType, { x: number; z: number }[]> = {
  '4-3-3': [
    { x: -48, z: 0 },   // GK
    { x: -34, z: -18 }, // LB
    { x: -37, z: -6 },  // CB
    { x: -37, z: 6 },   // CB
    { x: -34, z: 18 },  // RB
    { x: -20, z: -12 }, // CM
    { x: -22, z: 0 },   // CDM
    { x: -20, z: 12 },  // CM
    { x: -8, z: -19 },  // LW
    { x: -6, z: 0 },    // ST
    { x: -8, z: 19 },   // RW
  ],
  '4-4-2': [
    { x: -48, z: 0 },
    { x: -35, z: -18 },
    { x: -38, z: -6 },
    { x: -38, z: 6 },
    { x: -35, z: 18 },
    { x: -20, z: -18 },
    { x: -22, z: -6 },
    { x: -22, z: 6 },
    { x: -20, z: 18 },
    { x: -7, z: -7 },
    { x: -7, z: 7 },
  ],
  '3-5-2': [
    { x: -48, z: 0 },
    { x: -36, z: -12 },
    { x: -38, z: 0 },
    { x: -36, z: 12 },
    { x: -22, z: -19 },
    { x: -24, z: -7 },
    { x: -18, z: 0 },
    { x: -24, z: 7 },
    { x: -22, z: 19 },
    { x: -7, z: -6 },
    { x: -7, z: 6 },
  ],
  '4-2-3-1': [
    { x: -48, z: 0 },
    { x: -35, z: -18 },
    { x: -38, z: -6 },
    { x: -38, z: 6 },
    { x: -35, z: 18 },
    { x: -26, z: -7 },
    { x: -26, z: 7 },
    { x: -14, z: -16 },
    { x: -13, z: 0 },
    { x: -14, z: 16 },
    { x: -5, z: 0 },
  ],
};

export const INITIAL_TEAMS: TeamData[] = [
  {
    id: 'turon_united',
    name: 'Turon United FC',
    shortName: 'TUR',
    stadiumName: 'Bunyodkor Arena 3D',
    formation: '4-3-3',
    primaryColor: '#0284c7',
    secondaryColor: '#ffffff',
    accentColor: '#fbbf24',
    gkColor: '#10b981',
    pattern: 'stripes',
    players: [
      makePlayer('t1_1', 'Otabek Shukurov', 1, 'GK', 81),
      makePlayer('t1_2', 'Farrux Sayfiyev', 3, 'LB', 78),
      makePlayer('t1_3', 'Abduqodir Xusanov', 4, 'CB', 84),
      makePlayer('t1_4', 'Rustam Ashurmatov', 5, 'CB', 79),
      makePlayer('t1_5', 'Hojiakbar Alijonov', 2, 'RB', 79),
      makePlayer('t1_6', 'Odil Hamrobekov', 6, 'CDM', 80),
      makePlayer('t1_7', 'Azizbek Turgunboev', 8, 'CM', 78),
      makePlayer('t1_8', 'Abbosbek Fayzullaev', 10, 'CAM', 85),
      makePlayer('t1_9', 'Jaloliddin Masharipov', 7, 'LW', 82),
      makePlayer('t1_10', 'Eldor Shomurodov', 14, 'ST', 90),
      makePlayer('t1_11', 'Oston Urunov', 11, 'RW', 81),
      // Bench (mixed Ko'k, Sariq, Ful ratings)
      makePlayer('t1_12', 'Utkir Yusupov', 12, 'GK', 77),
      makePlayer('t1_13', 'Sherzod Nasrullaev', 15, 'LB', 76),
      makePlayer('t1_14', 'Jamshid Iskanderov', 17, 'CM', 78),
      makePlayer('t1_15', 'Igor Sergeev', 9, 'ST', 79),
      makePlayer('t1_16', 'Bobur Abduxoliqov', 19, 'ST', 76),
    ],
  },
  {
    id: 'madrid_royals',
    name: 'Madrid Royals',
    shortName: 'MAD',
    stadiumName: 'Castilla Grand Dome',
    formation: '4-3-3',
    primaryColor: '#f8fafc',
    secondaryColor: '#fbbf24',
    accentColor: '#1e293b',
    gkColor: '#f59e0b',
    pattern: 'solid',
    players: [
      makePlayer('m_1', 'Thibault Couron', 1, 'GK', 90),
      makePlayer('m_2', 'Ferland Mendon', 23, 'LB', 84),
      makePlayer('m_3', 'Antonio Rudig', 22, 'CB', 88),
      makePlayer('m_4', 'Eder Militon', 3, 'CB', 87),
      makePlayer('m_5', 'Dani Carval', 2, 'RB', 86),
      makePlayer('m_6', 'Aurelien Tchouam', 14, 'CDM', 86),
      makePlayer('m_7', 'Fede Valver', 8, 'CM', 89),
      makePlayer('m_8', 'Jude Belling', 5, 'CAM', 91),
      makePlayer('m_9', 'Vini Junior', 7, 'LW', 92),
      makePlayer('m_10', 'Kylian Donat', 9, 'ST', 93),
      makePlayer('m_11', 'Rodrygo Silva', 11, 'RW', 87),
      makePlayer('m_12', 'Andriy Lun', 13, 'GK', 81),
      makePlayer('m_13', 'Eduardo Camav', 6, 'CM', 84),
      makePlayer('m_14', 'Luka Modricc', 10, 'CM', 86),
      makePlayer('m_15', 'Brahim Diaz', 21, 'RW', 82),
      makePlayer('m_16', 'Arda Gulen', 15, 'CAM', 79),
    ],
  },
  {
    id: 'manchester_titans',
    name: 'Manchester Titans',
    shortName: 'MNC',
    stadiumName: 'Etihad Sky Park',
    formation: '4-2-3-1',
    primaryColor: '#38bdf8',
    secondaryColor: '#ffffff',
    accentColor: '#0c4a6e',
    gkColor: '#f43f5e',
    pattern: 'solid',
    players: [
      makePlayer('c_1', 'Ederson Mora', 31, 'GK', 88),
      makePlayer('c_2', 'Josko Gvard', 24, 'LB', 85),
      makePlayer('c_3', 'Ruben Diaz', 3, 'CB', 89),
      makePlayer('c_4', 'Manuel Akanj', 25, 'CB', 84),
      makePlayer('c_5', 'Kyle Walk', 2, 'RB', 85),
      makePlayer('c_6', 'Rodri Hernan', 16, 'CDM', 92),
      makePlayer('c_7', 'Mateo Kova', 8, 'CM', 84),
      makePlayer('c_8', 'Jeremy Dok', 11, 'LW', 82),
      makePlayer('c_9', 'Kevin De Bruy', 17, 'CAM', 91),
      makePlayer('c_10', 'Phil Fod', 47, 'RW', 89),
      makePlayer('c_11', 'Erling Haal', 9, 'ST', 93),
      makePlayer('c_12', 'Stefan Orteg', 18, 'GK', 79),
      makePlayer('c_13', 'John Ston', 5, 'CB', 85),
      makePlayer('c_14', 'Bernardo Silv', 20, 'CM', 88),
      makePlayer('c_15', 'Savio Mor', 26, 'RW', 81),
      makePlayer('c_16', 'Jack Greal', 10, 'LW', 83),
    ],
  },
  {
    id: 'catalonia_fc',
    name: 'Catalonia FC',
    shortName: 'CAT',
    stadiumName: 'Nou Horizon Stadium',
    formation: '4-3-3',
    primaryColor: '#1d4ed8',
    secondaryColor: '#b91c1c',
    accentColor: '#fbbf24',
    gkColor: '#84cc16',
    pattern: 'stripes',
    players: [
      makePlayer('b_1', 'Marc Ter Steg', 1, 'GK', 89),
      makePlayer('b_2', 'Alex Bald', 3, 'LB', 82),
      makePlayer('b_3', 'Ronald Arauj', 4, 'CB', 87),
      makePlayer('b_4', 'Pau Cubars', 2, 'CB', 81),
      makePlayer('b_5', 'Jules Kound', 23, 'RB', 86),
      makePlayer('b_6', 'Marc Casad', 17, 'CDM', 79),
      makePlayer('b_7', 'Pedri Gonzal', 8, 'CM', 88),
      makePlayer('b_8', 'Dani Olmo', 20, 'CAM', 86),
      makePlayer('b_9', 'Raphinha Bell', 11, 'LW', 87),
      makePlayer('b_10', 'Robert Lewan', 9, 'ST', 90),
      makePlayer('b_11', 'Lamine Yamal', 19, 'RW', 88),
      makePlayer('b_12', 'Inaki Pena', 13, 'GK', 77),
      makePlayer('b_13', 'Frenkie De Jong', 21, 'CM', 87),
      makePlayer('b_14', 'Gavi Paez', 6, 'CM', 84),
      makePlayer('b_15', 'Ferran Tor', 7, 'ST', 81),
      makePlayer('b_16', 'Pau Victor', 18, 'ST', 75),
    ],
  },
  {
    id: 'london_gunners',
    name: 'London Gunners',
    shortName: 'GUN',
    stadiumName: 'Highbury Dome',
    formation: '4-3-3',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    accentColor: '#fbbf24',
    gkColor: '#0ea5e9',
    pattern: 'solid',
    players: [
      makePlayer('a_1', 'David Ray', 22, 'GK', 85),
      makePlayer('a_2', 'Riccardo Calaf', 33, 'LB', 82),
      makePlayer('a_3', 'Gabriel Magal', 6, 'CB', 87),
      makePlayer('a_4', 'William Salib', 2, 'CB', 89),
      makePlayer('a_5', 'Ben Whit', 4, 'RB', 85),
      makePlayer('a_6', 'Declan Ric', 41, 'CDM', 89),
      makePlayer('a_7', 'Mikel Merin', 23, 'CM', 84),
      makePlayer('a_8', 'Martin Odeg', 8, 'CAM', 90),
      makePlayer('a_9', 'Gabriel Martin', 11, 'LW', 85),
      makePlayer('a_10', 'Kai Havert', 29, 'ST', 85),
      makePlayer('a_11', 'Bukayo Saka', 7, 'RW', 89),
      makePlayer('a_12', 'Neto Murar', 32, 'GK', 78),
      makePlayer('a_13', 'Jurrien Timb', 12, 'RB', 82),
      makePlayer('a_14', 'Thomas Part', 5, 'CDM', 83),
      makePlayer('a_15', 'Leandro Tross', 19, 'LW', 83),
      makePlayer('a_16', 'Gabriel Jes', 9, 'ST', 82),
    ],
  },
  {
    id: 'milan_rossoneri',
    name: 'Milan Rossoneri',
    shortName: 'MIL',
    stadiumName: 'San Siro Arena',
    formation: '4-2-3-1',
    primaryColor: '#b91c1c',
    secondaryColor: '#09090b',
    accentColor: '#f8fafc',
    gkColor: '#eab308',
    pattern: 'stripes',
    players: [
      makePlayer('mi_1', 'Mike Maign', 16, 'GK', 88),
      makePlayer('mi_2', 'Theo Hernan', 19, 'LB', 88),
      makePlayer('mi_3', 'Fikayo Tomor', 23, 'CB', 84),
      makePlayer('mi_4', 'Malick Thiaw', 28, 'CB', 80),
      makePlayer('mi_5', 'Davide Calab', 2, 'RB', 81),
      makePlayer('mi_6', 'Youssouf Fof', 29, 'CDM', 82),
      makePlayer('mi_7', 'Tijjani Reijnd', 14, 'CM', 84),
      makePlayer('mi_8', 'Rafael Leao', 10, 'LW', 88),
      makePlayer('mi_9', 'Christian Pulis', 11, 'CAM', 85),
      makePlayer('mi_10', 'Samu Chukwu', 21, 'RW', 81),
      makePlayer('mi_11', 'Alvaro Morat', 7, 'ST', 84),
      makePlayer('mi_12', 'Marco Sport', 57, 'GK', 76),
      makePlayer('mi_13', 'Strahinja Pav', 31, 'CB', 79),
      makePlayer('mi_14', 'Ruben Loft', 8, 'CM', 81),
      makePlayer('mi_15', 'Noah Okafor', 17, 'LW', 78),
      makePlayer('mi_16', 'Tammy Abrah', 90, 'ST', 80),
    ],
  },
  {
    id: 'bavaria_giants',
    name: 'Bavaria Giants',
    shortName: 'BAV',
    stadiumName: 'Alpine Allianz Dome',
    formation: '4-2-3-1',
    primaryColor: '#e11d48',
    secondaryColor: '#ffffff',
    accentColor: '#1e293b',
    gkColor: '#22c55e',
    pattern: 'hoops',
    players: [
      makePlayer('ba_1', 'Manuel Neu', 1, 'GK', 88),
      makePlayer('ba_2', 'Alphonso Dav', 19, 'LB', 85),
      makePlayer('ba_3', 'Min-Jae Kim', 3, 'CB', 85),
      makePlayer('ba_4', 'Dayot Upam', 2, 'CB', 84),
      makePlayer('ba_5', 'Joshua Kimm', 6, 'RB', 88),
      makePlayer('ba_6', 'Joao Palhin', 16, 'CDM', 85),
      makePlayer('ba_7', 'Aleks Pavl', 45, 'CM', 80),
      makePlayer('ba_8', 'Serge Gnab', 7, 'LW', 84),
      makePlayer('ba_9', 'Jamal Musial', 42, 'CAM', 90),
      makePlayer('ba_10', 'Michael Olis', 17, 'RW', 85),
      makePlayer('ba_11', 'Harry Kan', 9, 'ST', 92),
      makePlayer('ba_12', 'Sven Ulr', 26, 'GK', 77),
      makePlayer('ba_13', 'Leon Goretz', 8, 'CM', 84),
      makePlayer('ba_14', 'Kingsley Com', 11, 'LW', 85),
      makePlayer('ba_15', 'Leroy San', 10, 'RW', 86),
      makePlayer('ba_16', 'Mathys Tel', 39, 'ST', 78),
    ],
  },
  {
    id: 'paris_stars',
    name: 'Paris Stars',
    shortName: 'PAR',
    stadiumName: 'Parc de Lumiere',
    formation: '4-3-3',
    primaryColor: '#0f172a',
    secondaryColor: '#e11d48',
    accentColor: '#ffffff',
    gkColor: '#a855f7',
    pattern: 'sash',
    players: [
      makePlayer('p_1', 'Gianluigi Donn', 1, 'GK', 90),
      makePlayer('p_2', 'Nuno Mend', 25, 'LB', 85),
      makePlayer('p_3', 'Marquinhos Cor', 5, 'CB', 88),
      makePlayer('p_4', 'Willian Pach', 51, 'CB', 82),
      makePlayer('p_5', 'Achraf Hakim', 2, 'RB', 88),
      makePlayer('p_6', 'Vitinha Ferr', 17, 'CDM', 87),
      makePlayer('p_7', 'Joao Nev', 87, 'CM', 84),
      makePlayer('p_8', 'Warren Zair', 33, 'CM', 83),
      makePlayer('p_9', 'Bradley Barc', 29, 'LW', 84),
      makePlayer('p_10', 'Goncalo Ram', 9, 'ST', 83),
      makePlayer('p_11', 'Ousmane Demb', 10, 'RW', 88),
      makePlayer('p_12', 'Matvey Safon', 39, 'GK', 79),
      makePlayer('p_13', 'Lucas Hernan', 21, 'CB', 84),
      makePlayer('p_14', 'Fabian Ruiz', 8, 'CM', 84),
      makePlayer('p_15', 'Kang-In Lee', 19, 'CAM', 81),
      makePlayer('p_16', 'Randal Kolo', 23, 'ST', 82),
    ],
  },
];

const USER_TEAM_STORAGE_KEY = 'dls3d_user_team';
const CUSTOM_CLUB_STORAGE_KEY = 'dls3d_custom_club';

export function getSavedUserTeam(): TeamData {
  try {
    const raw = localStorage.getItem(USER_TEAM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TeamData;
      if (parsed && Array.isArray(parsed.players) && parsed.players.length >= 11) {
        return parsed;
      }
    }
  } catch {}
  return JSON.parse(JSON.stringify(INITIAL_TEAMS[0]));
}

export function saveUserTeam(team: TeamData): TeamData {
  try {
    localStorage.setItem(USER_TEAM_STORAGE_KEY, JSON.stringify(team));
  } catch {}
  return team;
}

export function getCustomClub(): TeamData | null {
  try {
    const raw = localStorage.getItem(CUSTOM_CLUB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TeamData;
      if (parsed && Array.isArray(parsed.players) && parsed.players.length >= 11) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function saveCustomClub(team: TeamData): TeamData {
  const marked: TeamData = { ...team, isCustom: true };
  try {
    localStorage.setItem(CUSTOM_CLUB_STORAGE_KEY, JSON.stringify(marked));
  } catch {}
  saveUserTeam(marked);
  return marked;
}

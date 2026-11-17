import React, { useState } from 'react';
import { TeamData, PlayerData, MarketPlayer } from '../types/game';
import {
  getCoins,
  saveCoins,
  getCoaches,
  addCoachFromRelease,
  getPlayerReleaseRewards,
  CoachInventory,
  DlsCardTier,
  getCardTier,
} from '../data/clubEconomy';
import { DlsPlayerCard } from './DlsPlayerCard';
import { ReleasePlayerModal } from './ReleasePlayerModal';
import { ShoppingBag, Users, Coins, Check, Search, Dumbbell, Wrench, Sparkles } from 'lucide-react';

interface TransferMarketModalProps {
  userTeam: TeamData;
  onUpdateUserTeam: (team: TeamData) => void;
  onOpenSquad?: () => void;
  onClose: () => void;
}

const GLOBAL_MARKET_PLAYERS: MarketPlayer[] = [
  // 90+ FUL KARTA (Black & Gold)
  { id: 'mkt_1', name: 'Kylian Donat', team: 'Madrid Royals', position: 'ST', rating: 93, price: 18000, attributes: { pace: 97, shooting: 92, passing: 82, dribbling: 93, defending: 36, physical: 79 } },
  { id: 'mkt_2', name: 'Erling Haal', team: 'Manchester Titans', position: 'ST', rating: 93, price: 17500, attributes: { pace: 91, shooting: 94, passing: 68, dribbling: 81, defending: 45, physical: 92 } },
  { id: 'mkt_4', name: 'Vini Junior', team: 'Madrid Royals', position: 'LW', rating: 92, price: 16500, attributes: { pace: 96, shooting: 87, passing: 83, dribbling: 94, defending: 32, physical: 70 } },
  { id: 'mkt_6', name: 'Lionel Messor', team: 'Buenos Aires FC', position: 'RW', rating: 92, price: 15000, attributes: { pace: 82, shooting: 93, passing: 94, dribbling: 95, defending: 35, physical: 65 } },
  { id: 'mkt_8', name: 'Rodri Hernan', team: 'Manchester Titans', position: 'CDM', rating: 92, price: 15500, attributes: { pace: 68, shooting: 84, passing: 90, dribbling: 85, defending: 89, physical: 88 } },
  { id: 'mkt_3', name: 'Jude Belling', team: 'Madrid Royals', position: 'CAM', rating: 91, price: 16000, attributes: { pace: 84, shooting: 86, passing: 87, dribbling: 88, defending: 78, physical: 84 } },
  { id: 'mkt_7', name: 'Kevin De Bruy', team: 'Manchester Titans', position: 'CAM', rating: 91, price: 14000, attributes: { pace: 74, shooting: 88, passing: 95, dribbling: 87, defending: 65, physical: 76 } },
  { id: 'mkt_12', name: 'Thibault Couron', team: 'Madrid Royals', position: 'GK', rating: 90, price: 12500, attributes: { pace: 52, shooting: 24, passing: 78, dribbling: 45, defending: 92, physical: 88 } },

  // 80-89 SARIQ KARTA (Gold / Yellow)
  { id: 'mkt_10', name: 'Florian Wirtz', team: 'Rhine Lions', position: 'CAM', rating: 89, price: 13500, attributes: { pace: 85, shooting: 84, passing: 89, dribbling: 91, defending: 56, physical: 70 } },
  { id: 'mkt_11', name: 'Bukayo Saka', team: 'London Gunners', position: 'RW', rating: 89, price: 13000, attributes: { pace: 89, shooting: 85, passing: 85, dribbling: 89, defending: 65, physical: 78 } },
  { id: 'mkt_5', name: 'Lamine Yamal', team: 'Catalonia FC', position: 'RW', rating: 88, price: 12000, attributes: { pace: 92, shooting: 84, passing: 86, dribbling: 93, defending: 40, physical: 67 } },
  { id: 'mkt_9', name: 'Cole Palm', team: 'London Blue', position: 'CAM', rating: 87, price: 11000, attributes: { pace: 83, shooting: 86, passing: 87, dribbling: 88, defending: 50, physical: 71 } },
  { id: 'mkt_13', name: 'Eldor Shomur', team: 'Roma Wolves', position: 'ST', rating: 81, price: 6800, attributes: { pace: 85, shooting: 82, passing: 74, dribbling: 79, defending: 42, physical: 83 } },

  // < 80 KO'K KARTA (Blue Rare / Common)
  { id: 'mkt_14', name: 'Abduqodir Xusan', team: 'Lens / Titans', position: 'CB', rating: 79, price: 4200, attributes: { pace: 86, shooting: 44, passing: 72, dribbling: 69, defending: 81, physical: 84 } },
  { id: 'mkt_15', name: 'Abbosbek Fayz', team: 'Tashkent Stars', position: 'CAM', rating: 78, price: 3600, attributes: { pace: 85, shooting: 75, passing: 80, dribbling: 84, defending: 42, physical: 63 } },
  { id: 'mkt_16', name: 'Jaloliddin Mash', team: 'Tehran / Tashkent', position: 'LW', rating: 77, price: 3200, attributes: { pace: 84, shooting: 76, passing: 78, dribbling: 82, defending: 39, physical: 68 } },
  { id: 'mkt_17', name: 'Oston Urunov', team: 'Persia United', position: 'LM', rating: 76, price: 2900, attributes: { pace: 83, shooting: 73, passing: 74, dribbling: 81, defending: 45, physical: 78 } },
  { id: 'mkt_18', name: 'Lucas Bergval', team: 'North Spurs', position: 'CM', rating: 76, price: 2800, attributes: { pace: 77, shooting: 71, passing: 79, dribbling: 79, defending: 70, physical: 74 } },
  { id: 'mkt_19', name: 'Pau Victor', team: 'Catalonia FC', position: 'ST', rating: 75, price: 2500, attributes: { pace: 79, shooting: 77, passing: 69, dribbling: 76, defending: 38, physical: 74 } },
];

export const TransferMarketModal: React.FC<TransferMarketModalProps> = ({
  userTeam,
  onUpdateUserTeam,
  onOpenSquad,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'market' | 'mysquad'>('market');
  const [coins, setCoins] = useState<number>(() => getCoins());
  const [coaches, setCoaches] = useState<CoachInventory>(() => getCoaches());
  const [filterPos, setFilterPos] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<'all' | DlsCardTier>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [releaseCandidate, setReleaseCandidate] = useState<PlayerData | null>(null);

  const showToast = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleBuyPlayer = (mkt: MarketPlayer) => {
    if (coins < mkt.price) {
      showToast('Yetarli tanga mavjud emas! Match yutib koin to\'plang.');
      return;
    }

    if (userTeam.players.some(p => p.name === mkt.name)) {
      showToast('Bu futbolchi allaqachon jamoangizda bor!');
      return;
    }

    const newPlayer: PlayerData = {
      id: `p_${Date.now()}`,
      name: mkt.name,
      number: Math.floor(10 + Math.random() * 88),
      position: mkt.position,
      rating: mkt.rating,
      attributes: mkt.attributes,
      stamina: 100,
    };

    const updatedPlayers = [...userTeam.players, newPlayer];
    const updatedTeam = { ...userTeam, players: updatedPlayers };

    const nextCoins = saveCoins(coins - mkt.price);
    setCoins(nextCoins);
    onUpdateUserTeam(updatedTeam);
    showToast(
      `${mkt.name} (${mkt.rating}) jamoangizga qo'shildi! Endi "Mening Jamoam" da uni Tarkibga qo'yishingiz yoki Fitsec/Technacol/Koin uchun sotishingiz mumkin.`
    );
  };

  const handleConfirmRelease = (choice: 'fitsec' | 'technacol' | 'coins') => {
    if (!releaseCandidate) return;
    if (userTeam.players.length <= 11) {
      showToast('Asosiy tarkibda kamida 11 nafar futbolchi qolishi shart!');
      setReleaseCandidate(null);
      return;
    }

    const target = releaseCandidate;
    const updatedPlayers = userTeam.players.filter(p => p.id !== target.id);
    const updatedTeam = { ...userTeam, players: updatedPlayers };
    onUpdateUserTeam(updatedTeam);

    if (choice === 'coins') {
      const { coinsValue } = getPlayerReleaseRewards(target.rating);
      const nextCoins = saveCoins(coins + coinsValue);
      setCoins(nextCoins);
      showToast(`${target.name} koin uchun sotildi! (+${coinsValue.toLocaleString()} Koin qo'shildi)`);
    } else if (choice === 'fitsec') {
      const { coaches: nextCoaches, addedUnits } = addCoachFromRelease('fitsec', target.rating);
      setCoaches(nextCoaches);
      showToast(`${target.name} -> +${addedUnits} ta Fitsec kuchaytirishga aylantirildi! Tarkibga o'tib bosing.`);
    } else {
      const { coaches: nextCoaches, addedUnits } = addCoachFromRelease('technacol', target.rating);
      setCoaches(nextCoaches);
      showToast(`${target.name} -> +${addedUnits} ta Technacol kuchaytirishga aylantirildi! Tarkibga o'tib bosing.`);
    }

    setReleaseCandidate(null);
  };

  const toPlayerData = (mkt: MarketPlayer): PlayerData => ({
    id: mkt.id,
    name: mkt.name,
    number: 99,
    position: mkt.position,
    rating: mkt.rating,
    attributes: mkt.attributes,
    stamina: 100,
  });

  const filteredMarket = GLOBAL_MARKET_PLAYERS.filter(p => {
    const matchesPos = filterPos === 'all' || p.position === filterPos;
    const matchesTier = filterTier === 'all' || getCardTier(p.rating).tier === filterTier;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.team.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPos && matchesTier && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-athletic text-2xl font-black uppercase tracking-wider text-white">
                Transfer Bozori · DLS Kartalar
              </h2>
              <span className="text-xs text-slate-400">
                90+ Ful Karta · 80-89 Sariq Karta · &lt;80 Ko&apos;k Karta
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Coach Balances */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-xs font-bold text-emerald-300">
              <Dumbbell className="w-3.5 h-3.5" />
              <span className="font-mono-numbers">Fitsec: {coaches.fitsec}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-950/70 border border-sky-500/40 text-xs font-bold text-sky-300">
              <Wrench className="w-3.5 h-3.5" />
              <span className="font-mono-numbers">Technacol: {coaches.technacol}</span>
            </div>

            {/* Coin Balance Badge */}
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/50 shadow-inner">
              <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-mono-numbers text-sm font-black text-amber-300">
                {coins.toLocaleString()}
              </span>
            </div>

            {onOpenSquad && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSquad();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tarkib & Kuchaytirish</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 whitespace-nowrap shrink-0"
            >
              Yopish
            </button>
          </div>
        </div>

        {/* Status Notification Message */}
        {message && (
          <div className="bg-sky-600/95 text-white text-xs font-bold py-2.5 px-6 text-center shadow-lg">
            {message}
          </div>
        )}

        {/* Tab Switcher & Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-6 py-3 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('market')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'market' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Transfer Bozori</span>
            </button>

            <button
              onClick={() => setActiveTab('mysquad')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'mysquad' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Mening Jamoam ({userTeam.players.length})</span>
            </button>
          </div>

          {activeTab === 'market' && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Futbolchi qidirish..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={filterTier}
                onChange={e => setFilterTier(e.target.value as 'all' | DlsCardTier)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-slate-300 focus:outline-none"
              >
                <option value="all">Hamma Kartalar</option>
                <option value="ful">90+ Ful Karta</option>
                <option value="sariq">80-89 Sariq Karta</option>
                <option value="kok">&lt;80 Ko&apos;k Karta</option>
              </select>

              <select
                value={filterPos}
                onChange={e => setFilterPos(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-slate-300 focus:outline-none"
              >
                <option value="all">Hamma Amplua</option>
                <option value="ST">ST</option>
                <option value="LW">LW</option>
                <option value="RW">RW</option>
                <option value="LM">LM</option>
                <option value="CAM">CAM</option>
                <option value="CM">CM</option>
                <option value="CDM">CDM</option>
                <option value="CB">CB</option>
                <option value="LB">LB</option>
                <option value="RB">RB</option>
                <option value="GK">GK</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Global Transfer Market with DLS Cards */}
        {activeTab === 'market' && (
          <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMarket.map(player => {
              const inSquad = userTeam.players.some(p => p.name === player.name);
              const playerObj = toPlayerData(player);
              return (
                <DlsPlayerCard
                  key={player.id}
                  player={playerObj}
                  clubTag={player.team}
                  primaryColor={userTeam.primaryColor}
                  secondaryColor={userTeam.secondaryColor}
                  footer={
                    <button
                      disabled={inSquad}
                      onClick={() => handleBuyPlayer(player)}
                      className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all shadow-md whitespace-nowrap ${
                        inSquad
                          ? 'bg-slate-950/70 text-slate-400 cursor-not-allowed border border-white/10'
                          : coins >= player.price
                          ? 'bg-slate-950 hover:bg-slate-900 text-amber-300 border border-amber-400/60 active:scale-98'
                          : 'bg-slate-950/70 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {inSquad ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Tarkibda mavjud</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-3.5 h-3.5 fill-current" />
                          <span>Sotib olish: {player.price.toLocaleString()}</span>
                        </>
                      )}
                    </button>
                  }
                />
              );
            })}
          </div>
        )}

        {/* Tab 2: My Squad / Roster with DLS Cards + Release Choices (Fitsec / Technacol / Koin) */}
        {activeTab === 'mysquad' && (
          <div className="p-6 overflow-y-auto flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span>
                Jamoa: <strong className="text-white">{userTeam.name}</strong> ({userTeam.players.length} ta futbolchi)
              </span>
              <span className="text-sky-300 font-semibold">
                Futbolchini sotsangiz: <strong>Fitsec</strong>, <strong>Technacol</strong> yoki <strong>Koin uchun</strong> tanlashingiz mumkin!
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userTeam.players.map((p, idx) => {
                const { coinsValue } = getPlayerReleaseRewards(p.rating);
                const isStarter = idx < 11;
                return (
                  <DlsPlayerCard
                    key={p.id}
                    player={p}
                    clubTag={isStarter ? 'ASOSIY TARKIB' : 'ZAXIRA'}
                    primaryColor={userTeam.primaryColor}
                    secondaryColor={userTeam.secondaryColor}
                    compact
                    footer={
                      <button
                        onClick={() => setReleaseCandidate(p)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-950/90 hover:bg-rose-950 text-white hover:text-rose-200 border border-white/20 hover:border-rose-400 text-[11px] font-black uppercase tracking-wide transition-colors flex items-center justify-between"
                      >
                        <span>Sotish / Kuchaytirishga</span>
                        <span className="text-amber-300 font-mono-numbers">{coinsValue} / Coach</span>
                      </button>
                    }
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3-Choice Player Release Dialog: Fitsec / Technacol / Koin uchun */}
      {releaseCandidate && (
        <ReleasePlayerModal
          player={releaseCandidate}
          clubTag={userTeam.name}
          primaryColor={userTeam.primaryColor}
          secondaryColor={userTeam.secondaryColor}
          onChoose={handleConfirmRelease}
          onClose={() => setReleaseCandidate(null)}
        />
      )}
    </div>
  );
};

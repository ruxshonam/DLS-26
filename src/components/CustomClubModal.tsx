import React, { useState } from 'react';
import { KitPattern, TeamData } from '../types/game';
import { saveCustomClub } from '../data/teamsData';
import { Check, Palette, Shield, X } from 'lucide-react';

interface CustomClubModalProps {
  currentTeam: TeamData;
  onSaveClub: (club: TeamData) => void;
  onClose: () => void;
}

const PATTERNS: { id: KitPattern; label: string }[] = [
  { id: 'solid', label: 'Bir xil (Solid)' },
  { id: 'stripes', label: 'Vertikal Chiziqli' },
  { id: 'hoops', label: 'Gorizontal Yo\'lli' },
  { id: 'sash', label: 'Diagonal Lenta' },
];

export const CustomClubModal: React.FC<CustomClubModalProps> = ({
  currentTeam,
  onSaveClub,
  onClose,
}) => {
  const [name, setName] = useState(currentTeam.name);
  const [shortName, setShortName] = useState(currentTeam.shortName);
  const [stadiumName, setStadiumName] = useState(currentTeam.stadiumName);
  const [primaryColor, setPrimaryColor] = useState(currentTeam.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(currentTeam.secondaryColor);
  const [gkColor, setGkColor] = useState(currentTeam.gkColor);
  const [pattern, setPattern] = useState<KitPattern>(currentTeam.pattern);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: TeamData = {
      ...currentTeam,
      name: name.trim() || 'Turon FC',
      shortName: (shortName.trim().toUpperCase().slice(0, 3) || 'TUR'),
      stadiumName: stadiumName.trim() || 'Turon Arena 3D',
      primaryColor,
      secondaryColor,
      gkColor,
      pattern,
      isCustom: true,
    };
    saveCustomClub(updated);
    onSaveClub(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-sky-400" />
            <h2 className="font-athletic text-2xl font-black uppercase tracking-wider text-white">
              Klub va Forma Yaratish
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Klub Nomi</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={24}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Qisqa (3 harf)</label>
              <input
                type="text"
                value={shortName}
                onChange={e => setShortName(e.target.value.toUpperCase())}
                maxLength={3}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-sm uppercase"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Stadion Nomi</label>
            <input
              type="text"
              value={stadiumName}
              onChange={e => setStadiumName(e.target.value)}
              maxLength={28}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-sm"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-2">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Forma Dizayni</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PATTERNS.map(pt => (
                <button
                  type="button"
                  key={pt.id}
                  onClick={() => setPattern(pt.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                    pattern === pt.id
                      ? 'bg-sky-600 border-sky-300 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Asosiy Rang</label>
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-full h-10 rounded-lg bg-slate-950 border border-slate-700 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Ikkinchi Rang</label>
              <input
                type="color"
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                className="w-full h-10 rounded-lg bg-slate-950 border border-slate-700 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Darvozabon</label>
              <input
                type="color"
                value={gkColor}
                onChange={e => setGkColor(e.target.value)}
                className="w-full h-10 rounded-lg bg-slate-950 border border-slate-700 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-athletic text-lg font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
          >
            <Check className="w-5 h-5" />
            <span>Klubni Saqlash</span>
          </button>
        </form>
      </div>
    </div>
  );
};

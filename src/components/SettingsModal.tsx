import React from 'react';
import { AIDifficulty, CameraMode, GameSettings } from '../types/game';
import { Settings, X } from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (updated: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const update = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: val });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-sky-400" />
            <h2 className="font-athletic text-2xl font-black uppercase tracking-wider text-white">
              O&apos;yin Sozlamalari
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Kamera Burchagi</label>
              <select
                value={settings.cameraMode}
                onChange={e => update('cameraMode', e.target.value as CameraMode)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-white"
              >
                <option value="broadcast">Broadcast (DLS)</option>
                <option value="tv_wide">TV Keng</option>
                <option value="pro">Pro Kamera</option>
                <option value="action">Action</option>
                <option value="sideline">Yon Chiziq</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">AI Qiyinchiligi</label>
              <select
                value={settings.difficulty}
                onChange={e => update('difficulty', e.target.value as AIDifficulty)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-white"
              >
                <option value="amateur">Havaskor</option>
                <option value="pro">Professional</option>
                <option value="world_class">Jahon Darajasi</option>
                <option value="legendary">Afsonaviy</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">O&apos;yin Davomiyligi</label>
              <select
                value={settings.matchDurationMinutes}
                onChange={e => update('matchDurationMinutes', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-white"
              >
                <option value={2}>2 daqiqa (Tez)</option>
                <option value={3}>3 daqiqa (Standart)</option>
                <option value={5}>5 daqiqa (Uzun)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Sharhlovchi Tili</label>
              <select
                value={settings.commentaryLanguage}
                onChange={e => update('commentaryLanguage', e.target.value as 'uz' | 'en')}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-white"
              >
                <option value="uz">O&apos;zbekcha</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <label className="flex items-center justify-between text-xs font-bold text-slate-200 cursor-pointer">
              <span>Sharhlovchi ovozi (Commentary)</span>
              <input
                type="checkbox"
                checked={settings.commentaryEnabled}
                onChange={e => update('commentaryEnabled', e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
            </label>
            <label className="flex items-center justify-between text-xs font-bold text-slate-200 cursor-pointer">
              <span>Mini-Xarita Radar</span>
              <input
                type="checkbox"
                checked={settings.showRadar}
                onChange={e => update('showRadar', e.target.checked)}
                className="w-4 h-4 accent-sky-500"
              />
            </label>
            <label className="flex items-center justify-between text-xs font-bold text-slate-200 cursor-pointer">
              <span>Avto O&apos;yinchi Almashtirish</span>
              <input
                type="checkbox"
                checked={settings.autoSwitch}
                onChange={e => update('autoSwitch', e.target.checked)}
                className="w-4 h-4 accent-sky-500"
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Effektlar Ovozi (SFX)</span>
              <span className="font-mono-numbers">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sfxVolume}
              onChange={e => update('sfxVolume', Number(e.target.value))}
              className="w-full accent-sky-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Stadion Muxlislari Shovqini</span>
              <span className="font-mono-numbers">{Math.round(settings.crowdVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.crowdVolume}
              onChange={e => update('crowdVolume', Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

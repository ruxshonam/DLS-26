import React from 'react';
import { PlayerData } from '../types/game';
import { getCardTier } from '../data/clubEconomy';

interface DlsPlayerCardProps {
  player: PlayerData;
  clubTag?: string;
  primaryColor?: string;
  secondaryColor?: string;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
  footer?: React.ReactNode;
}

export const DlsPlayerCard: React.FC<DlsPlayerCardProps> = ({
  player,
  clubTag,
  primaryColor = '#0284c7',
  secondaryColor = '#0f172a',
  compact = false,
  selected = false,
  onClick,
  footer,
}) => {
  const tier = getCardTier(player.rating);
  const skin = player.skinTone || '#e0b892';
  const hair = player.hairColor || '#1c150e';

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl border-2 overflow-hidden transition-all flex flex-col justify-between ${
        tier.cardBg
      } ${tier.borderClass} ${selected ? 'ring-2 ring-white scale-[1.01]' : ''} ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      } ${compact ? 'p-3 gap-2' : 'p-4 gap-3'}`}
    >
      {/* Subtle Foil Diagonal Highlight for 90+ Ful Karta */}
      {tier.tier === 'ful' && (
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              'linear-gradient(125deg, transparent 25%, rgba(251, 191, 36, 0.55) 45%, transparent 65%)',
          }}
        />
      )}

      {/* Top Section: Rating + Position + Card Tier Badge + Player Silhouette Avatar */}
      <div className="relative flex items-start justify-between gap-2 z-10">
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1.5">
            <div
              className={`px-2.5 py-0.5 rounded-lg font-mono-numbers font-black leading-tight shadow-md ${
                compact ? 'text-xl' : 'text-2xl'
              } ${tier.ovrBg} ${tier.ovrText}`}
            >
              {player.rating}
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${tier.pillBg}`}
            >
              {player.position}
            </span>
          </div>

          <span
            className={`mt-1.5 text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${tier.pillBg}`}
          >
            {tier.label}
          </span>

          <h3
            className={`mt-1.5 font-athletic font-black uppercase tracking-wide leading-none truncate ${
              compact ? 'text-base max-w-[130px]' : 'text-xl max-w-[155px]'
            } ${tier.nameText}`}
            title={player.name}
          >
            {player.name}
          </h3>

          <div className={`flex items-center gap-1.5 text-[10px] font-bold mt-0.5 ${tier.subText}`}>
            <span className="font-mono-numbers">#{player.number}</span>
            {clubTag && (
              <>
                <span>·</span>
                <span className="truncate max-w-[110px]">{clubTag}</span>
              </>
            )}
          </div>
        </div>

        {/* Stylized DLS Player Portrait Avatar */}
        <div
          className={`relative shrink-0 rounded-xl bg-black/25 border border-white/20 flex items-end justify-center overflow-hidden shadow-inner ${
            compact ? 'w-14 h-16' : 'w-18 h-20'
          }`}
        >
          <svg viewBox="0 0 64 72" className="w-full h-full">
            {/* Shoulders / Jersey */}
            <path
              d="M8 72 C8 50, 20 45, 32 45 C44 45, 56 50, 56 72 Z"
              fill={player.position === 'GK' ? '#10b981' : primaryColor}
              stroke={secondaryColor}
              strokeWidth="2"
            />
            {/* Jersey Collar */}
            <path d="M24 46 L32 54 L40 46 Z" fill={secondaryColor} />
            {/* Neck */}
            <rect x="27" y="36" width="10" height="12" rx="3" fill={skin} />
            {/* Head */}
            <ellipse cx="32" cy="26" rx="12" ry="14" fill={skin} />
            {/* Hair */}
            <path
              d="M20 24 C20 11, 44 11, 44 24 C42 18, 22 18, 20 24 Z"
              fill={hair}
            />
            {/* Eyes */}
            <circle cx="27.5" cy="26" r="1.4" fill="#0f172a" />
            <circle cx="36.5" cy="26" r="1.4" fill="#0f172a" />
            {/* Jersey Number micro print */}
            <text
              x="32"
              y="66"
              textAnchor="middle"
              fontSize="11"
              fontWeight="900"
              fill={primaryColor === '#FFFFFF' ? '#0f172a' : '#ffffff'}
              fontFamily="monospace"
            >
              {player.number}
            </text>
          </svg>
        </div>
      </div>

      {/* 6 Attributes Mini-Grid */}
      <div className="relative z-10 grid grid-cols-3 gap-1 text-[10px] font-mono-numbers">
        {[
          { k: 'TEZ', v: player.attributes.pace },
          { k: 'ZAR', v: player.attributes.shooting },
          { k: 'PAS', v: player.attributes.passing },
          { k: 'DRI', v: player.attributes.dribbling },
          { k: 'HIM', v: player.attributes.defending },
          { k: 'JIS', v: player.attributes.physical },
        ].map(stat => (
          <div
            key={stat.k}
            className={`px-2 py-1 rounded-md flex items-center justify-between ${tier.statBg}`}
          >
            <span className="text-slate-300 font-sans text-[9px] font-bold">{stat.k}</span>
            <strong className={tier.statText}>{stat.v}</strong>
          </div>
        ))}
      </div>

      {/* Optional Footer Slot */}
      {footer && <div className="relative z-10 pt-1">{footer}</div>}
    </div>
  );
};

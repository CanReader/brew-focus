import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Lock } from 'lucide-react';
import { CoffeeCup } from './CoffeeCup';
import { useSettingsStore } from '../../store/settingsStore';
import { useCoffeeCupCatalogStore } from '../../store/coffeeCupCatalogStore';
import { CoffeeCupVariant } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SKELETON_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;

export const CoffeeCupPicker: React.FC<Props> = ({ open, onClose }) => {
  const { settings, updateSettings } = useSettingsStore();
  const { catalog, isLoaded, isFromFallback } = useCoffeeCupCatalogStore();
  const current = settings.coffeeCupVariant ?? 'classic';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const pick = (id: string) => {
    updateSettings({ coffeeCupVariant: id });
    setTimeout(onClose, 220);
  };

  const showSkeletons = !isLoaded;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cup-picker-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            key="cup-picker-card"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full mx-4 rounded-3xl overflow-hidden"
            style={{
              maxWidth: 760,
              background: 'var(--card)',
              border: '1px solid var(--brd2)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset',
            }}
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: `linear-gradient(90deg, transparent, var(--accent), transparent)`, opacity: 0.7 }}
            />

            {/* Header */}
            <div className="px-7 pt-6 pb-4 flex items-start justify-between">
              <div className="pr-4">
                <h2
                  className="font-fraunces text-[26px] leading-tight"
                  style={{
                    background: 'linear-gradient(135deg, var(--t) 0%, var(--t2) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Pick your cup
                </h2>
                <p className="text-[12px] mt-1 max-w-[460px]" style={{ color: 'var(--t3)' }}>
                  Add new cups by uploading to your Storage bucket — they appear here automatically.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors shrink-0"
                style={{ color: 'var(--t3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-h)'; e.currentTarget.style.color = 'var(--t)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-3 px-6 pb-4">
              {showSkeletons
                ? SKELETON_KEYS.map((k) => <CupSkeleton key={k} />)
                : catalog.map((v) => (
                    <CupTile
                      key={v.id}
                      variant={v}
                      selected={v.id === current}
                      onPick={() => pick(v.id)}
                    />
                  ))}
            </div>

            {/* Optional fallback banner */}
            {isLoaded && isFromFallback && (
              <div
                className="mx-6 mb-4 px-3 py-2 rounded-xl text-[11.5px] flex items-center gap-2"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--brd)',
                  color: 'var(--t3)',
                }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--t3)' }}
                />
                Defaults — sign in to sync your custom cups.
              </div>
            )}

            {/* Footer hint */}
            <div
              className="px-7 py-3 flex items-center justify-between text-[11px]"
              style={{ borderTop: '1px solid var(--brd)', color: 'var(--t3)', background: 'rgba(0,0,0,0.18)' }}
            >
              <span>Tap any cup to switch.</span>
              <span>
                Press{' '}
                <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--card-h)' }}>Esc</kbd>{' '}
                to close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Tile ─────────────────────────────────────────────────────────────────────

interface TileProps {
  variant: CoffeeCupVariant;
  selected: boolean;
  onPick: () => void;
}

const CupTile: React.FC<TileProps> = ({ variant, selected, onPick }) => {
  return (
    <motion.button
      onClick={onPick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="relative flex flex-col items-center rounded-2xl py-4 px-3 group"
      style={{
        background: selected ? 'var(--card-h)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--brd)'}`,
        boxShadow: selected
          ? '0 0 0 3px rgba(255,77,77,0.12), 0 8px 24px rgba(255,77,77,0.16)'
          : 'none',
        transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
      }}
      aria-pressed={selected}
      aria-label={`${variant.label}${variant.isPremium ? ' (premium)' : ''}`}
    >
      {selected && (
        <span
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full"
          style={{ background: 'var(--accent)' }}
        >
          <Check size={11} color="#fff" strokeWidth={3} />
        </span>
      )}
      {!selected && variant.isPremium && (
        <span
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full"
          style={{
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid var(--brd2)',
            color: 'var(--t2)',
          }}
          title="Premium"
        >
          <Lock size={10} strokeWidth={2.5} />
        </span>
      )}
      <div
        className="transition-transform"
        style={{ filter: selected ? 'none' : 'brightness(0.95)' }}
      >
        <CoffeeCup
          variantId={variant.id}
          progress={0.6}
          isRunning={false}
          size={110}
        />
      </div>
      <span
        className="text-[13px] font-medium mt-1 truncate max-w-full"
        style={{ color: selected ? 'var(--t)' : 'var(--t2)' }}
      >
        {variant.label}
      </span>
      <span
        className="text-[10.5px] mt-0.5 truncate max-w-full"
        style={{ color: 'var(--t3)' }}
      >
        {variant.subtitle}
      </span>
    </motion.button>
  );
};

// ── Skeleton ─────────────────────────────────────────────────────────────────

const CupSkeleton: React.FC = () => (
  <div
    className="relative flex flex-col items-center rounded-2xl py-4 px-3 cup-skeleton"
    style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--brd)',
    }}
  >
    <div
      className="rounded-full"
      style={{
        width: 110,
        height: 110,
        background:
          'radial-gradient(circle at 50% 55%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 60%, transparent 75%)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
    />
    <div
      className="mt-2 h-3 rounded"
      style={{ width: 60, background: 'rgba(255,255,255,0.06)' }}
    />
    <div
      className="mt-1.5 h-2 rounded"
      style={{ width: 80, background: 'rgba(255,255,255,0.04)' }}
    />
  </div>
);

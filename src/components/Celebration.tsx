import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { useTimerStore } from '../store/timerStore';
import { useSettingsStore } from '../store/settingsStore';
import { ACCENT_COLORS, ACCENT_COLORS_LIGHT } from '../types';
import { getTheme, DEFAULT_THEME_ID } from '../utils/themes';
import { inkOn } from '../utils/ink';

export type CelebrationKind = 'work' | 'break' | null;

interface Props {
  kind: CelebrationKind;
  /** Session to attach a mood rating to. Null when there is nothing to rate. */
  sessionId: string | null;
  /** Length of the completed work session, in seconds. */
  focusedSeconds: number;
  onDismiss: () => void;
}

const MOODS = ['😴', '😐', '🙂', '😊', '🔥'] as const;

export const Celebration: React.FC<Props> = ({ kind, sessionId, focusedSeconds, onDismiss }) => {
  const { t } = useTranslation('focus');
  const rateMood = useTimerStore((s) => s.rateMood);
  const todayFocusSeconds = useTimerStore((s) => s.todayFocusSeconds);
  const { settings } = useSettingsStore();
  const [rated, setRated] = useState(false);

  // The accent actually painted on the pill — tier included — so ink is derived
  // from the real fill rather than assumed.
  const accentHex = useMemo(() => {
    const isLight = getTheme(settings.theme ?? DEFAULT_THEME_ID).category === 'light';
    const table = isLight ? ACCENT_COLORS_LIGHT : ACCENT_COLORS;
    return table[settings.accentColor] ?? table.caramel;
  }, [settings.theme, settings.accentColor]);
  const accentInk = useMemo(() => inkOn(accentHex), [accentHex]);

  useEffect(() => {
    if (kind !== 'work') return;
    confetti({
      particleCount: 90,
      spread: 74,
      origin: { x: 0.5, y: 0.52 },
      colors: [accentHex, '#f6e9da', '#c4a183'],
      scalar: 1.05,
      zIndex: 10000,
    });
  }, [kind, accentHex]);

  // The break toast is transient; the work celebration waits for the user.
  useEffect(() => {
    if (kind !== 'break') return;
    const id = setTimeout(onDismiss, 1800);
    return () => clearTimeout(id);
  }, [kind, onDismiss]);

  useEffect(() => {
    if (!kind) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kind, onDismiss]);

  useEffect(() => {
    if (!kind) setRated(false);
  }, [kind]);

  const minutes = Math.max(1, Math.round(focusedSeconds / 60));
  const todayMinutes = Math.round(todayFocusSeconds / 60);

  return (
    <AnimatePresence>
      {kind && (
        <motion.div
          key={kind}
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          onClick={onDismiss}
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 45%, rgba(var(--accent-rgb),0.20) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.78) 100%)`,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <motion.div
            className="flex flex-col items-center text-center px-8"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            {kind === 'work' ? (
              <>
                <div
                  className="font-fraunces"
                  style={{ fontSize: 40, fontWeight: 600, color: 'var(--t)', lineHeight: 1.1 }}
                >
                  {t('celebration.title')}
                </div>
                <div className="mt-2 text-[14px]" style={{ color: 'var(--t2)' }}>
                  {t('celebration.subtitle', { minutes })}
                </div>
                <div className="mt-1 text-[12px]" style={{ color: 'var(--t3)' }}>
                  {t('celebration.today', { minutes: todayMinutes })}
                </div>

                {sessionId && !rated && (
                  <div className="mt-6 flex flex-col items-center gap-2">
                    <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
                      {t('celebration.moodPrompt')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {MOODS.map((emoji, i) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            rateMood(sessionId, i + 1);
                            setRated(true);
                          }}
                          className="w-10 h-10 flex items-center justify-center rounded-xl text-[19px] transition-transform"
                          style={{ background: 'rgba(var(--srf-rgb),0.08)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.14)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                          aria-label={t('celebration.moodAria', { n: i + 1 })}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={onDismiss}
                  className="mt-7 px-6 h-11 rounded-full text-[13px] font-semibold transition-transform"
                  style={{ background: accentHex, color: accentInk }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                >
                  {t('celebration.continue')}
                </button>
                <div className="mt-3 text-[11px]" style={{ color: 'var(--t3)' }}>
                  {t('celebration.dismissHint')}
                </div>
              </>
            ) : (
              <div
                className="px-7 py-5 rounded-2xl flex flex-col items-center gap-1"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--brd2)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
                }}
              >
                <span style={{ fontSize: 28 }}>☕</span>
                <div className="font-fraunces" style={{ fontSize: 20, fontWeight: 600, color: 'var(--t)' }}>
                  {t('celebration.breakOver')}
                </div>
                <div className="text-[12px]" style={{ color: 'var(--t3)' }}>
                  {t('celebration.breakOverSub')}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

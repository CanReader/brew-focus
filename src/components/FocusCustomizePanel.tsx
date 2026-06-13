import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Image, Play, Plus, Upload, Waves } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { SOUND_OPTIONS, playSoundOption, playCustomSoundFile } from '../utils/soundOptions';
import { NOISE_OPTIONS, setNoiseVolume } from '../utils/backgroundNoise';
import { BACKGROUNDS } from '../utils/backgrounds';
import { AppSettings } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'sounds' | 'noise' | 'background';

type SoundEventKey = 'sessionStartSound' | 'breakStartSound' | 'sessionCompleteSound' | 'breakCompleteSound';

const SOUND_EVENTS: { key: SoundEventKey; labelKey: string; descKey: string }[] = [
  { key: 'sessionStartSound',    labelKey: 'sessionStart',    descKey: 'sessionStartDesc' },
  { key: 'breakStartSound',      labelKey: 'breakStart',      descKey: 'breakStartDesc' },
  { key: 'sessionCompleteSound', labelKey: 'sessionComplete', descKey: 'sessionCompleteDesc' },
  { key: 'breakCompleteSound',   labelKey: 'breakComplete',   descKey: 'breakCompleteDesc' },
];

export const FocusCustomizePanel: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('focus');
  const { settings, updateSettings } = useSettingsStore();
  const [tab, setTab] = useState<Tab>('sounds');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const soundFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Custom backgrounds/sounds are base64-inlined into the settings JSONB row,
  // so an unbounded file bloats every settings read and sync. Cap them.
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  const MAX_SOUND_BYTES = 1 * 1024 * 1024;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleCustomImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) { setUploadError(t('customize.imageTooLarge')); return; }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateSettings({ backgroundId: 'custom', customBackgroundDataUrl: ev.target?.result as string } as Partial<AppSettings>);
    };
    reader.readAsDataURL(file);
  };

  const handleCustomSound = (eventKey: SoundEventKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_SOUND_BYTES) { setUploadError(t('customize.soundTooLarge')); return; }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const newCustomFiles = { ...(settings.customSoundFiles ?? {}), [eventKey]: { name: file.name, dataUrl } };
      updateSettings({
        [eventKey]: 'custom',
        customSoundFiles: newCustomFiles,
      } as Partial<AppSettings>);
      playCustomSoundFile(dataUrl, settings.soundVolume ?? 70);
    };
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(8,8,16,0.80)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ duration: 0.20, ease: [0.4, 0, 0.2, 1] }}
            className="w-[540px] max-h-[84vh] rounded-2xl flex flex-col overflow-hidden relative"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--brd2)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
            }}
          >
            {/* Gradient top border */}
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, var(--accent), var(--blu), transparent)' }}
            />

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 shrink-0"
              style={{ borderBottom: '1px solid var(--brd)' }}
            >
              <div>
                <h2 className="text-[14px] font-bold" style={{ color: 'var(--t)' }}>{t('customize.title')}</h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>{t('customize.subtitle')}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                style={{ color: 'var(--t3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--t)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Upload error banner */}
            <AnimatePresence>
              {uploadError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-5 py-2.5 text-[12px] shrink-0"
                  style={{ background: 'rgba(255,77,77,0.08)', borderBottom: '1px solid rgba(255,77,77,0.2)', color: '#ff6b6b' }}
                  role="alert"
                >
                  {uploadError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tab bar */}
            <div
              className="flex gap-1 px-4 py-2.5 shrink-0"
              style={{ borderBottom: '1px solid var(--brd)' }}
            >
              {([
                { key: 'sounds' as Tab,     label: t('customize.tabs.sounds'),     icon: <Music size={13} /> },
                { key: 'noise' as Tab,      label: t('customize.tabs.noise'),      icon: <Waves size={13} /> },
                { key: 'background' as Tab, label: t('customize.tabs.background'), icon: <Image size={13} /> },
              ]).map((tabDef) => {
                const isActive = tab === tabDef.key;
                return (
                  <button
                    key={tabDef.key}
                    onClick={() => setTab(tabDef.key)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-medium transition-all"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: isActive ? 'var(--t)' : 'var(--t3)',
                      border: isActive ? '1px solid var(--brd2)' : '1px solid transparent',
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    {tabDef.icon}
                    {tabDef.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.14 }}
              >
                {/* ── Sounds tab ── */}
                {tab === 'sounds' && (
                  <div className="flex flex-col gap-3.5">
                    {SOUND_EVENTS.map((event) => {
                      const currentId = (settings[event.key as keyof AppSettings] as string) ?? 'none';
                      const customFile = settings.customSoundFiles?.[event.key];

                      return (
                        <div
                          key={event.key}
                          className="rounded-2xl p-3.5"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--brd)' }}
                        >
                          {/* Row header */}
                          <div className="flex items-start justify-between mb-2.5">
                            <div>
                              <div className="text-[13px] font-semibold" style={{ color: 'var(--t)' }}>{t(`customize.soundEvents.${event.labelKey}`)}</div>
                              <div className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>{t(`customize.soundEvents.${event.descKey}`)}</div>
                            </div>
                            {/* Upload button */}
                            <button
                              onClick={() => soundFileRefs.current[event.key]?.click()}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all shrink-0"
                              style={{
                                background: currentId === 'custom' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                                color: currentId === 'custom' ? 'var(--t)' : 'var(--t3)',
                                border: currentId === 'custom' ? '1px solid var(--brd2)' : '1px solid var(--brd)',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = currentId === 'custom' ? 'var(--t)' : 'var(--t3)';
                                e.currentTarget.style.background = currentId === 'custom' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
                              }}
                              title={t('customize.uploadHint')}
                            >
                              <Upload size={10} />
                              {currentId === 'custom' && customFile
                                ? <span className="max-w-[90px] truncate">{customFile.name}</span>
                                : t('customize.upload')}
                            </button>
                            <input
                              ref={(el) => { soundFileRefs.current[event.key] = el; }}
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => handleCustomSound(event.key, e)}
                            />
                          </div>

                          {/* Built-in sound chips */}
                          <div className="flex flex-wrap gap-1.5">
                            {SOUND_OPTIONS.map((opt) => {
                              const isSelected = currentId === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    updateSettings({ [event.key]: opt.id } as Partial<AppSettings>);
                                    if (opt.id !== 'none') playSoundOption(opt.id, settings.soundVolume ?? 70);
                                  }}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12px] font-medium transition-all"
                                  style={{
                                    background: isSelected ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                                    color: isSelected ? 'var(--t)' : 'var(--t3)',
                                    border: `1px solid ${isSelected ? 'var(--brd2)' : 'var(--brd)'}`,
                                  }}
                                  onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; } }}
                                  onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
                                  title={opt.description}
                                >
                                  {opt.id !== 'none' && <Play size={9} style={{ opacity: 0.6 }} />}
                                  {opt.name}
                                </button>
                              );
                            })}
                            {/* Custom chip — shown when a file is uploaded */}
                            {customFile && (
                              <button
                                onClick={() => {
                                  updateSettings({ [event.key]: 'custom' } as Partial<AppSettings>);
                                  playCustomSoundFile(customFile.dataUrl, settings.soundVolume ?? 70);
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12px] font-medium transition-all"
                                style={{
                                  background: currentId === 'custom' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                                  color: currentId === 'custom' ? 'var(--t)' : 'var(--t3)',
                                  border: `1px solid ${currentId === 'custom' ? 'var(--brd2)' : 'var(--brd)'}`,
                                }}
                                onMouseEnter={(e) => { if (currentId !== 'custom') { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; } }}
                                onMouseLeave={(e) => { if (currentId !== 'custom') { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
                              >
                                <Play size={9} style={{ opacity: 0.6 }} />
                                {t('customize.myFile')}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Noise tab ── */}
                {tab === 'noise' && (
                  <div className="flex flex-col gap-4">
                    {/* Volume row */}
                    <div
                      className="rounded-2xl p-3.5"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--brd)' }}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--t)' }}>{t('customize.noiseVolume')}</span>
                        <span className="text-[12px] font-medium tabular-nums" style={{ color: 'var(--t3)' }}>
                          {settings.noiseVolume ?? 50}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={settings.noiseVolume ?? 50}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updateSettings({ noiseVolume: v } as Partial<AppSettings>);
                          setNoiseVolume(v); // immediate feedback without restarting
                        }}
                        className="w-full h-1 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <p className="text-[11px] mt-2" style={{ color: 'var(--t3)' }}>
                        {t('customize.noiseVolumeDesc')}
                      </p>
                    </div>

                    {/* Noise grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {NOISE_OPTIONS.map((opt) => {
                        const isSelected = (settings.backgroundNoise ?? 'none') === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => {
                              updateSettings({ backgroundNoise: opt.id } as Partial<AppSettings>);
                              // App.tsx effect watches backgroundNoise and handles start/stop
                            }}
                            className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 transition-all duration-150"
                            style={{
                              background: isSelected ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)',
                              border: isSelected ? '1.5px solid var(--accent-g)' : '1.5px solid var(--brd)',
                              boxShadow: isSelected ? '0 0 12px rgba(255,255,255,0.04)' : 'none',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                e.currentTarget.style.borderColor = 'var(--brd2)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.borderColor = 'var(--brd)';
                              }
                            }}
                            title={opt.description}
                          >
                            <span className="text-xl leading-none">{opt.emoji}</span>
                            <span
                              className="text-[11px] font-medium text-center leading-tight"
                              style={{ color: isSelected ? 'var(--t)' : 'var(--t3)' }}
                            >
                              {opt.name}
                            </span>
                            {isSelected && opt.id !== 'none' && (
                              <span
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ background: 'var(--accent-d)', color: 'var(--accent)' }}
                              >
                                {t('customize.noiseOn')}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Background tab ── */}
                {tab === 'background' && (
                  <div className="flex flex-col gap-3">
                    <input
                      ref={bgFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCustomImage}
                    />
                    <div className="grid grid-cols-3 gap-2.5">
                      {BACKGROUNDS.map((bg) => {
                        const isSelected = settings.backgroundId === bg.id;
                        return (
                          <button
                            key={bg.id}
                            onClick={() => updateSettings({ backgroundId: bg.id } as Partial<AppSettings>)}
                            className="rounded-xl overflow-hidden transition-all duration-150 text-left"
                            style={{
                              border: isSelected ? '2px solid var(--accent)' : '1.5px solid rgba(255,255,255,0.08)',
                              boxShadow: isSelected ? '0 0 16px rgba(255,255,255,0.06)' : 'none',
                            }}
                          >
                            <div className="h-[72px] w-full overflow-hidden bg-black">
                              {bg.src ? (
                                <img src={bg.src} alt={bg.name} className="w-full h-full object-cover" draggable={false} />
                              ) : (
                                <div
                                  className="w-full h-full"
                                  style={{
                                    background: [
                                      'radial-gradient(circle at 50% 36%, rgba(255,77,77,0.30) 0%, rgba(255,77,77,0.10) 30%, transparent 60%)',
                                      'radial-gradient(circle at 90% 90%, rgba(91,141,238,0.22) 0%, transparent 50%)',
                                      'radial-gradient(circle at 8% 12%, rgba(167,139,250,0.16) 0%, transparent 45%)',
                                      '#080810',
                                    ].join(', '),
                                  }}
                                />
                              )}
                            </div>
                            <div
                              className="px-2.5 py-1.5 flex items-center justify-between"
                              style={{ background: 'rgba(0,0,0,0.55)', borderTop: '1px solid rgba(255,255,255,0.07)' }}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px]">{bg.emoji}</span>
                                <span className="text-[11px] font-medium truncate" style={{ color: 'var(--t2)' }}>{bg.name}</span>
                              </div>
                              {isSelected && (
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent-g)' }} />
                              )}
                            </div>
                          </button>
                        );
                      })}

                      {/* Custom image tile */}
                      <button
                        onClick={() => bgFileRef.current?.click()}
                        className="rounded-xl overflow-hidden transition-all duration-150 text-left"
                        style={{
                          border: settings.backgroundId === 'custom'
                            ? '2px solid var(--accent)'
                            : '1.5px dashed rgba(255,255,255,0.18)',
                        }}
                      >
                        <div className="h-[72px] w-full overflow-hidden flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          {settings.backgroundId === 'custom' && settings.customBackgroundDataUrl ? (
                            <img src={settings.customBackgroundDataUrl} alt="Custom" className="w-full h-full object-cover" draggable={false} />
                          ) : (
                            <div className="flex flex-col items-center gap-1 opacity-40">
                              <Plus size={20} color="var(--t2)" />
                              <span className="text-[10px]" style={{ color: 'var(--t3)' }}>{t('customize.browse')}</span>
                            </div>
                          )}
                        </div>
                        <div
                          className="px-2.5 py-1.5 flex items-center justify-between"
                          style={{ background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px]">🖼️</span>
                            <span className="text-[11px] font-medium" style={{ color: 'var(--t2)' }}>{t('customize.customLabel')}</span>
                          </div>
                          {settings.backgroundId === 'custom' && (
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                          )}
                        </div>
                      </button>
                    </div>
                    <p className="text-[11px] text-center" style={{ color: 'var(--t3)' }}>
                      {t('customize.applyHint')}
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

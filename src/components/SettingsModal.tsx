import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Check, Clock, Zap, Target, Volume2, Palette, User } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { AccentColor, ACCENT_COLORS } from '../types';
import { THEMES, AppTheme } from '../utils/themes';
import { AccountSettings } from './AccountSettings';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialSection?: SectionKey;
}

type SectionKey = 'timer' | 'behavior' | 'goals' | 'sounds' | 'appearance' | 'account';

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  { key: 'timer',      label: 'Timer',      icon: <Clock size={15} /> },
  { key: 'behavior',   label: 'Behavior',   icon: <Zap size={15} /> },
  { key: 'goals',      label: 'Goals',      icon: <Target size={15} /> },
  { key: 'sounds',     label: 'Sounds',     icon: <Volume2 size={15} /> },
  { key: 'appearance', label: 'Appearance', icon: <Palette size={15} /> },
  { key: 'account',    label: 'Account',    icon: <User size={15} /> },
];

const THEME_CATEGORIES: { key: AppTheme['category']; label: string }[] = [
  { key: 'dark',     label: 'Dark' },
  { key: 'neutral',  label: 'Neutral' },
  { key: 'warm',     label: 'Warm' },
  { key: 'colorful', label: 'Colorful' },
];

const ACCENT_OPTIONS: { key: AccentColor; name: string }[] = [
  { key: 'red',    name: 'Red' },
  { key: 'blue',   name: 'Blue' },
  { key: 'amber',  name: 'Amber' },
  { key: 'green',  name: 'Green' },
  { key: 'purple', name: 'Purple' },
  { key: 'pink',   name: 'Pink' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, initialSection }) => {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const [activeSection, setActiveSection] = useState<SectionKey>('timer');

  useEffect(() => {
    if (open) setActiveSection(initialSection ?? 'timer');
  }, [open, initialSection]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(8,8,16,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="w-[640px] h-[520px] rounded-2xl overflow-hidden flex flex-col relative"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--brd2)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, var(--accent), var(--blu), transparent)' }}
            />

            <div
              className="flex items-center justify-between px-5 py-3.5 shrink-0"
              style={{ borderBottom: '1px solid var(--brd)' }}
            >
              <div>
                <h2 className="text-[15px] font-bold" style={{ color: 'var(--t)' }}>Settings</h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>
                  Customize your focus experience
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetSettings}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] transition-all"
                  style={{ color: 'var(--t3)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
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
            </div>

            <div className="flex flex-1 min-h-0">
              <div
                className="w-[160px] shrink-0 flex flex-col gap-0.5 p-3 overflow-y-auto"
                style={{ borderRight: '1px solid var(--brd)' }}
              >
                {SECTIONS.map((section) => {
                  const isActive = activeSection === section.key;
                  return (
                    <button
                      key={section.key}
                      onClick={() => setActiveSection(section.key)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left w-full"
                      style={{
                        color: isActive ? 'var(--t)' : 'var(--t3)',
                        background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                        border: isActive ? '1px solid var(--brd2)' : '1px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = 'var(--t2)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = 'var(--t3)';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {section.icon}
                      {section.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeSection === 'timer' && (
                    <FieldGroup>
                      <NumberField label="Focus Duration"   value={settings.workDuration}      min={1} max={90} unit="min"      onChange={(v) => updateSettings({ workDuration: v })} />
                      <NumberField label="Short Break"      value={settings.shortBreakDuration} min={1} max={30} unit="min"      onChange={(v) => updateSettings({ shortBreakDuration: v })} />
                      <NumberField label="Long Break"       value={settings.longBreakDuration}  min={5} max={60} unit="min"      onChange={(v) => updateSettings({ longBreakDuration: v })} />
                      <NumberField label="Long Break After" value={settings.longBreakInterval}  min={2} max={8}  unit="sessions" onChange={(v) => updateSettings({ longBreakInterval: v })} />
                    </FieldGroup>
                  )}

                  {activeSection === 'behavior' && (
                    <FieldGroup>
                      <ToggleField
                        label="Auto-start Breaks"
                        description="Automatically start break timer after focus"
                        value={settings.autoStartBreaks}
                        onChange={(v) => updateSettings({ autoStartBreaks: v })}
                      />
                      <ToggleField
                        label="Auto-start Pomodoros"
                        description="Automatically start focus timer after break"
                        value={settings.autoStartPomodoros}
                        onChange={(v) => updateSettings({ autoStartPomodoros: v })}
                      />
                    </FieldGroup>
                  )}

                  {activeSection === 'goals' && (
                    <FieldGroup>
                      <NumberField
                        label="Daily Focus Goal"
                        value={settings.dailyFocusGoal}
                        min={1}
                        max={16}
                        unit="hours"
                        onChange={(v) => updateSettings({ dailyFocusGoal: v })}
                      />
                    </FieldGroup>
                  )}

                  {activeSection === 'sounds' && (
                    <FieldGroup>
                      <ToggleField
                        label="Session Sounds"
                        description="Play sound when work session or break ends"
                        value={settings.soundNotifications}
                        onChange={(v) => updateSettings({ soundNotifications: v })}
                      />
                      <ToggleField
                        label="Click Sounds"
                        description="Subtle click on button interactions"
                        value={settings.clickSounds}
                        onChange={(v) => updateSettings({ clickSounds: v })}
                      />
                      <SliderField
                        label="Volume"
                        value={settings.soundVolume ?? 70}
                        min={0}
                        max={100}
                        step={5}
                        onChange={(v) => updateSettings({ soundVolume: v })}
                      />
                    </FieldGroup>
                  )}

                  {activeSection === 'account' && <AccountSettings />}

                  {activeSection === 'appearance' && (
                    <div className="flex flex-col gap-5">
                      <div>
                        <div className="text-[11px] font-semibold tracking-widest uppercase mb-2.5" style={{ color: 'var(--t3)' }}>
                          Accent Color
                        </div>
                        <div
                          className="rounded-2xl overflow-hidden px-4 py-3 flex flex-wrap gap-2"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--brd)' }}
                        >
                          {ACCENT_OPTIONS.map((opt) => {
                            const color = ACCENT_COLORS[opt.key];
                            const isSelected = settings.accentColor === opt.key;
                            return (
                              <button
                                key={opt.key}
                                onClick={() => updateSettings({ accentColor: opt.key })}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150"
                                style={{
                                  background: isSelected ? `${color}22` : 'rgba(255,255,255,0.04)',
                                  border: `1.5px solid ${isSelected ? color : 'var(--brd)'}`,
                                  color: isSelected ? color : 'var(--t2)',
                                  boxShadow: isSelected ? `0 0 16px ${color}40` : 'none',
                                }}
                              >
                                <div
                                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                                  style={{ background: color, boxShadow: isSelected ? `0 0 8px ${color}80` : 'none' }}
                                >
                                  {isSelected && <Check size={9} color="white" strokeWidth={3} />}
                                </div>
                                {opt.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {THEME_CATEGORIES.map((cat) => {
                        const themes = THEMES.filter((t) => t.category === cat.key);
                        return (
                          <div key={cat.key}>
                            <div className="text-[11px] font-semibold tracking-widest uppercase mb-2.5" style={{ color: 'var(--t3)' }}>
                              {cat.label}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {themes.map((theme) => {
                                const isSelected = settings.theme === theme.id;
                                return (
                                  <button
                                    key={theme.id}
                                    onClick={() => updateSettings({ theme: theme.id })}
                                    className="rounded-xl overflow-hidden transition-all duration-150 text-left"
                                    style={{
                                      border: isSelected
                                        ? '2px solid var(--accent)'
                                        : '1.5px solid rgba(255,255,255,0.08)',
                                      boxShadow: isSelected ? '0 0 14px rgba(255,255,255,0.08)' : 'none',
                                    }}
                                  >
                                    <div className="h-14 p-1.5" style={{ background: theme.bg }}>
                                      <div
                                        className="w-full h-full rounded-lg p-1.5 flex flex-col justify-between"
                                        style={{ background: theme.card, border: `1px solid ${theme.brd2}` }}
                                      >
                                        <div className="flex gap-1">
                                          <div className="h-1.5 rounded-full" style={{ width: 28, background: theme.t }} />
                                          <div className="h-1.5 rounded-full" style={{ width: 18, background: theme.t3 }} />
                                        </div>
                                        <div className="flex gap-1 items-center">
                                          <div className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
                                          <div className="h-1 rounded-full" style={{ width: 22, background: theme.t2 }} />
                                        </div>
                                      </div>
                                    </div>
                                    <div
                                      className="px-2 py-1.5 flex items-center justify-between"
                                      style={{ background: theme.bg2 }}
                                    >
                                      <span className="text-[11px] font-medium truncate" style={{ color: theme.t2 }}>
                                        {theme.name}
                                      </span>
                                      {isSelected && (
                                        <div
                                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                                          style={{ background: 'var(--accent)' }}
                                        >
                                          <Check size={8} color="white" strokeWidth={3} />
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const FieldGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="rounded-2xl overflow-hidden"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--brd)' }}
  >
    {children}
  </div>
);

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}

const NumberField: React.FC<NumberFieldProps> = ({ label, value, min, max, unit, onChange }) => (
  <div
    className="flex items-center justify-between px-4 py-3 border-b last:border-0"
    style={{ borderColor: 'var(--brd)' }}
  >
    <span className="text-[13px]" style={{ color: 'var(--t)' }}>{label}</span>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 flex items-center justify-center rounded-xl text-[16px] font-medium transition-all"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--t2)', border: '1px solid var(--brd)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
      >
        −
      </button>
      <div className="flex items-center gap-1 min-w-[72px] justify-center">
        <span className="text-[14px] font-semibold tabular-nums" style={{ color: 'var(--t)' }}>{value}</span>
        <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{unit}</span>
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-7 h-7 flex items-center justify-center rounded-xl text-[16px] font-medium transition-all"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--t2)', border: '1px solid var(--brd)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
      >
        +
      </button>
    </div>
  </div>
);

interface ToggleFieldProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const ToggleField: React.FC<ToggleFieldProps> = ({ label, description, value, onChange }) => (
  <div
    className="flex items-center justify-between px-4 py-3 border-b last:border-0"
    style={{ borderColor: 'var(--brd)' }}
  >
    <div>
      <div className="text-[13px]" style={{ color: 'var(--t)' }}>{label}</div>
      <div className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>{description}</div>
    </div>
    <label className="toggle shrink-0">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  </div>
);

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const SliderField: React.FC<SliderFieldProps> = ({ label, value, min, max, step, onChange }) => (
  <div
    className="flex items-center justify-between px-4 py-3 border-b last:border-0 gap-4"
    style={{ borderColor: 'var(--brd)' }}
  >
    <span className="text-[13px] shrink-0" style={{ color: 'var(--t)' }}>{label}</span>
    <div className="flex items-center gap-3 flex-1 justify-end">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 max-w-[120px]"
        style={{ cursor: 'pointer' }}
      />
      <span className="text-[12px] tabular-nums w-8 text-right" style={{ color: 'var(--t3)' }}>{value}%</span>
    </div>
  </div>
);

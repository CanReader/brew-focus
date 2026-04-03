import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Check } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { AccentColor, ACCENT_COLORS } from '../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const accentOptions: { key: AccentColor; name: string }[] = [
  { key: 'red', name: 'Red' },
  { key: 'blue', name: 'Blue' },
  { key: 'amber', name: 'Amber' },
  { key: 'green', name: 'Green' },
  { key: 'purple', name: 'Purple' },
  { key: 'pink', name: 'Pink' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettingsStore();

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
            className="w-[480px] max-h-[80vh] rounded-2xl overflow-hidden flex flex-col relative"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--brd2)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)',
            }}
          >
            {/* Gradient top border */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, var(--accent), var(--blu), transparent)' }}
            />

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--brd)' }}
            >
              <div>
                <h2 className="text-[16px] font-bold" style={{ color: 'var(--t)' }}>
                  Settings
                </h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>
                  Customize your focus experience
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetSettings}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] transition-all"
                  style={{
                    color: 'var(--t3)',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--brd)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--t2)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--t3)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                  style={{ color: 'var(--t3)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'var(--t)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--t3)';
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <div className="flex flex-col gap-5">
                {/* Timer section */}
                <Section title="Timer Durations" accentColor="var(--accent)">
                  <NumberField
                    label="Focus Duration"
                    value={settings.workDuration}
                    min={1}
                    max={90}
                    unit="min"
                    onChange={(v) => updateSettings({ workDuration: v })}
                  />
                  <NumberField
                    label="Short Break"
                    value={settings.shortBreakDuration}
                    min={1}
                    max={30}
                    unit="min"
                    onChange={(v) => updateSettings({ shortBreakDuration: v })}
                  />
                  <NumberField
                    label="Long Break"
                    value={settings.longBreakDuration}
                    min={5}
                    max={60}
                    unit="min"
                    onChange={(v) => updateSettings({ longBreakDuration: v })}
                  />
                  <NumberField
                    label="Long Break After"
                    value={settings.longBreakInterval}
                    min={2}
                    max={8}
                    unit="sessions"
                    onChange={(v) => updateSettings({ longBreakInterval: v })}
                  />
                </Section>

                {/* Auto-start */}
                <Section title="Auto-start" accentColor="var(--grn)">
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
                </Section>

                {/* Goals */}
                <Section title="Goals" accentColor="var(--blu)">
                  <NumberField
                    label="Daily Focus Goal"
                    value={settings.dailyFocusGoal}
                    min={1}
                    max={16}
                    unit="hours"
                    onChange={(v) => updateSettings({ dailyFocusGoal: v })}
                  />
                </Section>

                {/* Sounds */}
                <Section title="Sounds" accentColor="var(--amb)">
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
                </Section>

                {/* Accent Color */}
                <Section title="Accent Color" accentColor="var(--accent)">
                  <div className="px-4 py-3 flex flex-wrap gap-2">
                    {accentOptions.map((opt) => {
                      const color = ACCENT_COLORS[opt.key];
                      const isSelected = settings.accentColor === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => updateSettings({ accentColor: opt.key })}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 relative"
                          style={{
                            background: isSelected ? `${color}18` : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${isSelected ? color : 'var(--brd)'}`,
                            color: isSelected ? color : 'var(--t2)',
                            boxShadow: isSelected ? `0 0 16px ${color}30` : 'none',
                          }}
                        >
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center"
                            style={{
                              background: color,
                              boxShadow: isSelected ? `0 0 8px ${color}80` : 'none',
                            }}
                          >
                            {isSelected && <Check size={9} color="white" strokeWidth={3} />}
                          </div>
                          {opt.name}
                        </button>
                      );
                    })}
                  </div>
                </Section>
              </div>

              <div className="h-4" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Sub-components

const Section: React.FC<{ title: string; accentColor: string; children: React.ReactNode }> = ({
  title,
  accentColor,
  children,
}) => (
  <div>
    <div className="flex items-center gap-2.5 mb-2.5">
      <div
        className="w-0.5 h-3.5 rounded-full"
        style={{ background: accentColor }}
      />
      <h3
        className="text-[11px] font-bold tracking-widest uppercase"
        style={{ color: 'var(--t3)' }}
      >
        {title}
      </h3>
    </div>
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--brd)',
      }}
    >
      {children}
    </div>
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

const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}) => (
  <div
    className="flex items-center justify-between px-4 py-3 border-b last:border-0"
    style={{ borderColor: 'var(--brd)' }}
  >
    <span className="text-[13px]" style={{ color: 'var(--t)' }}>
      {label}
    </span>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 flex items-center justify-center rounded-xl text-[16px] font-medium transition-all"
        style={{
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--t2)',
          border: '1px solid var(--brd)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
      >
        −
      </button>
      <div className="flex items-center gap-1 min-w-[72px] justify-center">
        <span className="text-[14px] font-semibold tabular-nums" style={{ color: 'var(--t)' }}>
          {value}
        </span>
        <span className="text-[12px]" style={{ color: 'var(--t3)' }}>
          {unit}
        </span>
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-7 h-7 flex items-center justify-center rounded-xl text-[16px] font-medium transition-all"
        style={{
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--t2)',
          border: '1px solid var(--brd)',
        }}
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

const ToggleField: React.FC<ToggleFieldProps> = ({
  label,
  description,
  value,
  onChange,
}) => (
  <div
    className="flex items-center justify-between px-4 py-3 border-b last:border-0"
    style={{ borderColor: 'var(--brd)' }}
  >
    <div>
      <div className="text-[13px]" style={{ color: 'var(--t)' }}>
        {label}
      </div>
      <div className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>
        {description}
      </div>
    </div>
    <label className="toggle shrink-0">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
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
    <span className="text-[13px] shrink-0" style={{ color: 'var(--t)' }}>
      {label}
    </span>
    <div className="flex items-center gap-3 flex-1 justify-end">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 max-w-[120px] accent-[var(--accent)]"
        style={{ cursor: 'pointer' }}
      />
      <span className="text-[12px] tabular-nums w-8 text-right" style={{ color: 'var(--t3)' }}>
        {value}%
      </span>
    </div>
  </div>
);

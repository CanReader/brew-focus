import { create } from 'zustand';
import { AppSettings, AccentColor, ACCENT_COLORS } from '../types';
import { supabase, getCurrentUserId } from '../utils/supabase';
import { applyTheme, DEFAULT_THEME_ID } from '../utils/themes';

const defaultSettings: AppSettings = {
  workDuration: 30,
  shortBreakDuration: 10,
  longBreakDuration: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  dailyFocusGoal: 6,
  soundNotifications: true,
  clickSounds: true,
  soundVolume: 70,
  accentColor: 'red',
  longBreakInterval: 4,
  theme: DEFAULT_THEME_ID,
  backgroundId: 'default',
  customBackgroundDataUrl: '',
  sessionStartSound: 'chime',
  breakStartSound: 'soft',
  sessionCompleteSound: 'fanfare',
  breakCompleteSound: 'bell',
  customSoundFiles: {},
  backgroundNoise: 'none',
  noiseVolume: 50,
};

interface SettingsStore {
  settings: AppSettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  isLoaded: false,

  loadSettings: async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      set({ isLoaded: true });
      applyAccentColor(defaultSettings.accentColor);
      applyTheme(DEFAULT_THEME_ID);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .eq('user_id', userId);

      if (error) throw error;

      const loaded: Partial<AppSettings> = {};
      for (const row of data ?? []) {
        try {
          (loaded as Record<string, unknown>)[row.key] = JSON.parse(row.value);
        } catch {
          (loaded as Record<string, unknown>)[row.key] = row.value;
        }
      }
      const merged = { ...defaultSettings, ...loaded };
      set({ settings: merged, isLoaded: true });
      applyAccentColor(merged.accentColor);
      applyTheme(merged.theme ?? DEFAULT_THEME_ID);
    } catch (e) {
      console.warn('Failed to load settings:', e);
      set({ isLoaded: true });
      applyAccentColor(defaultSettings.accentColor);
      applyTheme(DEFAULT_THEME_ID);
    }
  },

  updateSettings: async (partial) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });
    if (partial.accentColor) applyAccentColor(partial.accentColor);
    if (partial.theme) applyTheme(partial.theme);

    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      const upserts = Object.entries(partial).map(([key, value]) => ({
        user_id: userId,
        key,
        value: JSON.stringify(value),
      }));
      await supabase.from('settings').upsert(upserts, { onConflict: 'user_id,key' });
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  },

  resetSettings: async () => {
    set({ settings: defaultSettings });
    applyAccentColor(defaultSettings.accentColor);
    applyTheme(DEFAULT_THEME_ID);

    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('settings').delete().eq('user_id', userId);
      const rows = Object.entries(defaultSettings).map(([key, value]) => ({
        user_id: userId,
        key,
        value: JSON.stringify(value),
      }));
      await supabase.from('settings').insert(rows);
    } catch (e) {
      console.warn('Failed to reset settings:', e);
    }
  },
}));

function applyAccentColor(color: AccentColor) {
  const hex = ACCENT_COLORS[color];
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-d', hexToRgba(hex, 0.15));
  document.documentElement.style.setProperty('--accent-g', hexToRgba(hex, 0.25));
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

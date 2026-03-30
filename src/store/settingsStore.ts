import { create } from 'zustand';
import { AppSettings, AccentColor, ACCENT_COLORS } from '../types';
import { LazyStore } from '@tauri-apps/plugin-store';

const SETTINGS_KEY = 'settings';

const defaultSettings: AppSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  dailyFocusGoal: 6,
  soundNotifications: true,
  accentColor: 'red',
  longBreakInterval: 4,
};

const store = new LazyStore('brew-focus.json');

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
    try {
      const saved = await store.get<AppSettings>(SETTINGS_KEY);
      if (saved) {
        set({ settings: { ...defaultSettings, ...saved }, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
      applyAccentColor(get().settings.accentColor);
    } catch (e) {
      console.warn('Failed to load settings from store:', e);
      set({ isLoaded: true });
      applyAccentColor(defaultSettings.accentColor);
    }
  },

  updateSettings: async (partial) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });
    if (partial.accentColor) {
      applyAccentColor(partial.accentColor);
    }
    try {
      await store.set(SETTINGS_KEY, newSettings);
      await store.save();
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  },

  resetSettings: async () => {
    set({ settings: defaultSettings });
    applyAccentColor(defaultSettings.accentColor);
    try {
      await store.set(SETTINGS_KEY, defaultSettings);
      await store.save();
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

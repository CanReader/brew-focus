import { create } from 'zustand';
import { AppSettings, AccentColor, ACCENT_COLORS } from '../types';
import Database from '@tauri-apps/plugin-sql';

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!_db) _db = await Database.load('sqlite:brewfocus.db');
  return _db;
}

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
    try {
      const db = await getDb();
      const rows = await db.select<{ key: string; value: string }[]>('SELECT * FROM settings');
      if (rows.length > 0) {
        const loaded: Partial<AppSettings> = {};
        for (const row of rows) {
          try {
            (loaded as Record<string, unknown>)[row.key] = JSON.parse(row.value);
          } catch {
            (loaded as Record<string, unknown>)[row.key] = row.value;
          }
        }
        const merged = { ...defaultSettings, ...loaded };
        set({ settings: merged, isLoaded: true });
        applyAccentColor(merged.accentColor);
      } else {
        set({ isLoaded: true });
        applyAccentColor(defaultSettings.accentColor);
      }
    } catch (e) {
      console.warn('Failed to load settings from SQLite:', e);
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
      const db = await getDb();
      for (const [key, value] of Object.entries(partial)) {
        await db.execute(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [key, JSON.stringify(value)]
        );
      }
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  },

  resetSettings: async () => {
    set({ settings: defaultSettings });
    applyAccentColor(defaultSettings.accentColor);
    try {
      const db = await getDb();
      await db.execute('DELETE FROM settings');
      for (const [key, value] of Object.entries(defaultSettings)) {
        await db.execute(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [key, JSON.stringify(value)]
        );
      }
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

import { create } from 'zustand';
import { AppSettings, AccentColor, ACCENT_COLORS, ACCENT_COLORS_LIGHT } from '../types';
import { supabase, getCurrentUserId } from '../utils/supabase';
import { applyTheme, getTheme, DEFAULT_THEME_ID, hexToRgbTriplet } from '../utils/themes';
import { inkOn } from '../utils/ink';

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
  accentColor: 'caramel',
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
  savedViews: [],
  dailyQueue: { taskIds: [], lastSweepDate: '' },
  coffeeCupVariant: 'classic',
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
      applyAppearance(DEFAULT_THEME_ID, defaultSettings.accentColor);
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
      applyAppearance(merged.theme ?? DEFAULT_THEME_ID, merged.accentColor);
    } catch (e) {
      console.warn('Failed to load settings:', e);
      set({ isLoaded: true });
      applyAppearance(DEFAULT_THEME_ID, defaultSettings.accentColor);
    }
  },

  updateSettings: async (partial) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });
    // Either change re-resolves both, since the theme decides the accent tier.
    if (partial.accentColor || partial.theme) {
      applyAppearance(newSettings.theme ?? DEFAULT_THEME_ID, newSettings.accentColor);
    }

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
    applyAppearance(DEFAULT_THEME_ID, defaultSettings.accentColor);

    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      // Scope the wipe to AppSettings keys only — the `settings` table also
      // holds non-settings rows (activeTaskId, language) that a "reset
      // settings" action must not touch.
      const settingsKeys = Object.keys(defaultSettings);
      await supabase.from('settings').delete().eq('user_id', userId).in('key', settingsKeys);
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

/**
 * Applies theme + accent together. They cannot be applied independently: the
 * accent tier is chosen by the theme's category, so switching to a light theme
 * must also re-resolve the accent (and vice-versa).
 */
function applyAppearance(themeId: string, accent: AccentColor) {
  applyTheme(themeId);
  applyAccentColor(accent, getTheme(themeId).category === 'light');
}

function applyAccentColor(color: AccentColor, isLightTheme: boolean) {
  const hex = isLightTheme ? ACCENT_COLORS_LIGHT[color] : ACCENT_COLORS[color];
  const rgb = hexToRgbTriplet(hex);
  document.documentElement.style.setProperty('--accent', hex);
  // Consumers compose their own alpha as rgba(var(--accent-rgb), α). Anything
  // that hardcodes the accent's rgb instead will not follow an accent change.
  document.documentElement.style.setProperty('--accent-rgb', rgb);
  document.documentElement.style.setProperty('--accent-d', `rgba(${rgb},0.15)`);
  document.documentElement.style.setProperty('--accent-g', `rgba(${rgb},0.25)`);
  // Ink for anything painted ON the accent. Derived from the effective accent,
  // so it follows the light/dark tier swap automatically.
  document.documentElement.style.setProperty('--accent-ink', inkOn(hex));
}

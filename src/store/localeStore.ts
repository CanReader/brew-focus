import { create } from 'zustand';
import { supabase, getCurrentUserId } from '../utils/supabase';
import i18n, {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  directionFor,
  detectInitialLanguage,
} from '../i18n';

interface LocaleStore {
  language: SupportedLanguage;
  direction: 'ltr' | 'rtl';
  isLoaded: boolean;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  loadFromSettings: () => Promise<void>;
}

function applyHtmlDirection(lang: SupportedLanguage) {
  if (typeof document === 'undefined') return;
  document.documentElement.dir = directionFor(lang);
  document.documentElement.lang = lang;
}

export const useLocaleStore = create<LocaleStore>((set, get) => ({
  language: detectInitialLanguage(),
  direction: directionFor(detectInitialLanguage()),
  isLoaded: false,

  loadFromSettings: async () => {
    const userId = await getCurrentUserId();
    let lang: SupportedLanguage = detectInitialLanguage();
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('user_id', userId)
          .eq('key', 'language')
          .maybeSingle();
        if (!error && data?.value) {
          let parsed: unknown;
          try { parsed = JSON.parse(data.value); } catch { parsed = data.value; }
          if (typeof parsed === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(parsed)) {
            lang = parsed as SupportedLanguage;
          }
        }
      } catch (e) {
        console.warn('Failed to load language setting:', e);
      }
    }
    if (i18n.language !== lang) {
      try { await i18n.changeLanguage(lang); } catch { /* noop */ }
    }
    applyHtmlDirection(lang);
    set({ language: lang, direction: directionFor(lang), isLoaded: true });
  },

  setLanguage: async (lang) => {
    if (get().language === lang) return;
    try { await i18n.changeLanguage(lang); } catch { /* noop */ }
    applyHtmlDirection(lang);
    set({ language: lang, direction: directionFor(lang) });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('settings').upsert(
        { user_id: userId, key: 'language', value: JSON.stringify(lang) },
        { onConflict: 'user_id,key' },
      );
    } catch (e) {
      console.warn('Failed to persist language setting:', e);
    }
  },
}));

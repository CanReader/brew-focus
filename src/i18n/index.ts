import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ICU from 'i18next-icu';

import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enFocus from '../locales/en/focus.json';
import enTasks from '../locales/en/tasks.json';
import enProjects from '../locales/en/projects.json';
import enSettings from '../locales/en/settings.json';
import enTemplates from '../locales/en/templates.json';
import enReports from '../locales/en/reports.json';

import trCommon from '../locales/tr/common.json';
import trAuth from '../locales/tr/auth.json';
import trFocus from '../locales/tr/focus.json';
import trTasks from '../locales/tr/tasks.json';
import trProjects from '../locales/tr/projects.json';
import trSettings from '../locales/tr/settings.json';
import trTemplates from '../locales/tr/templates.json';
import trReports from '../locales/tr/reports.json';

import zhCommon from '../locales/zh/common.json';
import zhAuth from '../locales/zh/auth.json';
import zhFocus from '../locales/zh/focus.json';
import zhTasks from '../locales/zh/tasks.json';
import zhProjects from '../locales/zh/projects.json';
import zhSettings from '../locales/zh/settings.json';
import zhTemplates from '../locales/zh/templates.json';
import zhReports from '../locales/zh/reports.json';

import esCommon from '../locales/es/common.json';
import esAuth from '../locales/es/auth.json';
import esFocus from '../locales/es/focus.json';
import esTasks from '../locales/es/tasks.json';
import esProjects from '../locales/es/projects.json';
import esSettings from '../locales/es/settings.json';
import esTemplates from '../locales/es/templates.json';
import esReports from '../locales/es/reports.json';

import frCommon from '../locales/fr/common.json';
import frAuth from '../locales/fr/auth.json';
import frFocus from '../locales/fr/focus.json';
import frTasks from '../locales/fr/tasks.json';
import frProjects from '../locales/fr/projects.json';
import frSettings from '../locales/fr/settings.json';
import frTemplates from '../locales/fr/templates.json';
import frReports from '../locales/fr/reports.json';

import arCommon from '../locales/ar/common.json';
import arAuth from '../locales/ar/auth.json';
import arFocus from '../locales/ar/focus.json';
import arTasks from '../locales/ar/tasks.json';
import arProjects from '../locales/ar/projects.json';
import arSettings from '../locales/ar/settings.json';
import arTemplates from '../locales/ar/templates.json';
import arReports from '../locales/ar/reports.json';

import ukCommon from '../locales/uk/common.json';
import ukAuth from '../locales/uk/auth.json';
import ukFocus from '../locales/uk/focus.json';
import ukTasks from '../locales/uk/tasks.json';
import ukProjects from '../locales/uk/projects.json';
import ukSettings from '../locales/uk/settings.json';
import ukTemplates from '../locales/uk/templates.json';
import ukReports from '../locales/uk/reports.json';

export const SUPPORTED_LANGUAGES = ['en', 'tr', 'zh', 'es', 'fr', 'ar', 'uk'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: ReadonlySet<SupportedLanguage> = new Set(['ar']);

export const NAMESPACES = ['common', 'auth', 'focus', 'tasks', 'projects', 'settings', 'templates', 'reports'] as const;

export const LANGUAGE_NATIVE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  tr: 'Türkçe',
  zh: '中文',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
  uk: 'Українська',
};

const resources = {
  en: { common: enCommon, auth: enAuth, focus: enFocus, tasks: enTasks, projects: enProjects, settings: enSettings, templates: enTemplates, reports: enReports },
  tr: { common: trCommon, auth: trAuth, focus: trFocus, tasks: trTasks, projects: trProjects, settings: trSettings, templates: trTemplates, reports: trReports },
  zh: { common: zhCommon, auth: zhAuth, focus: zhFocus, tasks: zhTasks, projects: zhProjects, settings: zhSettings, templates: zhTemplates, reports: zhReports },
  es: { common: esCommon, auth: esAuth, focus: esFocus, tasks: esTasks, projects: esProjects, settings: esSettings, templates: esTemplates, reports: esReports },
  fr: { common: frCommon, auth: frAuth, focus: frFocus, tasks: frTasks, projects: frProjects, settings: frSettings, templates: frTemplates, reports: frReports },
  ar: { common: arCommon, auth: arAuth, focus: arFocus, tasks: arTasks, projects: arProjects, settings: arSettings, templates: arTemplates, reports: arReports },
  uk: { common: ukCommon, auth: ukAuth, focus: ukFocus, tasks: ukTasks, projects: ukProjects, settings: ukSettings, templates: ukTemplates, reports: ukReports },
};

export function detectInitialLanguage(): SupportedLanguage {
  const nav = (typeof navigator !== 'undefined' ? navigator.language : '') || '';
  const tag = nav.toLowerCase();
  if (tag.startsWith('zh')) return 'zh';
  const base = tag.split('-')[0];
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base)
    ? (base as SupportedLanguage)
    : 'en';
}

export function directionFor(lang: SupportedLanguage): 'ltr' | 'rtl' {
  return RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
}

i18n
  .use(ICU)
  .use(initReactI18next)
  .init({
    resources,
    lng: detectInitialLanguage(),
    fallbackLng: 'en',
    ns: NAMESPACES as unknown as string[],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

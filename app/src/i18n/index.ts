import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import zh from './locales/zh.json';
import zhHant from './locales/zh-Hant.json';

const LANG_KEY = 'app.lang';

function normalizeLang(tag: string | undefined) {
  const t = (tag || '').toLowerCase();
  if (t.includes('hant') || t.includes('tw') || t.includes('hk'))
    return 'zh-Hant';
  if (t.startsWith('zh')) return 'zh';
  return 'zh';
}

const deviceTag = Localization.getLocales?.()[0]?.languageTag;
const deviceLang = normalizeLang(deviceTag);

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    zh: { translation: zh },
    'zh-Hant': { translation: zhHant },
  },
  lng: deviceLang,
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
});

// 延迟执行，防止在 Web 初始化时触发 window 未定义错误
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const saved = await AsyncStorage.getItem(LANG_KEY);
      const lang = normalizeLang(saved || deviceTag);
      if (lang !== i18n.language) {
        await i18n.changeLanguage(lang);
      }
    } catch (err) {
      console.log('Language restore skipped on Web:', err);
    }
  })();
}

export async function setAppLanguage(lang: 'zh' | 'zh-Hant') {
  await AsyncStorage.setItem(LANG_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;

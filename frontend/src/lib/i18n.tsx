'use client';

import { createContext, useContext, useState } from 'react';

type Language = 'fr' | 'ar';

type I18nContextType = {
  language: Language;
  toggle: () => void;
  dir: 'ltr' | 'rtl';
};

const I18nContext = createContext<I18nContextType>({
  language: 'fr',
  toggle: () => undefined,
  dir: 'ltr'
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('fr');
  const toggle = () => setLanguage((prev) => (prev === 'fr' ? 'ar' : 'fr'));
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  return (
    <I18nContext.Provider value={{ language, toggle, dir }}>
      <div dir={dir}>{children}</div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function t(fr: string, ar: string, language: Language) {
  return language === 'ar' ? ar : fr;
}

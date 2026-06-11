'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '@/locales/en';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('fc_locale');
    if (saved && saved === 'en') setLocale(saved);
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  }, []);

  const t = (key) => en[key] || key;

  return (
    <LanguageContext.Provider value={{ locale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

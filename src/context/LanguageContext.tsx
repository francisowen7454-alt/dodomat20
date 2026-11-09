import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'sw';

interface Translations {
  [key: string]: {
    en: string;
    sw: string;
  };
}

export const translations: Translations = {
  // Brand & Navigation
  appName: { en: 'T20 Server', sw: 'T20 Server' },
  tagline: { en: 'Business Operations, Sales, Inventory & Reporting Management System', sw: 'Mfumo wa Usimamizi wa Biashara, Mauzo, Stock & Ripoti' },
  login: { en: 'Sign In', sw: 'Ingia Kwenye Mfumo' },
  register: { en: 'Register Account', sw: 'Kujisajili' },
  logout: { en: 'Log Out', sw: 'Toka' },
  home: { en: 'Home', sw: 'Mwanzo' },
  about: { en: 'About System', sw: 'Kuhusu Mfumo' },
  architecture: { en: 'Architecture', sw: 'Muundo wa Mfumo' },
  capabilities: { en: 'Capabilities', sw: 'Uwezo wa Mfumo' },
  workspace: { en: 'Staff Workspace', sw: 'Sehemu ya Staff' },
  managerPortal: { en: 'Manager Dashboard', sw: 'Dashibodi ya Manager' },
  staffPortal: { en: 'Staff Workspace', sw: 'Sehemu ya Staff' },

  // Modules
  overview: { en: 'Overview', sw: 'Muhtasari' },
  salesInventory: { en: 'Sales & Inventory', sw: 'Mauzo na Stock' },
  productImport: { en: 'Product Registration', sw: 'Usajili wa Bidhaa' },
  memberKits: { en: 'Member Kit Registration', sw: 'Member Kit Registration' },
  testingRecords: { en: 'Diagnostic Testing', sw: 'Vipimo (Testing Records)' },
  incomingGoods: { en: 'Incoming Goods', sw: 'Upokeaji Bidhaa' },
  myWork: { en: 'Daily Report Entry', sw: 'Jaza Ripoti ya Siku' },
  myReports: { en: 'My Submitted Reports', sw: 'Ripoti Zangu Zilizowasilishwa' },
  reportsCenter: { en: 'Reports Center', sw: 'Kituo cha Ripoti' },
  reviewStaffReports: { en: 'Review Daily Reports', sw: 'Kagua Ripoti za Siku' },
  usersSecurity: { en: 'Users & Security', sw: 'Watumiaji na Usalama' },
  auditHistory: { en: 'Audit Log & History', sw: 'Historia ya Mabadiliko' },
  backupRestore: { en: 'Data & Backups', sw: 'Data & Backups' },

  // Metrics
  totalSales: { en: 'Total Sales', sw: 'Jumla ya Mauzo' },
  productsInStock: { en: 'Products in Stock', sw: 'Bidhaa Zilizopo Stock' },
  totalKits: { en: 'Registered Member Kits', sw: 'Member Kits Zilizosajiliwa' },
  quantumTests: { en: 'Quantum Tests', sw: 'Vipimo vya Quantum' },
  bodyAnalyzerTests: { en: 'Body Analyzer Tests', sw: 'Vipimo vya Body Analyzer' },
  pendingReviews: { en: 'Reports Pending Review', sw: 'Ripoti Zinazosubiri Ukaguzi' },

  // Currency
  tzs: { en: 'TZS', sw: 'TZS' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    localStorage.setItem('t20_language', 'en');
  }, []);

  const t = (key: keyof typeof translations): string => {
    const entry = translations[key];
    if (!entry) return String(key);
    return entry[language] || entry.en || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

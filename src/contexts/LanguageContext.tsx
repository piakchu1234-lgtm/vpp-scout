"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface LanguageContextProps {
  language: "en" | "zh";
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextProps | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<"en" | "zh">("en");

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "zh" : "en"));
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

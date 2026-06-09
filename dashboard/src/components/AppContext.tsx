"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Theme = "light" | "dark";
type Currency = "USD" | "EUR";

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  currency: Currency;
  toggleCurrency: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [currency, setCurrency] = useState<Currency>("USD");

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") as Theme;
    const savedCurrency = localStorage.getItem("app-currency") as Currency;
    if (savedTheme) setTheme(savedTheme);
    if (savedCurrency) setCurrency(savedCurrency);
  }, []);

  useEffect(() => {
    localStorage.setItem("app-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.cookie = `app-theme=${theme}; path=/; max-age=31536000`;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("app-currency", currency);
    document.cookie = `app-currency=${currency}; path=/; max-age=31536000`;
  }, [currency]);

  const router = useRouter();

  const toggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));
  const toggleCurrency = () => setCurrency(prev => {
    const newCurrency = prev === "USD" ? "EUR" : "USD";
    document.cookie = `app-currency=${newCurrency}; path=/; max-age=31536000`;
    router.refresh();
    return newCurrency;
  });

  return (
    <AppContext.Provider value={{ theme, toggleTheme, currency, toggleCurrency }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

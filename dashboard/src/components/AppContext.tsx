"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
    if (theme === "light") {
      document.documentElement.style.setProperty("--background", "#ffffff");
      document.documentElement.style.setProperty("--foreground", "#0a0a0a");
      // Optional UI polish: dynamically swap primary colors if desired
    } else {
      document.documentElement.style.setProperty("--background", "#0a0a0a");
      document.documentElement.style.setProperty("--foreground", "#ededed");
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("app-currency", currency);
  }, [currency]);

  const toggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));
  const toggleCurrency = () => setCurrency(prev => (prev === "USD" ? "EUR" : "USD"));

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

import { useState, useEffect, createContext, useContext } from "react";

type DisplayMode = "hp" | "tablet" | "pc";

interface DisplayModeContextType {
  mode: DisplayMode;
  setMode: (mode: DisplayMode) => void;
  isLandscape: boolean;
  setIsLandscape: (val: boolean) => void;
  isDark: boolean;
  setIsDark: (val: boolean) => void;
}

const DisplayModeContext = createContext<DisplayModeContextType>({ 
  mode: "hp", 
  setMode: () => {},
  isLandscape: false,
  setIsLandscape: () => {},
  isDark: false,
  setIsDark: () => {}
});

export function DisplayModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<DisplayMode>(() => {
    return (localStorage.getItem("alfaza_display_mode") as DisplayMode) || "hp";
  });

  const [isLandscape, setIsLandscape] = useState(() => {
    return localStorage.getItem("alfaza_is_landscape") === "true";
  });

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("alfaza_is_dark") === "true";
  });

  useEffect(() => {
    localStorage.setItem("alfaza_display_mode", mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("alfaza_is_landscape", String(isLandscape));
  }, [isLandscape]);

  useEffect(() => {
    localStorage.setItem("alfaza_is_dark", String(isDark));
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <DisplayModeContext.Provider value={{ mode, setMode, isLandscape, setIsLandscape, isDark, setIsDark }}>
      {children}
    </DisplayModeContext.Provider>
  );
}

export function useDisplayMode() {
  return useContext(DisplayModeContext);
}

export function getMaxWidth(mode: DisplayMode, isLandscape: boolean): string {
  if (isLandscape) {
    switch (mode) {
      case "hp": return "max-w-[850px]";
      case "tablet": return "max-w-[1024px]";
      case "pc": return "max-w-full";
      default: return "max-w-[850px]";
    }
  }
  switch (mode) {
    case "hp": return "max-w-[500px]";
    case "tablet": return "max-w-[768px]";
    case "pc": return "max-w-[1280px]";
    default: return "max-w-[500px]";
  }
}

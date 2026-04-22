import { useState, useEffect, createContext, useContext } from "react";

type DisplayMode = "hp" | "tablet" | "pc";
type ThemeMode = "light" | "blue" | "dark";

interface DisplayModeContextType {
  mode: DisplayMode;
  setMode: (mode: DisplayMode) => void;
  isLandscape: boolean;
  setIsLandscape: (val: boolean) => void;
  theme: ThemeMode;
  setTheme: (val: ThemeMode) => void;
}

const DisplayModeContext = createContext<DisplayModeContextType>({ 
  mode: "hp", 
  setMode: () => {},
  isLandscape: false,
  setIsLandscape: () => {},
  theme: "light",
  setTheme: () => {}
});

export function DisplayModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<DisplayMode>(() => {
    return (localStorage.getItem("alfaza_display_mode") as DisplayMode) || "hp";
  });

  const [isLandscape, setIsLandscape] = useState(() => {
    return localStorage.getItem("alfaza_is_landscape") === "true";
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem("alfaza_theme") as ThemeMode) || "light";
  });

  useEffect(() => {
    localStorage.setItem("alfaza_display_mode", mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("alfaza_is_landscape", String(isLandscape));
  }, [isLandscape]);

  useEffect(() => {
    localStorage.setItem("alfaza_theme", theme);
    const root = document.documentElement;
    root.classList.remove("dark", "blue-theme");
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "blue") {
      root.classList.add("blue-theme");
    }
  }, [theme]);

  return (
    <DisplayModeContext.Provider value={{ mode, setMode, isLandscape, setIsLandscape, theme, setTheme }}>
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

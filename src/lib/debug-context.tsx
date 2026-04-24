import { createContext, useContext, useState, ReactNode } from "react";

interface DebugContextType {
  debugMode: boolean;
  toggleDebugMode: () => void;
  selectedComponent: string | null;
  setSelectedComponent: (name: string | null) => void;
  hoveredElement: HTMLElement | null;
  setHoveredElement: (el: HTMLElement | null) => void;
  lockedElement: HTMLElement | null;
  setLockedElement: (el: HTMLElement | null) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: ReactNode }) {
  const [debugMode, setDebugMode] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [lockedElement, setLockedElement] = useState<HTMLElement | null>(null);

  const toggleDebugMode = () => {
    setDebugMode((prev) => {
      if (prev) {
        setSelectedComponent(null);
        setLockedElement(null);
        setHoveredElement(null);
      }
      return !prev;
    });
  };

  return (
    <DebugContext.Provider 
      value={{ 
        debugMode, 
        toggleDebugMode, 
        selectedComponent, 
        setSelectedComponent,
        hoveredElement,
        setHoveredElement,
        lockedElement,
        setLockedElement
      }}
    >
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error("useDebug must be used within a DebugProvider");
  }
  return context;
}

import { useDebug } from "@/lib/debug-context";
import { ReactNode, useRef, useState, useEffect } from "react";
import { Send, Copy, X } from "lucide-react";

interface DebugWrapperProps {
  children: ReactNode;
  componentName: string;
  className?: string;
}

export function DebugWrapper({ children, componentName, className = "" }: DebugWrapperProps) {
  const { debugMode, selectedComponent, setSelectedComponent } = useDebug();
  const [isHovered, setIsHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const isSelected = selectedComponent === componentName;

  const handleSelect = (e: React.MouseEvent) => {
    if (!debugMode) return;
    e.stopPropagation();
    setSelectedComponent(isSelected ? null : componentName);
  };

  const handleCopyRequest = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = window.prompt("Apa yang ingin Anda ubah pada komponen ini?", "");
    if (prompt === null) return;

    const fullMessage = `Halo Antigravity, saya ingin mengedit komponen [${componentName}].\n\nPermintaan perubahan:\n${prompt}`;
    navigator.clipboard.writeText(fullMessage);
    alert("Permintaan berhasil disalin! Silakan tempelkan (Paste) di chat Antigravity.");
    setSelectedComponent(null);
  };

  if (!debugMode) {
    return <>{children}</>;
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative group ${className} ${isSelected ? "z-[10000]" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleSelect}
    >
      {/* Background Highlight on Hover or Selection */}
      <div 
        className={`absolute inset-0 pointer-events-none rounded transition-all duration-200 
          ${isSelected 
            ? "border-4 border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.5)]" 
            : isHovered 
              ? "border-2 border-red-500/40 bg-red-500/5" 
              : "border-2 border-transparent"
          }`} 
      />

      {children}

      {/* Component Name Badge */}
      {(isHovered || isSelected) && (
        <div className={`absolute -top-7 left-0 z-[10001] ${isSelected ? "bg-blue-600" : "bg-red-600"} text-white text-[10px] font-black px-2 py-1 rounded shadow-lg flex items-center gap-2 whitespace-nowrap animate-in fade-in slide-in-from-bottom-1`}>
          <span>{componentName}</span>
          {isSelected && (
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedComponent(null); }}
              className="hover:text-red-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Edit Request UI - Only when selected */}
      {isSelected && (
        <div 
          className="absolute top-0 right-0 z-[10002] flex items-center gap-1 animate-in zoom-in"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleCopyRequest}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-bl-xl shadow-xl flex items-center gap-2 font-bold text-xs transition-all active:scale-90"
          >
            <Send className="w-3 h-3" />
            Minta Edit
          </button>
        </div>
      )}
    </div>
  );
}

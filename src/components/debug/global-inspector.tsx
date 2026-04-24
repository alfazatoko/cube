import { useDebug } from "@/lib/debug-context";
import { useEffect, useState, useRef } from "react";
import { Send, X, MousePointer2 } from "lucide-react";

export function GlobalInspector() {
  const { 
    debugMode, 
    hoveredElement, 
    setHoveredElement, 
    lockedElement, 
    setLockedElement 
  } = useDebug();

  const [rect, setRect] = useState<DOMRect | null>(null);
  const [lockedRect, setLockedRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!debugMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (lockedElement) return;

      const target = e.target as HTMLElement;
      if (!target || target === document.documentElement || target === document.body) {
        setHoveredElement(null);
        setRect(null);
        return;
      }

      // Avoid selecting the inspector itself or its components
      if (target.closest('.global-inspector-ui')) return;

      setHoveredElement(target);
      setRect(target.getBoundingClientRect());
    };

    const handleClick = (e: MouseEvent) => {
      if (!debugMode) return;
      
      const target = e.target as HTMLElement;
      if (target.closest('.global-inspector-ui')) return;

      e.preventDefault();
      e.stopPropagation();

      if (lockedElement === target) {
        setLockedElement(null);
        setLockedRect(null);
      } else {
        setLockedElement(target);
        setLockedRect(target.getBoundingClientRect());
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { capture: true });
    window.addEventListener('click', handleClick, { capture: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('click', handleClick, { capture: true });
    };
  }, [debugMode, lockedElement, setHoveredElement, setLockedElement]);

  // Update rects on scroll/resize
  useEffect(() => {
    if (!debugMode) return;

    const updateRects = () => {
      if (hoveredElement) setRect(hoveredElement.getBoundingClientRect());
      if (lockedElement) setLockedRect(lockedElement.getBoundingClientRect());
    };

    window.addEventListener('scroll', updateRects, { capture: true });
    window.addEventListener('resize', updateRects);
    return () => {
      window.removeEventListener('scroll', updateRects, { capture: true });
      window.removeEventListener('resize', updateRects);
    };
  }, [debugMode, hoveredElement, lockedElement]);

  const handleCopyRequest = () => {
    if (!lockedElement) return;

    const prompt = window.prompt("Apa yang ingin Anda ubah pada elemen ini?", "");
    if (prompt === null) return;

    const tagName = lockedElement.tagName.toLowerCase();
    const classes = lockedElement.className;
    const text = lockedElement.innerText?.substring(0, 50) || "";
    
    const elementDesc = `${tagName}${classes ? '.' + classes.split(' ').join('.') : ''} (Teks: "${text}")`;

    const fullMessage = `Halo Antigravity, saya ingin mengedit elemen [${elementDesc}].\n\nPermintaan perubahan:\n${prompt}`;
    navigator.clipboard.writeText(fullMessage);
    alert("Permintaan berhasil disalin! Silakan tempelkan (Paste) di chat Antigravity.");
    setLockedElement(null);
    setLockedRect(null);
  };

  if (!debugMode) return null;

  return (
    <div className="global-inspector-ui fixed inset-0 pointer-events-none z-[99999]">
      {/* Hover Highlight */}
      {rect && !lockedElement && (
        <div 
          className="absolute border-2 border-red-500 bg-red-500/10 transition-all duration-75 rounded"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        >
          <div className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
            <MousePointer2 className="w-3 h-3" />
            {hoveredElement?.tagName.toLowerCase()}
          </div>
        </div>
      )}

      {/* Locked Selection */}
      {lockedRect && (
        <div 
          className="absolute border-4 border-blue-500 bg-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.6)] rounded pointer-events-auto"
          style={{
            top: lockedRect.top,
            left: lockedRect.left,
            width: lockedRect.width,
            height: lockedRect.height,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Controls */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-blue-600 p-1.5 rounded-xl shadow-2xl animate-in slide-in-from-bottom-2">
            <span className="text-white text-xs font-black px-2 border-r border-blue-400">
              {lockedElement?.tagName}
            </span>
            <button 
              onClick={handleCopyRequest}
              className="bg-white text-blue-700 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 hover:bg-blue-50 transition-colors"
            >
              <Send className="w-3 h-3" />
              Minta Edit
            </button>
            <button 
              onClick={() => { setLockedElement(null); setLockedRect(null); }}
              className="text-white hover:bg-blue-700 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

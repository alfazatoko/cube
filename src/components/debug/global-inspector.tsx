import { useDebug } from "@/lib/debug-context";
import { useEffect, useState, useRef } from "react";
import { Send, Target, Type, CheckCircle, Trash2, Pencil, XCircle, MousePointer2 } from "lucide-react";

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
  const [isEditingText, setIsEditingText] = useState(false);

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

  const toggleTextEdit = () => {
    if (!lockedElement) return;
    
    if (isEditingText) {
      lockedElement.contentEditable = "false";
      setIsEditingText(false);
      setLockedRect(lockedElement.getBoundingClientRect());
    } else {
      lockedElement.contentEditable = "true";
      lockedElement.focus();
      setIsEditingText(true);
      
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(lockedElement);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  const handleRemoveElement = () => {
    if (!lockedElement) return;
    if (confirm("Hapus elemen ini dari preview?")) {
      lockedElement.style.display = "none";
      setLockedElement(null);
      setLockedRect(null);
    }
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
          className={`absolute border-4 ${isEditingText ? 'border-amber-500' : 'border-blue-500'} bg-blue-500/10 shadow-[0_0_40px_rgba(59,130,246,0.4)] rounded pointer-events-auto transition-colors`}
          style={{
            top: lockedRect.top,
            left: lockedRect.left,
            width: lockedRect.width,
            height: lockedRect.height,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Controls */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gray-900/95 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2 border border-white/10">
            <div className="px-2.5 py-1 border-r border-white/10 flex flex-col justify-center">
              <span className="text-[10px] font-black text-blue-400 uppercase leading-none">{lockedElement?.tagName}</span>
              <span className="text-[8px] text-white/40 font-bold mt-0.5 truncate max-w-[60px]">
                {lockedElement?.className.split(' ')[0] || 'no-class'}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={toggleTextEdit}
                className={`p-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${isEditingText ? 'bg-amber-500 text-white shadow-lg' : 'text-white hover:bg-white/10'}`}
                title={isEditingText ? "Selesai Edit" : "Edit Teks"}
              >
                {isEditingText ? <CheckCircle className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isEditingText ? "Selesai" : "Edit Teks"}</span>
              </button>

              <button 
                onClick={handleCopyRequest}
                className="p-2 rounded-xl text-white hover:bg-white/10 text-xs font-black flex items-center gap-1.5 transition-all"
                title="Minta Edit (Antigravity)"
              >
                <Send className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Minta Edit</span>
              </button>

              <button 
                onClick={handleRemoveElement}
                className="p-2 rounded-xl text-white hover:bg-red-500/20 text-xs font-black flex items-center gap-1.5 transition-all"
                title="Hapus Elemen"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>

            <button 
              onClick={() => { 
                if (lockedElement) lockedElement.contentEditable = "false";
                setIsEditingText(false);
                setLockedElement(null); 
                setLockedRect(null); 
              }}
              className="ml-1 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

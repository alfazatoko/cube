import { useDebug } from "@/lib/debug-context";
import { ReactNode, useRef, useState } from "react";

interface DebugWrapperProps {
  children: ReactNode;
  componentName: string;
  className?: string;
}

export function DebugWrapper({ children, componentName, className = "" }: DebugWrapperProps) {
  const { debugMode } = useDebug();
  const [isHovered, setIsHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  if (!debugMode) {
    return <>{children}</>;
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isHovered && (
        <div className="absolute top-0 left-0 z-[9999] bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
          {componentName}
        </div>
      )}
      <div className="absolute inset-0 border-2 border-red-500/30 pointer-events-none rounded" />
    </div>
  );
}

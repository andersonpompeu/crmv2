import React, { useState, useEffect, useRef } from "react";

interface ChartContainerProps {
  children: React.ReactNode;
  height?: number | string;
  className?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  height = 250,
  className = ""
}) => {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: Number(height) || 250 });

  useEffect(() => {
    setMounted(true);

    if (typeof height === "string") return;

    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height: entryHeight } = entries[0].contentRect;
      // Safeguard against zero or negative dimensions during paint rendering
      setDimensions({
        width: Math.max(width, 100),
        height: Math.max(entryHeight || Number(height), 100)
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  if (!mounted) {
    return (
      <div 
        className={`w-full rounded-xl bg-slate-500/10 dark:bg-slate-900/50 animate-pulse ${className}`}
        style={{ height }}
      />
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height, minHeight: 100 }}
    >
      <div className="absolute inset-0 w-full h-full min-w-[100px] min-h-[100px]">
        {children}
      </div>
    </div>
  );
};

export default ChartContainer;

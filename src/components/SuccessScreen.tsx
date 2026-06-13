import React from "react";
import { motion } from "motion/react";

interface SuccessScreenProps {
  onReset: () => void;
  title?: string;
  message?: string;
}

export default function SuccessScreen({ 
  onReset, 
  title = "Obrigado!", 
  message = "Seus dados foram enviados com sucesso." 
}: SuccessScreenProps) {
  // Particles for confetti popping effect
  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#a855f7"];
  
  const particles = Array.from({ length: 30 }).map((_, i) => {
    const angle = (i * 360) / 30 + Math.random() * 12;
    const distance = 70 + Math.random() * 50;
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * distance;
    const y = Math.sin(rad) * distance;
    const size = 6 + Math.random() * 6;
    const isCircle = Math.random() > 0.45;
    const color = colors[i % colors.length];
    
    return {
      id: i,
      x,
      y,
      size,
      isCircle,
      color,
      delay: Math.random() * 0.08,
    };
  });

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center space-y-6 animate-fade-in">
      {/* Animated SVG Container with Green Circle, Drawing Checkmark and Confetti */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        
        {/* Confetti Particles Exploding Outwards */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: p.x,
              y: p.y,
              scale: [0, 1.2, 1, 0],
              opacity: [1, 1, 0.7, 0],
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: 1.4,
              ease: [0.1, 0.8, 0.3, 1],
              delay: p.delay,
            }}
            className="absolute z-0 pointer-events-none"
            style={{
              width: p.size,
              height: p.size,
              borderRadius: p.isCircle ? "50%" : "2px",
              backgroundColor: p.color,
            }}
          />
        ))}

        {/* Dynamic Ripple Rings */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute w-16 h-16 rounded-full border-3 border-emerald-500/40 pointer-events-none"
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0.9 }}
          animate={{ scale: 1.4, opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.15 }}
          className="absolute w-16 h-16 rounded-full border-3 border-emerald-500/20 pointer-events-none"
        />

        {/* Main Circular Green Icon Badge */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 18,
            delay: 0.1,
          }}
          className="w-16 h-16 rounded-full bg-emerald-500 shadow-xl shadow-emerald-500/35 flex items-center justify-center z-10 pointer-events-none"
        >
          {/* Animated SVG Check Path */}
          <svg
            className="w-8 h-8 text-white stroke-current"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M20 6L9 17l-5-5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 0.45,
                ease: "easeOut",
                delay: 0.3,
              }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Success Title & Detail Message */}
      <div className="space-y-2 z-10 select-none">
        <motion.h4
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.35 }}
          className="text-base font-extrabold text-slate-800 tracking-tight"
        >
          {title}
        </motion.h4>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.35 }}
          className="text-xs text-slate-500 max-w-[280px] leading-relaxed mx-auto font-medium"
        >
          {message}
        </motion.p>
      </div>

      {/* Primary Control Button to Reset form and take another test */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, duration: 0.35 }}
        onClick={onReset}
        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-slate-400 focus:outline-none cursor-pointer"
      >
        Novo Teste de Lead
      </motion.button>
    </div>
  );
}

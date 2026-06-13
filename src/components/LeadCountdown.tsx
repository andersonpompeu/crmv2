import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface LeadCountdownProps {
  forwardedAt?: string;
  onExpire?: () => void;
}

export default function LeadCountdown({ forwardedAt, onExpire }: LeadCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 mins default
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (!forwardedAt) return;

    const calculateTimeLeft = () => {
      const start = new Date(forwardedAt).getTime();
      const limitMs = 15 * 60 * 1000; // 15 minutes limit
      const current = Date.now();
      const difference = limitMs - (current - start);

      if (difference <= 0) {
        setTimeLeft(0);
        setIsExpired(true);
        if (onExpire) {
          onExpire();
        }
        return false;
      } else {
        setTimeLeft(Math.floor(difference / 1000));
        setIsExpired(false);
        return true;
      }
    };

    // Calculate immediately
    const firstCheckActive = calculateTimeLeft();
    if (!firstCheckActive) return;

    const timer = setInterval(() => {
      const active = calculateTimeLeft();
      if (!active) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [forwardedAt, onExpire]);

  if (isExpired || timeLeft <= 0) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-center gap-3 text-rose-400 font-bold text-xs animate-pulse">
        <Clock className="w-5 h-5 text-rose-500" />
        <span>O tempo limite de 15 minutos para aceitar este lead expirou!</span>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");

  // Determine progress percent
  const percentLeft = (timeLeft / (15 * 60)) * 100;

  // Let's decide on color depending on time left
  const isEmergency = timeLeft < 3 * 60;

  return (
    <div className={`bg-gradient-to-r p-4.5 rounded-2xl border flex flex-col justify-center gap-3 shadow-lg select-none transition-all duration-300 ${
      isEmergency 
        ? "bg-rose-950/20 border-rose-500/35 text-rose-200" 
        : "bg-[#050410]/95 border-violet-500/20 text-slate-200"
    }`}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 shrink-0 ${isEmergency ? "text-rose-500 animate-pulse" : "text-violet-400"}`} strokeWidth={2.5} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tempo Limite de Aceite</span>
        </div>
        <div className={`font-mono text-xl font-black px-3.5 py-1.5 rounded-xl tracking-wider select-all ${
          isEmergency 
            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse" 
            : "bg-violet-950/40 text-[#00e676] border border-violet-500/30"
        }`}>
          {mm}:{ss}
        </div>
      </div>
      
      {/* Progress bar representing time left */}
      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900/60">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${
            isEmergency ? "bg-gradient-to-r from-rose-600 to-amber-500 animate-pulse" : "bg-gradient-to-r from-violet-600 via-indigo-500 to-emerald-500"
          }`}
          style={{ width: `${percentLeft}%` }}
        />
      </div>
      
      <p className="text-[11px] text-slate-450 leading-relaxed text-center">
        {isEmergency 
          ? "Atenção: Este convite expirará em breve e retornará para a fila geral!" 
          : "Aceite o convite antes do cronômetro zerar para reter esta oportunidade."}
      </p>
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { PvPRank, getDivisionRoman } from '../lib/PvPRankSystem';
import { TrendingDown, X, ChevronDown, Shield } from 'lucide-react';

interface Props {
  newRank: PvPRank;
  oldMMR: number;
  newMMR: number;
  onClose: () => void;
}

export function DerankModal({ newRank, oldMMR, newMMR, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [mmrDisplayed, setMmrDisplayed] = useState(oldMMR);
  const animRef = useRef<number>();
  const mmrLoss = oldMMR - newMMR;

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 60);

    const t2 = setTimeout(() => {
      const startTime = performance.now();
      const duration = 1500;
      const tick = (now: number) => {
        const p = Math.min((now - startTime) / duration, 1);
        // Slow easing — feels like a painful drop
        const eased = Math.pow(p, 0.6);
        setMmrDisplayed(Math.round(oldMMR + (newMMR - oldMMR) * eased));
        if (p < 1) animRef.current = requestAnimationFrame(tick);
        else setMmrDisplayed(newMMR);
      };
      animRef.current = requestAnimationFrame(tick);
    }, 700);

    const t3 = setTimeout(handleClose, 7000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-500 ${visible ? 'bg-black/92 backdrop-blur-xl' : 'bg-black/0'}`}
      onClick={handleClose}
    >
      {/* Dark red ambient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[150px] opacity-12 bg-red-700" />
      </div>

      <div
        className={`relative max-w-sm w-full z-10 transition-all duration-500 ${visible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-6'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Dim outer glow */}
        <div className="absolute inset-0 rounded-3xl blur-xl opacity-25 -z-10 scale-95 bg-red-900" />

        <div className="relative bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-red-950">

          {/* Top red line */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-red-800 to-transparent" />

          <button onClick={handleClose} className="absolute top-3 right-3 z-20 p-1.5 bg-slate-800/70 hover:bg-slate-700 rounded-full border border-slate-700/60 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>

          <div className="relative p-7 pt-6 text-center space-y-5">

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-900/50 text-red-700 bg-red-950/30 text-[10px] font-black uppercase tracking-[0.2em]">
              <TrendingDown className="w-3 h-3" /> Понижение ранга
            </div>

            {/* Rank icon — greyed, falling */}
            <div className="relative flex justify-center">
              {/* Falling arrows */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0 z-10">
                <ChevronDown className="w-5 h-5 text-red-600 animate-fall-1" />
                <ChevronDown className="w-5 h-5 text-red-800 animate-fall-2" />
              </div>
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl opacity-60 grayscale-[30%]"
                style={{
                  background: `linear-gradient(135deg, ${newRank.gradientFrom}70, ${newRank.gradientTo}70)`,
                  boxShadow: `0 0 25px #ef444430`,
                  animation: 'derank-drop 0.6s ease-out 0.3s both'
                }}>
                {newRank.icon}
              </div>
            </div>

            {/* Rank name — muted */}
            <div>
              <div className={`text-3xl font-black uppercase tracking-wider opacity-60 ${newRank.color}`}>
                {newRank.tier === 'master' || newRank.tier === 'grandmaster' ? newRank.fullName : newRank.tier.toUpperCase()}
              </div>
              {newRank.division > 0 && <div className={`text-xl font-bold mt-0.5 opacity-40 ${newRank.color}`}>{getDivisionRoman(newRank.division)}</div>}
              <p className="text-slate-600 text-xs italic mt-2">Не сдавайтесь — всё поправимо</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Shield className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-slate-600 text-[10px] uppercase font-bold tracking-wider">Рейтинг</span>
                </div>
                <div className="text-2xl font-black text-slate-400 font-mono tabular-nums">{mmrDisplayed}</div>
              </div>
              <div className="bg-red-950/30 border border-red-900/30 rounded-2xl p-3">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-red-800 text-[10px] uppercase font-bold tracking-wider">Потеря</span>
                </div>
                <div className="text-2xl font-black text-red-500 font-mono">−{mmrLoss}</div>
              </div>
            </div>

            <button onClick={handleClose}
              className="w-full py-3.5 rounded-xl font-bold text-slate-500 hover:text-white transition-all hover:bg-slate-800 active:scale-95 border border-slate-800 text-sm uppercase tracking-widest">
              Продолжить
            </button>
          </div>

          {/* Bottom line */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-red-900/60 to-transparent" />
        </div>
      </div>

      <style>{`
        @keyframes derank-drop {
          0% { transform: translateY(-12px); opacity: 0.3; }
          60% { transform: translateY(4px); }
          100% { transform: translateY(0); opacity: 0.6; }
        }
        @keyframes fall-1 {
          0%,100%{opacity:0.3;transform:translateY(-4px)} 50%{opacity:1;transform:translateY(0)}
        }
        @keyframes fall-2 {
          0%,100%{opacity:0.15;transform:translateY(-4px)} 50%{opacity:0.6;transform:translateY(0)}
        }
        .animate-fall-1{animation:fall-1 1.2s ease-in-out infinite}
        .animate-fall-2{animation:fall-2 1.2s ease-in-out 0.2s infinite}
      `}</style>
    </div>
  );
}
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, Sparkles } from 'lucide-react';

type Props = {
  type: 'level' | 'pvp';
  newTitle: string;
  icon?: any; // Оставляем для совместимости, но используем картинку
  onClose: () => void;
};

export function LevelUpModal({ type, newTitle, onClose }: Props) {
  
  // ЗАПУСК САЛЮТА
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    
    // Важно: zIndex должен быть выше модального окна (у модалки 150, ставим 9999)
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Стреляем слева и справа
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-300">
      
      {/* Карточка */}
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] overflow-visible">
        
        {/* Вращающиеся лучи на фоне */}
        <div className="absolute inset-0 bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent animate-spin-slow pointer-events-none rounded-3xl" />

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="relative z-10 flex flex-col items-center">
          
          {/* СУРИКАТ (Вместо оранжевого круга) */}
          <div className="mb-6 relative">
            {/* Свечение за головой */}
            <div className="absolute inset-0 bg-amber-500 blur-3xl opacity-40 rounded-full" />
            
            {/* Сама картинка */}
            <div className="w-40 h-40 flex items-center justify-center transition-transform hover:scale-110 duration-500">
               <img 
                 src="/meerkat/happy.png" 
                 alt="Happy Meerkat" 
                 // mix-blend-screen убирает черный фон, если он есть
                 className="w-full h-full object-contain mix-blend-screen drop-shadow-2xl animate-bounce"
               />
            </div>

            {/* Искры */}
            <div className="absolute -top-0 -right-0">
               <Sparkles className="w-10 h-10 text-yellow-300 animate-pulse" />
            </div>
          </div>

          <h2 className="text-4xl font-black text-white italic uppercase tracking-wider mb-2 drop-shadow-lg">
            {type === 'level' ? 'ПОВЫШЕНИЕ!' : 'НОВЫЙ РАНГ!'}
          </h2>
          
          <p className="text-slate-400 text-sm mb-8">
            Твой уровень знаний растет, как и твой сурикат!
          </p>

          <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-amber-500/30 px-8 py-4 rounded-2xl mb-8 transform rotate-1 hover:rotate-0 transition-transform">
            <span className="text-amber-400 font-black text-2xl md:text-3xl drop-shadow-sm uppercase tracking-widest">
              {newTitle}
            </span>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg hover:shadow-amber-500/20"
          >
            КРУТО!
          </button>
        </div>
      </div>
    </div>
  );
}
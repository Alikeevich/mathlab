import { Play, X, AlertTriangle } from 'lucide-react';

type Props = {
  type: 'tournament' | 'pvp';
  onReconnect: () => void;
  onDecline: () => void;
};

export function StickyReconnectToast({ type, onReconnect, onDecline }: Props) {
  return (
    <div className="fixed top-4 right-4 md:top-6 md:right-6 z-[9999] w-[90%] md:w-96 max-w-md mx-auto md:mx-0 animate-in slide-in-from-top-10 fade-in duration-500">
      <div className="bg-slate-900/95 border border-amber-500/50 backdrop-blur-md rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.2)] p-4 flex items-start gap-4 relative overflow-hidden">
        
        {/* Фоновая пульсация */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 blur-xl rounded-full animate-pulse" />

        {/* СУРИКАТ */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 bg-gradient-to-b from-slate-800 to-slate-900 rounded-full border-2 border-amber-500/30 flex items-center justify-center overflow-hidden shadow-lg">
             <img 
               src="/meerkat/thinking.png" 
               alt="Meerkat" 
               className="w-14 h-14 object-contain mt-2" 
               // Фолбэк
               onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerText = '🦦'; }}
             />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-red-500 w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
            <AlertTriangle className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* ТЕКСТ И КНОПКИ */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-bold text-lg leading-tight mb-1">
            Потеряна связь!
          </h4>
          <p className="text-slate-400 text-sm leading-snug mb-3">
            Найден активный {type === 'tournament' ? 'турнирный' : 'PvP'} матч. Вернуться?
          </p>

          <div className="flex gap-2">
            <button 
              onClick={onReconnect}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <Play className="w-3 h-3 fill-current" /> ДА
            </button>
            <button 
              onClick={onDecline}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-red-400 border border-slate-700 rounded-lg transition-all active:scale-95"
              title="Сдаться и выйти"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
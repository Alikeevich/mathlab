import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, XCircle, ArrowRight, AlertTriangle } from 'lucide-react';

type Props = {
  duelId: string;
  tournamentId?: string; // Опционально, если это турнир
  onReconnect: () => void;
  onDiscard: () => void;
};

export function StickyReconnect({ duelId, tournamentId, onReconnect, onDiscard }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Если нажали "Нет" — мы сдаемся, чтобы не держать соперника
  const handleAbandon = async () => {
    if (!user) return;
    if (!confirm('Вы точно хотите покинуть матч? Вам будет засчитано поражение, а соперник победит.')) return;
    
    setLoading(true);
    try {
      // Вызываем сдачу, чтобы закрыть матч в базе
      await supabase.rpc('surrender_duel', { 
        duel_uuid: duelId, 
        surrendering_uuid: user.id 
      });
      onDiscard(); // Убираем плашку
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-4 left-0 right-0 z-[200] flex justify-center px-4 animate-in slide-in-from-top-full duration-500">
      <div className="bg-slate-900/95 border-2 border-amber-500/50 backdrop-blur-md rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)] p-4 flex items-center gap-4 max-w-lg w-full relative overflow-hidden">
        
        {/* Анимация фона */}
        <div className="absolute top-0 left-0 bottom-0 w-2 bg-amber-500 animate-pulse" />

        {/* Сурикат */}
        <div className="shrink-0 relative">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/50">
             <img 
               src="/meerkat/thinking.png" 
               alt="Meerkat" 
               className="w-12 h-12 object-contain mix-blend-screen"
             />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 border border-slate-900">
             <AlertTriangle className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Текст */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-lg leading-tight">
            Матч еще идет!
          </h3>
          <p className="text-slate-400 text-xs mt-1 leading-snug">
            {tournamentId ? 'Твой турнирный бой активен.' : 'Ты вылетел из PvP дуэли.'}
            <br/>Соперник ждет тебя.
          </p>
        </div>

        {/* Кнопки */}
        <div className="flex flex-col gap-2 shrink-0">
          <button 
            onClick={onReconnect}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg"
          >
            ВЕРНУТЬСЯ <ArrowRight className="w-3 h-3" />
          </button>
          
          <button 
            onClick={handleAbandon}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-700 hover:border-red-500/30"
          >
            {loading ? 'Выход...' : 'Покинуть'}
          </button>
        </div>

      </div>
    </div>
  );
}
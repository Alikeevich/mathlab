import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Trophy, Swords, Zap, Loader } from 'lucide-react';

type Props = {
  duelId: string;
  onClose: () => void;
};

export function SpectatorModal({ duelId, onClose }: Props) {
  const [duel, setDuel] = useState<any>(null);
  const [p1, setP1] = useState<any>(null);
  const [p2, setP2] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Инициализация
  useEffect(() => {
    async function loadData() {
      const { data: d, error } = await supabase.from('duels').select('*').eq('id', duelId).single();
      
      if (error || !d) {
        console.error('Ошибка загрузки дуэли:', error);
        onClose();
        return;
      }

      setDuel(d);
      
      // Игрок 1 (всегда есть)
      const { data: user1 } = await supabase.from('profiles').select('username, mmr').eq('id', d.player1_id).single();
      if (user1) setP1(user1);
      
      // Игрок 2 (проверка на NULL - если это авто-победа)
      if (d.player2_id) {
        const { data: user2 } = await supabase.from('profiles').select('username, mmr').eq('id', d.player2_id).single();
        if (user2) setP2(user2);
      } else {
        setP2({ username: "Авто-бот", mmr: 0 }); // Заглушка для BYE
      }
      
      setLoading(false);
    }
    loadData();

    // 2. Подписка LIVE
    const channel = supabase
      .channel(`spectate-${duelId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${duelId}` }, 
      (payload) => {
        setDuel(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [duelId]);

  // 3. Авто-закрытие после финиша
  useEffect(() => {
    if (duel?.status === 'finished') {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [duel?.status, onClose]);


  if (loading || !duel) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center">
        <Loader className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const totalQ = duel.problem_ids?.length || 5;
  const p1Perc = Math.min(100, (duel.player1_progress / totalQ) * 100);
  const p2Perc = Math.min(100, (duel.player2_progress / totalQ) * 100);

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
      
      <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-white transition-colors z-50">
        <X className="w-8 h-8" />
      </button>

      <div className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-6 py-2 bg-red-500/20 border border-red-500/50 rounded-full text-red-400 animate-pulse mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="font-bold tracking-widest text-sm">ПРЯМОЙ ЭФИР</span>
          </div>
          <h2 className="text-4xl font-black text-white uppercase italic tracking-wider">
            АРЕНА НАБЛЮДАТЕЛЯ
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-slate-900 border-4 border-slate-700 rounded-full flex items-center justify-center z-10 shadow-2xl hidden md:flex">
            <Swords className="w-10 h-10 text-slate-400" />
          </div>

          {/* ИГРОК 1 */}
          <div className={`p-8 rounded-3xl border-2 transition-all duration-500 ${duel.winner_id === duel.player1_id ? 'bg-yellow-500/10 border-yellow-500' : 'bg-slate-800/50 border-cyan-500/30'}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-3xl font-black text-white mb-1 truncate max-w-[200px]">{p1?.username || '...'}</div>
                <div className="text-cyan-400 font-mono text-sm">{p1?.mmr || '---'} MP</div>
              </div>
              <div className="text-5xl font-mono font-bold text-white">{duel.player1_score}</div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400 uppercase font-bold">
                <span>Прогресс</span>
                <span>{Math.round(p1Perc)}%</span>
              </div>
              <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 transition-all duration-500 relative" style={{ width: `${p1Perc}%` }}>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 animate-pulse" />
                </div>
              </div>
            </div>

            {duel.winner_id === duel.player1_id && (
              <div className="mt-6 flex items-center gap-2 text-yellow-400 font-bold animate-bounce">
                <Trophy className="w-6 h-6" /> ПОБЕДИТЕЛЬ
              </div>
            )}
          </div>

          {/* ИГРОК 2 */}
          <div className={`p-8 rounded-3xl border-2 transition-all duration-500 ${duel.winner_id === duel.player2_id ? 'bg-yellow-500/10 border-yellow-500' : 'bg-slate-800/50 border-red-500/30'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="text-5xl font-mono font-bold text-white">{duel.player2_score}</div>
              <div className="text-right">
                <div className="text-3xl font-black text-white mb-1 truncate max-w-[200px]">{p2?.username || 'Ожидание...'}</div>
                <div className="text-red-400 font-mono text-sm">{p2?.mmr || '---'} MP</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400 uppercase font-bold">
                <span>Прогресс</span>
                <span>{Math.round(p2Perc)}%</span>
              </div>
              <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500 relative" style={{ width: `${p2Perc}%` }}>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 animate-pulse" />
                </div>
              </div>
            </div>

            {duel.winner_id === duel.player2_id && (
              <div className="mt-6 flex items-center justify-end gap-2 text-yellow-400 font-bold animate-bounce">
                ПОБЕДИТЕЛЬ <Trophy className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 text-center">
           {duel.status === 'finished' ? (
             <div className="space-y-4">
                <span className="px-6 py-2 rounded-full bg-slate-800 text-slate-400 font-bold border border-slate-700">МАТЧ ЗАВЕРШЕН</span>
                <p className="text-slate-500 text-sm">Окно закроется через 5 секунд...</p>
             </div>
           ) : (
             <div className="flex items-center justify-center gap-2 text-slate-400 text-sm animate-pulse">
               <Zap className="w-4 h-4 text-yellow-400" /> Битва в разгаре...
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
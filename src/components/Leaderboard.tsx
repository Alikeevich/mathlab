import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Medal, User } from 'lucide-react';
import { getRank } from '../lib/gameLogic';

export function Leaderboard({ onClose }: { onClose: () => void }) {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaders() {
      // Берем топ 10 по количеству экспериментов
      const { data } = await supabase
        .from('profiles')
        .select('username, clearance_level, total_experiments, success_rate')
        .order('total_experiments', { ascending: false })
        .limit(10);
      
      if (data) setLeaders(data);
      setLoading(false);
    }
    loadLeaders();
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-800 border border-amber-500/30 rounded-2xl p-8 relative overflow-hidden">
        {/* Фоновoe свечение */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full" />
        
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Топ Сотрудников</h2>
              <p className="text-amber-400/60 text-sm">Глобальный рейтинг лаборатории</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-4 py-2 bg-slate-700 rounded-lg">
            Закрыть
          </button>
        </div>

        <div className="space-y-3 relative z-10">
          {loading ? (
             <div className="text-center text-slate-500 py-10">Загрузка данных...</div>
          ) : leaders.map((player, index) => {
            const rank = getRank(player.clearance_level);
            const isTop3 = index < 3;
            
            return (
              <div 
                key={index}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  isTop3 
                    ? 'bg-gradient-to-r from-slate-800 to-slate-800/50 border-amber-500/30 hover:border-amber-400/50' 
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-xl ${
                  index === 0 ? 'bg-amber-400 text-slate-900' :
                  index === 1 ? 'bg-slate-300 text-slate-900' :
                  index === 2 ? 'bg-orange-700 text-white' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {index + 1}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-lg">{player.username}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 ${rank.color}`}>
                      {rank.title}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex gap-3 mt-1">
                    <span>LVL {player.clearance_level}</span>
                    <span>•</span>
                    <span className="text-cyan-400">{player.total_experiments} EXP</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-slate-400">Точность</div>
                  <div className={`font-mono font-bold ${
                    player.success_rate > 80 ? 'text-emerald-400' : 'text-slate-200'
                  }`}>
                    {Number(player.success_rate).toFixed(0)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// src/components/Leaderboard.tsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Zap, Target, X, Crown, Medal, Star, Swords, User, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { getRank } from '../lib/gameLogic';
import { getPvPRank, getPvPShortRank } from '../lib/gameLogic';

type FilterType = 'global' | 'pvp' | 'exp';

export function Leaderboard({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('global');

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
    loadLeaders(1, filter);
  }, [filter]);

  useEffect(() => {
    loadLeaders(page, filter);
  }, [page]);

  async function loadLeaders(pageNum: number, currentFilter: string) {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_leaderboard', {
      sort_type: currentFilter,
      page_number: pageNum,
      page_size: PAGE_SIZE
    });

    if (error) {
      console.error('Ошибка рейтинга:', error);
      setLeaders([]);
    } else if (data) {
      setLeaders(data);
    } else {
      setLeaders([]);
    }
    setLoading(false);
  }

  // Jump to current user
  const jumpToMe = async () => {
    if (!user) return;
    setLoading(true);

    const { data: myRank } = await supabase.rpc('get_user_rank_position', {
      target_user_id: user.id,
      sort_type: filter
    });

    if (myRank) {
      const myPage = Math.max(1, Math.ceil(myRank / PAGE_SIZE));
      if (myPage !== page) {
        setPage(myPage);
      }
      setTimeout(() => {
        const myElement = document.getElementById(`rank-${user.id}`);
        if (myElement) {
          myElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          myElement.classList.add('ring-2', 'ring-cyan-400', 'bg-cyan-900/30');
          setTimeout(() => myElement.classList.remove('ring-2', 'ring-cyan-400', 'bg-cyan-900/30'), 2000);
        }
      }, 800);
    } else {
      alert('Вас пока нет в рейтинге.');
    }
    setLoading(false);
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return { icon: <Crown className="w-5 h-5 md:w-6 md:h-6 text-amber-400 fill-current animate-bounce" />, color: 'text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-900/10' };
      case 2:
        return { icon: <Medal className="w-5 h-5 md:w-6 md:h-6 text-slate-300" />, color: 'text-slate-300', border: 'border-slate-400/50', bg: 'bg-slate-800/30' };
      case 3:
        return { icon: <Medal className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />, color: 'text-orange-500', border: 'border-orange-600/50', bg: 'bg-orange-900/10' };
      default:
        return { icon: <span className="font-mono font-bold text-sm md:text-base text-slate-500">#{rank}</span>, color: 'text-white', border: 'border-slate-700', bg: 'bg-slate-800/20' };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-2 md:p-4 animate-in fade-in zoom-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* background effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        {/* header */}
        <div className="p-4 md:p-6 border-b border-slate-700 bg-slate-800/50 flex flex-col gap-4 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">Рейтинг</h2>
                <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest font-bold">Зал Славы MathLab</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* tabs */}
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button onClick={() => setFilter('global')} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${filter === 'global' ? 'bg-slate-800 text-white shadow-md border border-slate-600' : 'text-slate-500 hover:text-slate-300'}`}>
              <Trophy className="w-3 h-3" /> Общий
            </button>
            <button onClick={() => setFilter('pvp')} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${filter === 'pvp' ? 'bg-red-900/20 text-red-400 border border-red-500/30 shadow-md' : 'text-slate-500 hover:text-red-400'}`}>
              <Swords className="w-3 h-3" /> PvP
            </button>
            <button onClick={() => setFilter('exp')} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${filter === 'exp' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/30 shadow-md' : 'text-slate-500 hover:text-cyan-400'}`}>
              <Zap className="w-3 h-3" /> Опыт
            </button>
          </div>
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 custom-scrollbar bg-slate-900/50 relative" ref={listRef}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3 absolute inset-0">
              <Loader className="w-8 h-8 animate-spin text-cyan-500" />
              <span className="text-xs font-mono uppercase">Загрузка данных...</span>
            </div>
          ) : leaders.length === 0 ? (
            <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl m-4">Список пуст</div>
          ) : (
            leaders.map((player: any, idx: number) => {
              const style = getRankStyle(player.rank || (page - 1) * PAGE_SIZE + idx + 1);
              const rankInfo = getRank(player.clearance_level, player.role);
              const isMe = player.user_id === user?.id;

              // PvP rank calculation (safe)
              const mmrForRank = typeof player.mmr === 'number' ? player.mmr : 1000;
              const pvprank = getPvPRank(mmrForRank);
              const pvprankLabel = player.has_calibrated ? pvprank.fullName : `Unranked (${player.calibration_matches_played ?? 0}/5)`;
              const pvpshort = player.has_calibrated ? getPvPShortRank(mmrForRank) : 'Unranked';

              return (
                <div
                  key={player.user_id}
                  id={`rank-${player.user_id}`}
                  className={`
                    relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300
                    ${style.border} ${style.bg}
                    ${isMe ? 'ring-1 ring-cyan-400/50 bg-cyan-900/10' : ''}
                    hover:bg-slate-800
                  `}
                >
                  {/* place */}
                  <div className="w-8 h-8 flex items-center justify-center shrink-0 font-black text-lg">
                    {style.icon}
                  </div>

                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm md:text-base truncate ${isMe ? 'text-cyan-300' : 'text-white'}`}>
                        {player.username} {isMe && '(Вы)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] font-bold px-1.5 rounded bg-slate-950 border border-slate-800 ${rankInfo.color} uppercase tracking-wider`}>
                        {rankInfo.title}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">LVL {player.clearance_level}</span>
                      {/* PvP rank badge (only show when PvP filter or always in details) */}
                      <span className="ml-2 text-[9px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                        {pvprankLabel}
                      </span>
                    </div>
                  </div>

                  {/* stats */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="text-right">
                      <div className={`font-black font-mono text-base md:text-xl leading-none ${filter === 'pvp' ? 'text-red-400' : filter === 'exp' ? 'text-cyan-400' : 'text-white'}`}>
                        {filter === 'pvp' ? (player.has_calibrated ? player.mmr : '—') : filter === 'exp' ? player.total_experiments : player.global_score}
                      </div>
                      <div className="text-[8px] md:text-[10px] text-slate-500 font-mono uppercase tracking-wider text-right">
                        {filter === 'pvp' ? 'MP Score' : filter === 'exp' ? 'Задачи' : 'Rating'}
                      </div>
                    </div>

                    {/* details (always visible) */}
                    <div className="flex items-center gap-1.5 opacity-80">
                      <div className="flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded text-red-400 border border-red-500/20" title="PvP Рейтинг">
                        <Swords className="w-3 h-3" />
                        <span className="text-[9px] font-bold">{player.has_calibrated ? player.mmr : '—'}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-cyan-500/10 px-1.5 py-0.5 rounded text-cyan-400 border border-cyan-500/20" title="Всего задач">
                        <Zap className="w-3 h-3 fill-current" />
                        <span className="text-[9px] font-bold">{player.total_experiments}</span>
                      </div>
                      <div className="hidden sm:flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-400 border border-emerald-500/20" title="Точность">
                        <Target className="w-3 h-3" />
                        <span className="text-[9px] font-bold">{Number(player.success_rate).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* footer */}
        <div className="p-3 md:p-4 border-t border-slate-800 bg-slate-900 z-20">
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
              <span className="flex items-center px-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-400 font-mono text-xs">
                {page}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={leaders.length < PAGE_SIZE || loading}
                className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {user && (
              <button
                onClick={jumpToMe}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-cyan-900/20 transition-all active:scale-95"
              >
                <User className="w-3 h-3" />
                <span>ГДЕ Я?</span>
              </button>
            )}
          </div>

          <div className="text-center pt-2 border-t border-slate-800/50">
            <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">
              RATING = MP + (EXP × 5) + (ACC% × 2)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

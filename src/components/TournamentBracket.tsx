import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Swords, Crown, Shield, Loader } from 'lucide-react';

type BracketProps = {
  tournamentId: string;
  onEnterMatch: (duelId: string) => void;
  isTeacher?: boolean;
};

export function TournamentBracket({ tournamentId, onEnterMatch, isTeacher = false }: BracketProps) {
  const { user } = useAuth();
  const [duels, setDuels] = useState<any[]>([]);
  const [tournamentInfo, setTournamentInfo] = useState<any>(null);
  const [rounds, setRounds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    const sub = supabase
      .channel(`bracket-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duels', filter: `tournament_id=eq.${tournamentId}` }, 
      () => { fetchData(); })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [tournamentId]);

  async function fetchData() {
    const { data: tData } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
    setTournamentInfo(tData);

    const { data: dData } = await supabase
      .from('duels')
      .select(`
        *,
        p1:profiles!duels_player1_id_fkey(username),
        p2:profiles!duels_player2_id_fkey(username)
      `)
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })
      .order('created_at', { ascending: true });

    if (dData) {
      setDuels(dData);
      const uniqueRounds = Array.from(new Set(dData.map(d => d.round))).sort((a, b) => a - b);
      setRounds(uniqueRounds);
    }
    setLoading(false);
  }

  const myActiveDuel = duels.find(d => 
    d.status === 'active' && 
    (d.player1_id === user?.id || d.player2_id === user?.id)
  );

  // === БЕЗОПАСНАЯ ЛОГИКА ПОБЕДИТЕЛЯ ===
  const finalDuel = duels.length > 0 
    ? duels.filter(d => d.round === Math.max(...rounds)).find(d => d.winner_id)
    : null;
    
  const championName = finalDuel 
    ? (finalDuel.winner_id === finalDuel.player1_id ? finalDuel.p1?.username : finalDuel.p2?.username)
    : '???';

  if (loading) return <div className="flex justify-center p-10"><Loader className="animate-spin text-cyan-400 w-10 h-10"/></div>;

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-700 overflow-hidden">
      
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-white uppercase tracking-widest">Турнирная Сетка</span>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          ROUND: <span className="text-white">{tournamentInfo?.current_round}</span>
        </div>
      </div>

      {!isTeacher && myActiveDuel && (
        <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/30 flex justify-between items-center animate-pulse">
          <div className="text-emerald-400 font-bold text-sm md:text-base">Ваш матч готов! Раунд {myActiveDuel.round}</div>
          <button 
            onClick={() => onEnterMatch(myActiveDuel.id)}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition-all shadow-lg flex items-center gap-2"
          >
            <Swords className="w-4 h-4" /> <span className="hidden md:inline">ПЕРЕЙТИ К БИТВЕ</span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-x-auto p-6 flex gap-8">
        {rounds.length === 0 && (
           <div className="text-slate-500 m-auto">Сетка формируется...</div>
        )}

        {rounds.map((round) => (
          <div key={round} className="min-w-[240px] flex flex-col gap-4">
            <div className="text-center text-cyan-500 font-bold font-mono text-sm uppercase mb-2 bg-cyan-900/20 py-1 rounded">
              Раунд {round}
            </div>
            
            {duels.filter(d => d.round === round).map((duel) => {
              const isMyDuel = duel.player1_id === user?.id || duel.player2_id === user?.id;
              const name1 = duel.p1?.username || 'Ожидание...';
              const name2 = duel.player2_id ? (duel.p2?.username || 'Ожидание...') : '---';

              return (
                <div 
                  key={duel.id} 
                  className={`relative p-3 rounded-xl border-2 flex flex-col gap-2 transition-all ${
                    isMyDuel ? 'border-cyan-500 bg-cyan-900/10' : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  <div className={`flex justify-between items-center px-2 py-1 rounded ${duel.winner_id === duel.player1_id ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300'}`}>
                    <span className="font-bold truncate text-sm">{name1}</span>
                    {duel.winner_id === duel.player1_id && <Crown className="w-3 h-3 text-amber-400" />}
                  </div>

                  <div className="h-px bg-slate-700 w-full" />

                  <div className={`flex justify-between items-center px-2 py-1 rounded ${duel.winner_id === duel.player2_id ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300'}`}>
                    <span className="font-bold truncate text-sm">{name2}</span>
                    {duel.winner_id === duel.player2_id && <Crown className="w-3 h-3 text-amber-400" />}
                  </div>

                  <div className="absolute -top-2 -right-2">
                    {duel.status === 'active' && !duel.winner_id && (
                        <span className="flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                    {(duel.status === 'finished' || duel.winner_id) && (
                        <div className="bg-slate-700 rounded-full p-1 border border-slate-600">
                           <Shield className="w-3 h-3 text-slate-400" />
                        </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        {/* ФИНАЛИСТ (БЕЗОПАСНЫЙ РЕНДЕР) */}
        {tournamentInfo?.status === 'finished' && finalDuel && (
           <div className="min-w-[200px] flex flex-col justify-center items-center animate-in zoom-in duration-500 border-l-2 border-slate-700 pl-8 border-dashed">
              <Trophy className="w-16 h-16 text-yellow-400 mb-4 drop-shadow-lg animate-bounce" />
              <div className="text-yellow-400 font-black text-2xl uppercase tracking-widest">ПОБЕДИТЕЛЬ</div>
              <div className="text-white font-bold text-xl mt-2 bg-slate-800 px-6 py-2 rounded-xl border border-yellow-500/50">
                {championName}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
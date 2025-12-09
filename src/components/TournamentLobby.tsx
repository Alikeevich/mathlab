import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Loader, Shield, Swords } from 'lucide-react';
import { TournamentBracket } from './TournamentBracket';
import { TournamentPlay } from './TournamentPlay'; // Импортируем нашу новую арену

type LobbyProps = {
  tournamentId: string;
};

export function TournamentLobby({ tournamentId }: LobbyProps) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<any[]>([]);
  const [tournamentCode, setTournamentCode] = useState<string>('');
  const [status, setStatus] = useState<'waiting' | 'active' | 'finished'>('waiting');
  
  // АКТИВНЫЙ МАТЧ (Если мы деремся прямо сейчас)
  const [activeDuelId, setActiveDuelId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Грузим инфу
    async function loadInfo() {
      const { data } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
      if (data) {
        setTournamentCode(data.code);
        setStatus(data.status);
      }
      fetchParticipants();
      checkForActiveDuel();
    }
    loadInfo();

    // 2. Realtime подписки
    const tourSub = supabase.channel(`tour-status-${tournamentId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${tournamentId}` }, 
      (payload) => setStatus(payload.new.status))
      .subscribe();

    const partSub = supabase.channel(`tour-parts-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants', filter: `tournament_id=eq.${tournamentId}` }, 
      () => fetchParticipants())
      .subscribe();

    // Подписка на ДУЭЛИ (чтобы узнать, когда начался МОЙ бой)
    const duelSub = supabase.channel(`tour-duels-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duels', filter: `tournament_id=eq.${tournamentId}` }, 
      () => checkForActiveDuel()) // При любом изменении дуэлей проверяем, не наша ли очередь
      .subscribe();

    return () => {
      supabase.removeChannel(tourSub);
      supabase.removeChannel(partSub);
      supabase.removeChannel(duelSub);
    };
  }, [tournamentId]);

  async function fetchParticipants() {
    const { data } = await supabase.from('tournament_participants').select('*, profiles(username, mmr)').eq('tournament_id', tournamentId);
    if (data) setParticipants(data);
  }

  // ПРОВЕРКА: ЕСТЬ ЛИ У МЕНЯ АКТИВНЫЙ БОЙ?
  async function checkForActiveDuel() {
    if (!user) return;
    const { data } = await supabase
      .from('duels')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('status', 'active')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .maybeSingle(); // Берем один

    if (data) {
      setActiveDuelId(data.id); // УРА! БОЙ!
    } else {
      setActiveDuelId(null); // Пока ждем
    }
  }

  // === РЕЖИМ БОЯ ===
  if (activeDuelId) {
    return (
      <TournamentPlay 
        duelId={activeDuelId} 
        onFinished={() => {
           setActiveDuelId(null); // Бой кончился, возвращаемся в сетку
           fetchParticipants(); // Обновляем данные
        }} 
      />
    );
  }

  // === СЕТКА (ТУРНИР ИДЕТ) ===
  if (status === 'active' || status === 'finished') {
    return (
      <div className="h-full p-4 md:p-8 flex flex-col">
        {/* Сообщение, если боя нет */}
        {!activeDuelId && status === 'active' && (
           <div className="bg-slate-800 p-4 text-center text-slate-400 mb-4 rounded-xl border border-slate-700 animate-pulse">
             Ожидайте завершения других матчей... Ваш бой скоро появится.
           </div>
        )}
        <div className="flex-1 overflow-hidden">
           <TournamentBracket 
             tournamentId={tournamentId} 
             onEnterMatch={(dId) => setActiveDuelId(dId)} 
           />
        </div>
      </div>
    );
  }

  // === ЛОББИ (ОЖИДАНИЕ) ===
  return (
    <div className="flex items-center justify-center h-full p-4">
      <div className="w-full max-w-5xl bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 animate-pulse" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Shield className="w-8 h-8 text-cyan-400" />
              <h1 className="text-3xl font-black text-white uppercase italic">Турнирное Лобби</h1>
            </div>
            <p className="text-slate-400 text-sm">Код: <span className="text-cyan-400 font-mono font-bold text-lg ml-2">{tournamentCode}</span></p>
          </div>
          <div className="flex items-center gap-3 bg-slate-800 px-6 py-3 rounded-full border border-slate-700">
            <Loader className="w-5 h-5 text-cyan-400 animate-spin" />
            <span className="text-white font-medium animate-pulse">Ожидание организатора...</span>
          </div>
        </div>

        <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm uppercase tracking-wider font-bold">Участники ({participants.length})</h3>
            <Users className="w-5 h-5 text-slate-500" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border bg-slate-900 border-slate-700">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {p.profiles?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate text-slate-200">{p.profiles?.username || '...'}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{p.profiles?.mmr} MP</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
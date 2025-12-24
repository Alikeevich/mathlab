import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'react-qr-code';
import { TournamentBracket } from './TournamentBracket';
import { Users, Play, Trophy, Share2, X, Crown, Copy, Loader, RefreshCw, Trash2, AlertTriangle, Eye, Swords } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SpectatorModal } from './SpectatorModal';

export function TournamentAdmin({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
 
  // Состояния данных
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string>('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeDuels, setActiveDuels] = useState<any[]>([]);
 
  // Состояния интерфейса
  const [status, setStatus] = useState('waiting');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [spectatingDuelId, setSpectatingDuelId] = useState<string | null>(null);
  // === 1. ИНИЦИАЛИЗАЦИЯ ТУРНИРА ===
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    async function initTournament() {
      if (!user) return;
      
      // ИСПРАВЛЕНИЕ: Сначала проверяем, есть ли активный турнир для этого учителя
      const { data: existingTournament, error: checkError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('created_by', user.id)
        .in('status', ['waiting', 'active']) // Проверяем waiting или active
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (checkError) {
        console.error('Ошибка проверки турнира:', checkError);
      }
      
      if (existingTournament) {
        // Если найден — переподключаемся к нему
        setTournamentId(existingTournament.id);
        setJoinCode(existingTournament.code);
        setStatus(existingTournament.status);
        fetchParticipants(existingTournament.id);
        fetchActiveDuels(); // Если статус active
        // Подписка на участников
        channel = supabase
          .channel('admin-participants')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants', filter: `tournament_id=eq.${existingTournament.id}` },
          () => { fetchParticipants(existingTournament.id); })
          .subscribe();
        return; // Не создаём новый
      }
      
      // Если нет — очищаем старые и создаём новый (как раньше)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      await supabase.from('tournaments').delete()
        .eq('created_by', user.id)
        .eq('status', 'waiting')
        .lt('created_at', oneHourAgo);
      
      await supabase.rpc('cleanup_stale_tournaments');
      
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const { data, error } = await supabase
        .from('tournaments')
        .insert({ created_by: user.id, code })
        .select()
        .single();
      
      if (error) {
        console.error('Ошибка создания турнира:', error);
        alert('Не удалось создать турнир. Проверьте соединение.');
        return;
      }
       
      if (data) {
        setTournamentId(data.id);
        setJoinCode(code);
       
        // Подписка на участников (кто заходит в лобби)
        channel = supabase
          .channel('admin-participants')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants', filter: `tournament_id=eq.${data.id}` },
          () => { fetchParticipants(data.id); })
          .subscribe();
      }
    }
    initTournament();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);
  // === 2. ПОДПИСКА НА АКТИВНЫЕ ДУЭЛИ (LIVE) ===
  useEffect(() => {
    let duelChannel: RealtimeChannel | null = null;
   
    // Подписываемся только если турнир уже начался
    if (tournamentId && status === 'active') {
       fetchActiveDuels();
      
       duelChannel = supabase
        .channel(`admin-duels-${tournamentId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'duels', filter: `tournament_id=eq.${tournamentId}` },
        () => fetchActiveDuels())
        .subscribe();
    }
    return () => {
      if (duelChannel) supabase.removeChannel(duelChannel);
    }
  }, [tournamentId, status]);
  // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ЗАГРУЗКИ ===
  async function fetchParticipants(tId: string) {
    const targetId = tId || tournamentId;
    if (!targetId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tournament_participants')
      .select('*, profiles(username, mmr, clearance_level)')
      .eq('tournament_id', targetId);
   
    if (error) {
      console.error("Ошибка загрузки участников:", error);
    } else if (data) {
      setParticipants(data);
    }
    setLoading(false);
  }
  async function fetchActiveDuels() {
    if (!tournamentId) return;
   
    const { data, error } = await supabase
      .from('duels')
      .select(`
        id, status, player1_score, player2_score, round,
        p1:profiles!duels_player1_id_fkey(username),
        p2:profiles!duels_player2_id_fkey(username)
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'active')
      .order('round', { ascending: false }); // Свежие раунды сверху
    if (error) {
      console.error("Ошибка загрузки матчей:", error);
      return;
    }
   
    if (data) setActiveDuels(data);
  }
  // === 3. ЗАПУСК ТУРНИРА ===
  async function startTournament() {
    if (!tournamentId || participants.length < 2) {
      alert("Нужно минимум 2 участника для старта!");
      return;
    }
    setStarting(true);
    try {
      const { error } = await supabase.rpc('start_tournament_engine', { t_id: tournamentId });
     
      if (error) throw error;
     
      setStatus('active');
    } catch (err) {
      console.error('Ошибка старта:', err);
      alert('Ошибка при запуске турнира.');
    } finally {
      setStarting(false);
    }
  }
  // === 4. УДАЛЕНИЕ ТУРНИРА ===
  async function destroyTournament() {
    if (tournamentId) {
      await supabase.from('tournaments').delete().eq('id', tournamentId);
      onClose();
    }
  }
  const handleCloseAttempt = () => {
    if (status === 'active' || status === 'finished') {
      // Если турнир идет, просто закрываем админку (сворачиваем), турнир остается в базе
      onClose();
    } else {
      // Если еще не начали - спрашиваем подтверждение на удаление
      setShowConfirmClose(true);
    }
  };
  const joinLink = `${window.location.origin}/?t=${joinCode}`;
  return (
    <>
      {/* МОДАЛКА СПЕКТАТОРА (ПРОСМОТР МАТЧА) */}
      {spectatingDuelId && (
        <SpectatorModal
          duelId={spectatingDuelId}
          onClose={() => setSpectatingDuelId(null)}
        />
      )}
      {/* МОДАЛКА ПОДТВЕРЖДЕНИЯ ЗАКРЫТИЯ */}
      {showConfirmClose && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Закрыть лобби?</h3>
              <p className="text-slate-400 text-sm">
                Турнир еще не начался. Если вы выйдете, комната будет уничтожена, а участники отключены.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmClose(false)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={destroyTournament}
                className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ОСНОВНОЕ ОКНО АДМИНКИ */}
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
       
        {/* Шапка */}
        <div className="p-6 border-b border-cyan-500/20 flex justify-between items-center bg-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-amber-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Панель Учителя</h2>
              <p className="text-slate-400 text-xs uppercase tracking-widest">Управление турниром</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {/* Кнопка "Удалить турнир" */}
             <button
               onClick={() => setShowConfirmClose(true)}
               className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-colors"
               title="Распустить турнир"
             >
               <Trash2 className="w-5 h-5" />
             </button>
            
             {/* Кнопка "Закрыть окно" */}
             <button
               onClick={handleCloseAttempt}
               className="p-2 hover:bg-slate-700 rounded-full transition-colors"
             >
               <X className="w-6 h-6 text-slate-400 hover:text-white" />
             </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
         
          {/* === ЛЕВАЯ КОЛОНКА (Управление / Live Feed) === */}
          <div className="w-full md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col bg-slate-800/50 overflow-y-auto shrink-0">
           
            {status === 'waiting' ? (
               // РЕЖИМ ОЖИДАНИЯ: QR КОД
               <div className="flex flex-col items-center justify-center flex-1 py-10">
                  <div className="bg-white p-4 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.2)] mb-8 transform hover:scale-105 transition-transform duration-300">
                    <QRCode value={joinLink} size={220} />
                  </div>
                 
                  <div className="flex flex-col items-center gap-2 mb-8">
                    <span className="text-slate-400 text-sm uppercase tracking-wider">Код доступа</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(joinCode)}
                      className="text-6xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 hover:scale-105 transition-transform flex items-center gap-4 cursor-pointer group"
                      title="Нажми чтобы скопировать"
                    >
                      {joinCode}
                      <Copy className="w-6 h-6 text-slate-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  </div>
                 
                  <button
                    disabled={participants.length < 2 || starting}
                    onClick={startTournament}
                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xl rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-900/20"
                  >
                    {starting ? <Loader className="w-6 h-6 animate-spin"/> : <Play className="w-6 h-6 fill-current" />}
                    {starting ? 'ЗАПУСК...' : 'НАЧАТЬ БИТВУ'}
                  </button>
                  <p className="text-slate-500 text-xs mt-3 text-center">Нужно минимум 2 участника для старта</p>
               </div>
            ) : (
               // РЕЖИМ БИТВЫ: СПИСОК LIVE МАТЧЕЙ
               <div className="flex flex-col h-full">
                 <div className="flex items-center gap-2 mb-4 text-white font-bold animate-pulse">
                   <div className="w-2 h-2 bg-red-500 rounded-full" />
                   ПРЯМОЙ ЭФИР ({activeDuels.length})
                 </div>
                
                 <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                   {activeDuels.map((duel) => (
                     <div
                       key={duel.id}
                       onClick={() => setSpectatingDuelId(duel.id)}
                       className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 p-4 rounded-xl cursor-pointer transition-all group relative overflow-hidden"
                     >
                       {/* Фон с градиентом при ховере */}
                       <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                       <div className="relative z-10">
                         <div className="flex justify-between items-center text-xs text-slate-500 mb-2 font-mono">
                           <span className="bg-slate-900 px-2 py-0.5 rounded text-cyan-400 border border-slate-700">R{duel.round}</span>
                           <span className="flex items-center gap-1 group-hover:text-cyan-400 transition-colors"><Eye className="w-3 h-3" /> Watch</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <div className="font-bold text-white truncate max-w-[80px]">{duel.p1?.username || '???'}</div>
                           <div className="text-sm font-mono font-black text-slate-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                             {duel.player1_score} : {duel.player2_score}
                           </div>
                           <div className="font-bold text-white truncate max-w-[80px] text-right">{duel.p2?.username || '???'}</div>
                         </div>
                       </div>
                     </div>
                   ))}
                  
                   {activeDuels.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-40 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                       <Swords className="w-8 h-8 mb-2 opacity-50" />
                       <p className="text-sm">Нет активных матчей</p>
                     </div>
                   )}
                 </div>
               </div>
            )}
          </div>
          {/* === ПРАВАЯ КОЛОНКА (СПИСОК ИЛИ СЕТКА) === */}
          <div className="flex-1 p-8 bg-slate-900 overflow-y-auto">
           
            {status === 'active' || status === 'finished' ? (
               <div className="h-full min-h-[500px]">
                 {tournamentId && (
                   <TournamentBracket
                     tournamentId={tournamentId}
                     onEnterMatch={() => {}} // Учитель не играет
                     isTeacher={true}
                   />
                 )}
               </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg">
                      <Users className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Список участников</h3>
                  </div>
                 
                  <div className="flex items-center gap-4">
                     {/* Кнопка ручного обновления */}
                     <button
                       onClick={() => tournamentId && fetchParticipants(tournamentId)}
                       className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                       title="Обновить список"
                     >
                       <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                     </button>
                     <span className="px-3 py-1 bg-slate-800 rounded-full text-slate-300 font-mono text-sm">
                       Всего: {participants.length}
                     </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {participants.map((p) => {
                    const username = p.profiles?.username || 'Неизвестный';
                    const mmr = p.profiles?.mmr || '???';
                    const lvl = p.profiles?.clearance_level ?? 0;
                    const letter = username[0]?.toUpperCase() || '?';
                    return (
                      <div key={p.id} className="group p-4 bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-xl flex items-center gap-4 transition-all hover:-translate-y-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {letter}
                        </div>
                        <div>
                          <div className="font-bold text-white text-lg group-hover:text-cyan-300 transition-colors">
                            {username}
                          </div>
                          <div className="text-xs text-slate-400 flex gap-2">
                            <span>{mmr} MP</span>
                            <span>•</span>
                            <span>LVL {lvl}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
               
                {participants.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                    <Loader className="w-10 h-10 mb-4 animate-spin opacity-50" />
                    <p>Ожидание подключения учеников...</p>
                    <p className="text-xs mt-2">Попросите их ввести код или сканировать QR</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
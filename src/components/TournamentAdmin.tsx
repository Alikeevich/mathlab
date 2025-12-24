import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'react-qr-code';
import { TournamentBracket } from './TournamentBracket';
import { Users, Play, Trophy, Share2, X, Crown, Copy, Loader, RefreshCw, Trash2, AlertTriangle, Eye, Swords } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SpectatorModal } from './SpectatorModal'; // <--- ИМПОРТ

export function TournamentAdmin({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string>('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [status, setStatus] = useState('waiting');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  
  // LIVE DUELS
  const [activeDuels, setActiveDuels] = useState<any[]>([]);
  const [spectatingDuelId, setSpectatingDuelId] = useState<string | null>(null);

  // 1. Инициализация
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    async function initTournament() {
      if (!user) return;

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
        console.error('Ошибка создания:', error);
        alert('Не удалось создать турнир.');
        return;
      }
        
      if (data) {
        setTournamentId(data.id);
        setJoinCode(code);
        
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

  // Подгрузка активных дуэлей для списка LIVE
  useEffect(() => {
    let duelChannel: RealtimeChannel | null = null;
    
    if (tournamentId && status === 'active') {
       fetchActiveDuels();
       
       duelChannel = supabase
        .channel(`admin-duels-${tournamentId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'duels', filter: `tournament_id=eq.${tournamentId}` },
        () => fetchActiveDuels())
        .subscribe();
    }

    return () => { if(duelChannel) supabase.removeChannel(duelChannel); }
  }, [tournamentId, status]);


  async function fetchParticipants(tId: string) {
    const targetId = tId || tournamentId;
    if (!targetId) return;

    setLoading(true);
    const { data } = await supabase
      .from('tournament_participants')
      .select('*, profiles(username, mmr, clearance_level)')
      .eq('tournament_id', targetId);
    
    if (data) setParticipants(data);
    setLoading(false);
  }

  async function fetchActiveDuels() {
    if (!tournamentId) return;
    // Берем активные дуэли с именами
    const { data } = await supabase
      .from('duels')
      .select(`
        id, status, player1_score, player2_score, round,
        p1:profiles!duels_player1_id_fkey(username),
        p2:profiles!duels_player2_id_fkey(username)
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'active')
      .order('round', { ascending: false }); // Самые свежие раунды сверху

    if (data) setActiveDuels(data);
  }

  // 2. СТАРТ
  async function startTournament() {
    if (!tournamentId || participants.length < 2) {
      alert("Нужно минимум 2 участника!");
      return;
    }

    setStarting(true);
    try {
      const { error } = await supabase.rpc('start_tournament_engine', { t_id: tournamentId });
      if (error) throw error;
      setStatus('active'); 
    } catch (err) {
      console.error('Ошибка:', err);
      alert('Ошибка при запуске.');
    } finally {
      setStarting(false);
    }
  }

  // 3. УНИЧТОЖЕНИЕ
  async function destroyTournament() {
    if (tournamentId) {
      await supabase.from('tournaments').delete().eq('id', tournamentId);
      onClose();
    }
  }

  const handleCloseAttempt = () => {
    if (status === 'active' || status === 'finished') {
      onClose();
    } else {
      setShowConfirmClose(true);
    }
  };

  const joinLink = `${window.location.origin}/?t=${joinCode}`;

  return (
    <>
      {/* МОДАЛКА СПЕКТАТОРА */}
      {spectatingDuelId && (
        <SpectatorModal 
          duelId={spectatingDuelId} 
          onClose={() => setSpectatingDuelId(null)} 
        />
      )}

      {showConfirmClose && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center mb-6">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Закрыть лобби?</h3>
              <p className="text-slate-400 text-sm">Турнир будет отменен.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowConfirmClose(false)} className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold">Отмена</button>
              <button onClick={destroyTournament} className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold">Удалить</button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        <div className="p-6 border-b border-cyan-500/20 flex justify-between items-center bg-slate-800">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-amber-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Панель Учителя</h2>
              <p className="text-slate-400 text-xs uppercase tracking-widest">Управление турниром</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setShowConfirmClose(true)} className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-colors">
               <Trash2 className="w-5 h-5" />
             </button>
             <button onClick={handleCloseAttempt} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
               <X className="w-6 h-6 text-slate-400 hover:text-white" />
             </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* ЛЕВАЯ КОЛОНКА */}
          <div className="w-full md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col bg-slate-800/50 overflow-y-auto">
            
            {status === 'waiting' ? (
               // РЕЖИМ ОЖИДАНИЯ: QR КОД
               <div className="flex flex-col items-center justify-center flex-1 py-10">
                  <div className="bg-white p-4 rounded-2xl shadow-lg mb-8"><QRCode value={joinLink} size={200} /></div>
                  <div className="text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-8 cursor-pointer" onClick={() => navigator.clipboard.writeText(joinCode)}>
                    {joinCode}
                  </div>
                  <button 
                    disabled={participants.length < 2 || starting}
                    onClick={startTournament}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-50 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg"
                  >
                    {starting ? <Loader className="w-5 h-5 animate-spin"/> : <Play className="w-5 h-5 fill-current" />} 
                    {starting ? 'ЗАПУСК...' : 'НАЧАТЬ'}
                  </button>
               </div>
            ) : (
               // РЕЖИМ БИТВЫ: СПИСОК LIVE МАТЧЕЙ
               <div className="flex flex-col h-full">
                 <div className="flex items-center gap-2 mb-4 text-white font-bold">
                   <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                   ПРЯМОЙ ЭФИР ({activeDuels.length})
                 </div>
                 
                 <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                   {activeDuels.map((duel) => (
                     <div 
                       key={duel.id}
                       onClick={() => setSpectatingDuelId(duel.id)}
                       className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 p-4 rounded-xl cursor-pointer transition-all group"
                     >
                       <div className="flex justify-between items-center text-xs text-slate-500 mb-2 font-mono">
                         <span>R{duel.round}</span>
                         <span className="flex items-center gap-1 group-hover:text-cyan-400"><Eye className="w-3 h-3" /> Watch</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <div className="font-bold text-white truncate max-w-[80px]">{duel.p1?.username}</div>
                         <div className="text-sm font-mono text-slate-400">{duel.player1_score} : {duel.player2_score}</div>
                         <div className="font-bold text-white truncate max-w-[80px] text-right">{duel.p2?.username}</div>
                       </div>
                     </div>
                   ))}
                   
                   {activeDuels.length === 0 && (
                     <div className="text-center text-slate-500 py-10">Нет активных матчей</div>
                   )}
                 </div>
               </div>
            )}
          </div>

          {/* ПРАВАЯ КОЛОНКА (СПИСОК ИЛИ СЕТКА) */}
          <div className="flex-1 p-8 bg-slate-900 overflow-y-auto">
            {status === 'active' || status === 'finished' ? (
               <div className="h-full min-h-[400px]">
                 {tournamentId && <TournamentBracket tournamentId={tournamentId} onEnterMatch={() => {}} isTeacher={true} />}
               </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3"><Users className="w-6 h-6 text-cyan-400" /><h3 className="text-xl font-bold text-white">Участники</h3></div>
                  <div className="flex items-center gap-4">
                     <button onClick={() => tournamentId && fetchParticipants(tournamentId)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                     <span className="px-3 py-1 bg-slate-800 rounded-full text-slate-300 font-mono text-sm">{participants.length}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {participants.map((p) => (
                    <div key={p.id} className="group p-4 bg-slate-800 border border-slate-700 rounded-xl flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg">{p.profiles.username[0].toUpperCase()}</div>
                      <div>
                        <div className="font-bold text-white text-lg">{p.profiles.username}</div>
                        <div className="text-xs text-slate-400 flex gap-2"><span>{p.profiles.mmr} MP</span><span>•</span><span>LVL {p.profiles.clearance_level}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
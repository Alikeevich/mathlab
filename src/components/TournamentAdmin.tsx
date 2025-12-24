import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'react-qr-code';
import { TournamentBracket } from './TournamentBracket';
import { Users, Play, Trophy, Share2, X, Crown, Copy, Loader, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';

export function TournamentAdmin({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string>('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [status, setStatus] = useState('waiting');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false); // Индикатор запуска
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // 1. Инициализация (Создание + Безопасная Чистка)
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    async function initTournament() {
      if (!user) return;

      // БЕЗОПАСНАЯ АВТО-ЧИСТКА: Удаляем только старые (>1 часа)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      await supabase.from('tournaments').delete()
        .eq('created_by', user.id)
        .eq('status', 'waiting')
        .lt('created_at', oneHourAgo);

      await supabase.rpc('cleanup_stale_tournaments');

      // Создаем новый
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const { data } = await supabase
        .from('tournaments')
        .insert({ created_by: user.id, code })
        .select()
        .single();
        
      if (data) {
        setTournamentId(data.id);
        setJoinCode(code);
        
        // Подписка
        channel = supabase
          .channel('admin-participants')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants', filter: `tournament_id=eq.${data.id}` }, 
          () => { fetchParticipants(data.id); }) 
          .subscribe();
      }
    }

    initTournament();

    // Cleanup функция
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

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

  // 2. СТАРТ ТУРНИРА
  async function startTournament() {
    if (!tournamentId || participants.length < 2) {
      alert("Нужно минимум 2 участника для старта!");
      return;
    }

    setStarting(true);
    try {
      // Вызываем мощную функцию на сервере
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

        <div className="flex-1 flex flex-col md:flex-row">
          {status === 'waiting' && (
            <div className="w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col items-center justify-center bg-slate-800/50">
              <div className="bg-white p-4 rounded-2xl shadow-lg mb-8"><QRCode value={joinLink} size={220} /></div>
              <div className="flex flex-col items-center gap-2 mb-8">
                <span className="text-slate-400 text-sm uppercase tracking-wider">Код доступа</span>
                <button onClick={() => navigator.clipboard.writeText(joinCode)} className="text-6xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 hover:scale-105 transition-transform">
                  {joinCode}
                </button>
              </div>
              <button 
                disabled={participants.length < 2 || starting}
                onClick={startTournament}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xl rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg"
              >
                {starting ? <Loader className="w-6 h-6 animate-spin"/> : <Play className="w-6 h-6 fill-current" />} 
                {starting ? 'ЗАПУСК...' : 'НАЧАТЬ БИТВУ'}
              </button>
              <p className="text-slate-500 text-xs mt-3 text-center">Нужно минимум 2 участника</p>
            </div>
          )}

          <div className="flex-1 p-8 bg-slate-900 overflow-y-auto">
            {status === 'active' || status === 'finished' ? (
               <div className="h-full">
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
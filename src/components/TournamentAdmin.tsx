import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'react-qr-code';
import { Users, Play, Trophy, Share2, X } from 'lucide-react';

export function TournamentAdmin({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string>('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [status, setStatus] = useState('waiting');

  // 1. Создание турнира при открытии
  useEffect(() => {
    async function createTournament() {
      if (!user) return;
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      
      const { data } = await supabase
        .from('tournaments')
        .insert({ created_by: user.id, code })
        .select()
        .single();
        
      if (data) {
        setTournamentId(data.id);
        setJoinCode(code);
        subscribeToParticipants(data.id);
      }
    }
    createTournament();
  }, []);

  // 2. Подписка на новых участников
  function subscribeToParticipants(tId: string) {
    supabase
      .channel(`tournament-${tId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants', filter: `tournament_id=eq.${tId}` }, 
      () => { fetchParticipants(tId); })
      .subscribe();
  }

  async function fetchParticipants(tId: string) {
    const { data } = await supabase
      .from('tournament_participants')
      .select('*, profiles(username, mmr)')
      .eq('tournament_id', tId);
    if (data) setParticipants(data);
  }

  // 3. ЗАПУСК (SHUFFLE & START)
  async function startTournament() {
    if (!tournamentId || participants.length < 2) return;

    setStatus('active');
    await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId);

    // Перемешиваем участников
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    
    // Создаем пары (Дуэли)
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const p1 = shuffled[i];
        const p2 = shuffled[i+1];
        
        // Генерируем задачи для этой пары
        const { data: allProbs } = await supabase
          .from('problems')
          .select('id')
          .eq('module_id', '00000000-0000-0000-0000-000000000099'); // PvP пул
        const probIds = allProbs?.sort(() => 0.5 - Math.random()).slice(0, 5).map(p => p.id) || [];

        // Создаем дуэль
        await supabase.from('duels').insert({
          player1_id: p1.user_id,
          player2_id: p2.user_id,
          status: 'active',
          problem_ids: probIds,
          tournament_id: tournamentId,
          round: 1
        });
      }
    }
  }

  const joinLink = `${window.location.origin}?t=${joinCode}`;

  return (
    <div className="fixed inset-0 bg-slate-900 z-[60] flex flex-col overflow-hidden">
      <div className="p-6 border-b border-cyan-500/20 flex justify-between items-center bg-slate-800">
        <h2 className="text-2xl font-bold text-white">Панель Управления Турниром</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X /></button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* ЛЕВАЯ ЧАСТЬ: QR и Инфо */}
        <div className="w-full md:w-1/3 p-8 border-r border-slate-700 flex flex-col items-center justify-center bg-slate-800/50">
          <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
            <QRCode value={joinLink} size={200} />
          </div>
          <div className="text-4xl font-mono font-black text-cyan-400 mb-2 tracking-widest">
            {joinCode}
          </div>
          <p className="text-slate-400 text-center mb-8">
            Сканируйте QR или введите код<br/>на главной странице
          </p>
          
          <div className="flex gap-4 w-full">
             <button 
                disabled={participants.length < 2 || status === 'active'}
                onClick={startTournament}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
             >
               <Play className="w-5 h-5" /> ЗАПУСК
             </button>
          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: Список участников */}
        <div className="flex-1 p-8 bg-slate-900 overflow-y-auto">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-cyan-400" />
            <h3 className="text-xl font-bold text-white">Участники ({participants.length})</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((p) => (
              <div key={p.id} className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex items-center gap-3 animate-in zoom-in duration-200">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {p.profiles.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white">{p.profiles.username}</div>
                  <div className="text-xs text-slate-400">{p.profiles.mmr} MP</div>
                </div>
              </div>
            ))}
          </div>
          
          {participants.length === 0 && (
            <div className="text-center text-slate-500 mt-20">
              Ожидание подключения учеников...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
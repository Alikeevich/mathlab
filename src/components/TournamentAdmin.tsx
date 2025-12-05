import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'react-qr-code';
import { Users, Play, Trophy, Share2, X, Crown, Copy, Loader } from 'lucide-react';

export function TournamentAdmin({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string>('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [status, setStatus] = useState('waiting');

  // 1. Создание турнира
  useEffect(() => {
    async function createTournament() {
      if (!user) return;
      // Генерация кода
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      
      const { data } = await supabase
        .from('tournaments')
        .insert({ created_by: user.id, code })
        .select()
        .single();
        
      if (data) {
        setTournamentId(data.id);
        setJoinCode(code);
        
        // ПОДПИСКА (REALTIME)
        const channel = supabase
          .channel('admin-participants')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants', filter: `tournament_id=eq.${data.id}` }, 
          () => { fetchParticipants(data.id); }) // Перезагружаем список при любом изменении
          .subscribe();
          
        return () => { supabase.removeChannel(channel); };
      }
    }
    createTournament();
  }, []);

  async function fetchParticipants(tId: string) {
    const { data } = await supabase
      .from('tournament_participants')
      .select('*, profiles(username, mmr)')
      .eq('tournament_id', tId);
    if (data) setParticipants(data);
  }

  // 2. СТАРТ ТУРНИРА
  async function startTournament() {
    if (!tournamentId || participants.length < 2) {
      alert("Нужно минимум 2 участника!");
      return;
    }

    setStatus('active');
    // Ставим статус турнира в active -> У учеников сменится экран
    await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId);

    // Логика перемешивания и создания пар
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    
    // Получаем задачи для PvP
    const { data: allProbs } = await supabase
          .from('problems')
          .select('id')
          .eq('module_id', '00000000-0000-0000-0000-000000000099');
    
    // Создаем дуэли
    const duelPromises = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const p1 = shuffled[i];
        const p2 = shuffled[i+1];
        
        // 5 случайных задач
        const probIds = allProbs?.sort(() => 0.5 - Math.random()).slice(0, 5).map(p => p.id) || [];

        duelPromises.push(
          supabase.from('duels').insert({
            player1_id: p1.user_id,
            player2_id: p2.user_id,
            status: 'active', // Сразу активны!
            problem_ids: probIds,
            tournament_id: tournamentId,
            round: 1
          })
        );
      } else {
        // Нечетный игрок (остался без пары) - Автопобеда или Ждет
        console.log('Игрок без пары:', shuffled[i].profiles.username);
      }
    }
    
    await Promise.all(duelPromises);
    onClose(); // Закрываем админку, учитель может идти смотреть лидерборд или дуэли
  }

  const joinLink = `${window.location.origin}/?t=${joinCode}`;

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
      {/* Шапка */}
      <div className="p-6 border-b border-cyan-500/20 flex justify-between items-center bg-slate-800">
        <div className="flex items-center gap-3">
          <Crown className="w-8 h-8 text-amber-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Панель Учителя</h2>
            <p className="text-slate-400 text-xs uppercase tracking-widest">Управление турниром</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
          <X className="w-6 h-6 text-slate-400 hover:text-white" />
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* ЛЕВАЯ КОЛОНКА (QR) */}
        <div className="w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col items-center justify-center bg-slate-800/50">
          <div className="bg-white p-4 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.2)] mb-8">
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
            disabled={participants.length < 2 || status === 'active'}
            onClick={startTournament}
            className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xl rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-900/20"
          >
            {status === 'active' ? 'ТУРНИР ИДЕТ' : <><Play className="w-6 h-6 fill-current" /> НАЧАТЬ БИТВУ</>}
          </button>
          <p className="text-slate-500 text-xs mt-3 text-center">Нужно минимум 2 участника для старта</p>
        </div>

        {/* ПРАВАЯ КОЛОНКА (СПИСОК) */}
        <div className="flex-1 p-8 bg-slate-900 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Список участников</h3>
            </div>
            <span className="px-3 py-1 bg-slate-800 rounded-full text-slate-300 font-mono text-sm">
              Всего: {participants.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {participants.map((p) => (
              <div key={p.id} className="group p-4 bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-xl flex items-center gap-4 transition-all hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {p.profiles.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white text-lg group-hover:text-cyan-300 transition-colors">
                    {p.profiles.username}
                  </div>
                  <div className="text-xs text-slate-400 flex gap-2">
                    <span>{p.profiles.mmr} MP</span>
                    <span>•</span>
                    <span>LVL {p.profiles.clearance_level}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {participants.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
              <Loader className="w-10 h-10 mb-4 animate-spin opacity-50" />
              <p>Ожидание подключения учеников...</p>
              <p className="text-xs mt-2">Попросите их ввести код или сканировать QR</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
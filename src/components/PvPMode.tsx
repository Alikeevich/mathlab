import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Latex from 'react-latex-next';
import { Swords, Loader, Trophy, Zap, XCircle, Play } from 'lucide-react';
import confetti from 'canvas-confetti'; // Если нет, удали строчку с confetti

type DuelState = 'lobby' | 'searching' | 'battle' | 'finished';

export function PvPMode({ onBack }: { onBack: () => void }) {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<DuelState>('lobby');
  const [duelId, setDuelId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string>('???');
  
  // Игровые данные
  const [problems, setProblems] = useState<any[]>([]);
  const [currentProbIndex, setCurrentProbIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [oppProgress, setOppProgress] = useState(0); // Индекс задачи противника
  const [userAnswer, setUserAnswer] = useState('');
  const [winner, setWinner] = useState<'me' | 'opponent' | 'draw' | null>(null);

  // === 1. ЛОГИКА ПОИСКА МАТЧА ===
  async function findMatch() {
    setStatus('searching');
    
    // 1. Ищем, есть ли кто-то ждущий (статус waiting и player2 пустой)
    const { data: waitingDuel } = await supabase
      .from('duels')
      .select('*')
      .eq('status', 'waiting')
      .neq('player1_id', user!.id) // Не играть с самим собой
      .limit(1)
      .maybeSingle();

    if (waitingDuel) {
      // НАШЛИ СОПЕРНИКА -> ПРИСОЕДИНЯЕМСЯ
      await supabase
        .from('duels')
        .update({ 
          player2_id: user!.id, 
          status: 'active' 
        })
        .eq('id', waitingDuel.id);
      
      setDuelId(waitingDuel.id);
      loadProblems(waitingDuel.problem_ids); // Загружаем задачи, которые создал первый игрок
      fetchOpponentName(waitingDuel.player1_id);
      startBattleSubscription(waitingDuel.id, 'player2');
    } else {
      // НЕТ СОПЕРНИКА -> СОЗДАЕМ КОМНАТУ
      // Сначала выберем 10 случайных ID задач для матча
      const { data: allProbs } = await supabase
        .from('problems')
        .select('id')
        .eq('module_id', '00000000-0000-0000-0000-000000000099'); // ID нашего PvP модуля

      const shuffled = allProbs?.sort(() => 0.5 - Math.random()).slice(0, 10).map(p => p.id) || [];

      const { data: newDuel } = await supabase
        .from('duels')
        .insert({
          player1_id: user!.id,
          status: 'waiting',
          problem_ids: shuffled // Сохраняем набор задач
        })
        .select()
        .single();

      if (newDuel) {
        setDuelId(newDuel.id);
        loadProblems(shuffled);
        startBattleSubscription(newDuel.id, 'player1');
      }
    }
  }

  // === 2. ПОДПИСКА НА ОБНОВЛЕНИЯ (REALTIME) ===
  function startBattleSubscription(id: string, myRole: 'player1' | 'player2') {
    const channel = supabase
      .channel(`duel-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${id}` }, 
      (payload) => {
        const newData = payload.new;
        
        // Если статус сменился на active -> бой начался
        if (newData.status === 'active' && status !== 'battle') {
          setStatus('battle');
          // Если я был создателем, мне нужно узнать имя второго
          if (myRole === 'player1' && newData.player2_id) {
             fetchOpponentName(newData.player2_id);
          }
        }

        // Обновляем счет противника
        if (myRole === 'player1') {
          setOppScore(newData.player2_score);
          setOppProgress(newData.player2_progress);
        } else {
          setOppScore(newData.player1_score);
          setOppProgress(newData.player1_progress);
        }

        // Проверка конца игры
        if (newData.status === 'finished') {
          endGame(newData.winner_id);
        }
      })
      .subscribe();
  }

  // === 3. ЗАГРУЗКА ЗАДАЧ И ИМЕН ===
  async function loadProblems(ids: string[]) {
    if (!ids || ids.length === 0) return;
    const { data } = await supabase.from('problems').select('*').in('id', ids);
    // Важно: сортируем в том же порядке, что и в массиве ID, чтобы у обоих было одинаково
    const sorted = ids.map(id => data?.find(p => p.id === id)).filter(Boolean);
    setProblems(sorted);
  }

  async function fetchOpponentName(uid: string) {
    const { data } = await supabase.from('profiles').select('username').eq('id', uid).single();
    if (data) setOpponentName(data.username);
  }

  // === 4. ИГРОВАЯ ЛОГИКА ===
  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!duelId) return;

    const currentProb = problems[currentProbIndex];
    const isCorrect = userAnswer.toLowerCase().trim() === currentProb.answer.toLowerCase().trim();
    
    // Локальное обновление
    const newScore = isCorrect ? myScore + 1 : myScore;
    setMyScore(newScore);
    const newProgress = currentProbIndex + 1;
    setCurrentProbIndex(newProgress);
    setUserAnswer('');

    // Отправка в Supabase
    // Определяем кто мы (player1 или player2) по тому, кто создал
    const { data: duel } = await supabase.from('duels').select('player1_id').eq('id', duelId).single();
    const isP1 = duel?.player1_id === user!.id;

    const updateData = isP1 
      ? { player1_score: newScore, player1_progress: newProgress }
      : { player2_score: newScore, player2_progress: newProgress };

    await supabase.from('duels').update(updateData).eq('id', duelId);

    // Если решили все 10 задач -> мы закончили первыми
    if (newProgress >= 10) {
      // Я победил (пока что просто закончил)
      await supabase.from('duels').update({ status: 'finished', winner_id: user!.id }).eq('id', duelId);
      // setWinner('me'); // Обработается через подписку
    }
  }

  function endGame(winnerId: string) {
    setStatus('finished');
    if (winnerId === user!.id) {
      setWinner('me');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      setWinner('opponent');
    }
  }

  // === РЕНДЕР ===

  if (status === 'lobby') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-8 max-w-md w-full p-8 bg-slate-800/50 rounded-2xl border border-red-500/30 shadow-2xl shadow-red-900/20">
          <div className="mx-auto w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
            <Swords className="w-12 h-12 text-red-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase mb-2">PVP АРЕНА</h1>
            <p className="text-red-300/60">Битва умов в реальном времени</p>
          </div>
          
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 text-left space-y-2 text-sm text-slate-400">
            <p>• 10 случайных задач</p>
            <p>• Кто решит быстрее и правильнее — побеждает</p>
            <p>• Одинаковые задачи у обоих игроков</p>
          </div>

          <button onClick={findMatch} className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-bold text-white text-xl hover:scale-105 transition-transform shadow-lg shadow-red-500/30 flex items-center justify-center gap-2">
            <Play className="w-6 h-6 fill-current" />
            НАЙТИ СОПЕРНИКА
          </button>
          
          <button onClick={onBack} className="text-slate-500 hover:text-white text-sm">
            Вернуться в лабораторию
          </button>
        </div>
      </div>
    );
  }

  if (status === 'searching') {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <Loader className="w-16 h-16 text-red-500 animate-spin" />
        <h2 className="text-2xl font-bold text-white animate-pulse">Поиск противника...</h2>
        <p className="text-slate-400">Подбираем достойного оппонента</p>
        <button onClick={() => { /* logic to cancel */ onBack() }} className="px-6 py-2 border border-slate-600 rounded-full text-slate-400 hover:bg-slate-800">
          Отмена
        </button>
      </div>
    );
  }

  if (status === 'battle') {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 h-full flex flex-col">
        {/* HEADER: SCORES */}
        <div className="flex items-center justify-between mb-8 bg-slate-900/80 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-cyan-400 font-bold text-lg">ВЫ</div>
              <div className="text-3xl font-black text-white">{myScore}/10</div>
            </div>
          </div>
          
          <div className="text-slate-500 font-mono text-sm">VS</div>

          <div className="flex items-center gap-4">
            <div className="text-left">
              <div className="text-red-400 font-bold text-lg">{opponentName}</div>
              <div className="text-3xl font-black text-white">{oppScore}/10</div>
            </div>
          </div>
        </div>

        {/* PROGRESS BARS */}
        <div className="space-y-4 mb-8">
          <div>
            <div className="flex justify-between text-xs text-cyan-400 mb-1">
              <span>Ваш прогресс</span>
              <span>{(currentProbIndex / 10 * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${(currentProbIndex / 10) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-red-400 mb-1">
              <span>Противник</span>
              <span>{(oppProgress / 10 * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(oppProgress / 10) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* PROBLEM AREA */}
        <div className="flex-1 flex flex-col justify-center">
          {currentProbIndex < 10 && problems[currentProbIndex] ? (
            <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 shadow-2xl">
               <div className="text-slate-400 text-sm mb-4 font-mono">ЗАДАЧА {currentProbIndex + 1} ИЗ 10</div>
               <h2 className="text-3xl font-bold text-white mb-8">
                 <Latex>{problems[currentProbIndex].question}</Latex>
               </h2>
               
               <form onSubmit={handleAnswer} className="flex gap-4">
                 <input 
                    autoFocus
                    type="text" 
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-6 py-4 text-xl text-white outline-none focus:border-cyan-500 transition-colors"
                    placeholder="Ответ..."
                 />
                 <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-xl transition-colors">
                   GO
                 </button>
               </form>
            </div>
          ) : (
            <div className="text-center text-white animate-pulse">
              Ожидание результата матча...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-12 bg-slate-800 rounded-3xl border-2 border-slate-600 shadow-2xl max-w-lg w-full">
          {winner === 'me' ? (
            <>
              <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
                ПОБЕДА!
              </h1>
              <p className="text-slate-300 text-lg mb-8">Вы уничтожили соперника интеллектом.</p>
              <div className="text-4xl font-mono text-white mb-8">{myScore} : {oppScore}</div>
            </>
          ) : (
            <>
              <XCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
              <h1 className="text-5xl font-black text-red-500 mb-4">
                ПОРАЖЕНИЕ
              </h1>
              <p className="text-slate-300 text-lg mb-8">Вам нужно больше тренироваться в лаборатории.</p>
              <div className="text-4xl font-mono text-white mb-8">{myScore} : {oppScore}</div>
            </>
          )}
          
          <button onClick={onBack} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors">
            В меню
          </button>
        </div>
      </div>
    );
  }

  return null;
}
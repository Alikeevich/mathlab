import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Latex from 'react-latex-next';
import { Zap, Loader, Trophy, XCircle, Play, CheckCircle2, Timer } from 'lucide-react';
import { getPvPRank } from '../lib/gameLogic';
import { MathKeypad } from './MathKeypad';

type DuelState = 'lobby' | 'searching' | 'battle' | 'finished';

export function PvPMode({ onBack }: { onBack: () => void }) {
  const { user, profile } = useAuth();
  
  // === СОСТОЯНИЯ ===
  const [status, setStatus] = useState<DuelState>('lobby');
  const [duelId, setDuelId] = useState<string | null>(null);
  
  // Соперник
  const [opponentName, setOpponentName] = useState<string>('???');
  const [opponentMMR, setOpponentMMR] = useState<number>(1000);
  
  // Игра
  const [problems, setProblems] = useState<any[]>([]);
  const [currentProbIndex, setCurrentProbIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [winner, setWinner] = useState<'me' | 'opponent' | 'draw' | null>(null);

  // Фидбек и Таймер
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(60); // 60 секунд на задачу

  // === 1. ТАЙМЕР ЗАДАЧИ ===
  useEffect(() => {
    let timer: any;
    if (status === 'battle' && !feedback && currentProbIndex < 10) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeout(); // Время вышло
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, feedback, currentProbIndex]);

  // Сброс таймера при смене вопроса
  useEffect(() => {
    setTimeLeft(60);
  }, [currentProbIndex]);

  // Функция: Время вышло
  const handleTimeout = () => {
    submitResult(false);
  };

  // === 2. СТРАХОВКА (POLLING) ДЛЯ ХОСТА ===
  // Если мы ищем игру и создали комнату, долбим базу: "Кто-нибудь зашел?"
  useEffect(() => {
    let interval: any;

    if (status === 'searching' && duelId) {
      interval = setInterval(async () => {
        // Проверяем статус нашей дуэли
        const { data } = await supabase
          .from('duels')
          .select('status, player2_id')
          .eq('id', duelId)
          .single();

        // Если статус стал active (второй игрок зашел и обновил статус)
        if (data && data.status === 'active' && data.player2_id) {
          clearInterval(interval);
          
          // Определяем ID соперника (это точно player2, раз мы хостили)
          await fetchOpponentData(data.player2_id);
          setStatus('battle');
        }
      }, 1000); // Проверка каждую секунду
    }

    return () => clearInterval(interval);
  }, [status, duelId]);

  // === 3. ПОИСК МАТЧА ===
  async function findMatch() {
    setStatus('searching');
    const myMMR = profile?.mmr || 1000;
    const range = 300;

    // 1. Ищем существующую комнату (чтобы ПРИСОЕДИНИТЬСЯ)
    const { data: waitingDuel } = await supabase
      .from('duels')
      .select('*')
      .eq('status', 'waiting')
      .neq('player1_id', user!.id)
      .gte('player1_mmr', myMMR - range)
      .lte('player1_mmr', myMMR + range)
      .limit(1)
      .maybeSingle();

    if (waitingDuel) {
      // ---> МЫ ДЖОЙНЕР (ПРИСОЕДИНЯЕМСЯ)
      // 1. Сначала грузим данные, чтобы не было задержек
      setDuelId(waitingDuel.id);
      await loadProblems(waitingDuel.problem_ids);
      await fetchOpponentData(waitingDuel.player1_id);
      
      // 2. Обновляем базу (это триггернет Хоста)
      await supabase
        .from('duels')
        .update({ 
          player2_id: user!.id,
          player2_mmr: myMMR,
          status: 'active' 
        })
        .eq('id', waitingDuel.id);
      
      // 3. Подписываемся и стартуем
      startBattleSubscription(waitingDuel.id, 'player2');
      setStatus('battle');
      
    } else {
      // ---> МЫ ХОСТ (СОЗДАЕМ)
      const { data: allProbs } = await supabase
        .from('problems')
        .select('id')
        .eq('module_id', '00000000-0000-0000-0000-000000000099');

      const shuffled = allProbs?.sort(() => 0.5 - Math.random()).slice(0, 10).map(p => p.id) || [];

      const { data: newDuel } = await supabase
        .from('duels')
        .insert({
          player1_id: user!.id,
          player1_mmr: myMMR,
          status: 'waiting',
          problem_ids: shuffled
        })
        .select()
        .single();

      if (newDuel) {
        setDuelId(newDuel.id);
        await loadProblems(shuffled); // Грузим задачи сразу
        startBattleSubscription(newDuel.id, 'player1');
        // Остаемся в статусе 'searching', useEffect сверху сам переключит нас в 'battle'
      }
    }
  }

  // === 4. ПОДПИСКА НА ВРАГА ===
  function startBattleSubscription(id: string, myRole: 'player1' | 'player2') {
    supabase
      .channel(`duel-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${id}` }, 
      (payload) => {
        const newData = payload.new;

        // Если статус поменялся на active (для Хоста, если поллинг опоздал)
        if (newData.status === 'active' && status === 'searching') {
           if (myRole === 'player1' && newData.player2_id) {
             fetchOpponentData(newData.player2_id).then(() => setStatus('battle'));
           }
        }

        // Обновляем очки врага
        if (myRole === 'player1') {
          setOppScore(newData.player2_score);
          setOppProgress(newData.player2_progress);
        } else {
          setOppScore(newData.player1_score);
          setOppProgress(newData.player1_progress);
        }

        if (newData.status === 'finished') {
          endGame(newData.winner_id);
        }
      })
      .subscribe();
  }

  // === 5. ОБРАБОТКА ОТВЕТА ===
  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!duelId || feedback) return; // Не даем жать кнопку, пока идет анимация

    const currentProb = problems[currentProbIndex];
    const isCorrect = userAnswer.toLowerCase().trim() === currentProb.answer.toLowerCase().trim();
    
    submitResult(isCorrect);
  }

  async function submitResult(isCorrect: boolean) {
    // 1. Показываем анимацию
    setFeedback(isCorrect ? 'correct' : 'wrong');
    
    // 2. Считаем очки
    const newScore = isCorrect ? myScore + 1 : myScore;
    setMyScore(newScore);
    const newProgress = currentProbIndex + 1;

    // 3. Отправляем в базу (в фоне)
    const { data: duel } = await supabase.from('duels').select('player1_id').eq('id', duelId!).single();
    const isP1 = duel?.player1_id === user!.id;
    const updateData = isP1 
      ? { player1_score: newScore, player1_progress: newProgress }
      : { player2_score: newScore, player2_progress: newProgress };
    
    supabase.from('duels').update(updateData).eq('id', duelId!).then(async () => {
       if (newProgress >= 10) {
          await supabase.rpc('finish_duel', { duel_uuid: duelId, winner_uuid: user!.id });
       }
    });

    // 4. Ждем 1 секунду и переключаем задачу
    setTimeout(() => {
      setFeedback(null);
      setCurrentProbIndex(newProgress);
      setUserAnswer('');
    }, 1000);
  }

  // Вспомогательные
  async function loadProblems(ids: string[]) {
    if (!ids || ids.length === 0) return;
    const { data } = await supabase.from('problems').select('*').in('id', ids);
    const sorted = ids.map(id => data?.find(p => p.id === id)).filter(Boolean);
    setProblems(sorted);
  }

  async function fetchOpponentData(uid: string) {
    const { data } = await supabase
      .from('profiles')
      .select('username, mmr')
      .eq('id', uid)
      .single();
    if (data) {
      setOpponentName(data.username);
      setOpponentMMR(data.mmr || 1000);
    }
  }

  function endGame(winnerId: string) {
    setStatus('finished');
    if (winnerId === user!.id) {
      setWinner('me');
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
            <Zap className="w-12 h-12 text-red-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase mb-2">PVP АРЕНА</h1>
            <p className="text-red-300/60">Битва умов в реальном времени</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
             <div className="text-sm text-slate-400">Ваш рейтинг</div>
             <div className="text-2xl font-bold text-red-400">
               {profile?.mmr || 1000} MMR <span className="text-sm text-slate-500">({getPvPRank(profile?.mmr || 1000)})</span>
             </div>
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
        <div className="text-slate-400 text-sm max-w-xs text-center">
          Ожидаем подключения...<br/>
          (Ваш рейтинг: {profile?.mmr || 1000})
        </div>
        <button onClick={() => { setStatus('lobby'); setDuelId(null); }} className="px-6 py-2 border border-slate-600 rounded-full text-slate-400 hover:bg-slate-800">
          Отмена
        </button>
      </div>
    );
  }

  if (status === 'battle') {
    const currentProb = problems[currentProbIndex];

    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 h-full flex flex-col relative">
        
        {/* ФИДБЕК ОВЕРЛЕЙ (Зеленый/Красный экран) */}
        {feedback && (
          <div className={`absolute inset-0 z-50 flex items-center justify-center rounded-3xl backdrop-blur-sm animate-in fade-in duration-200 ${
            feedback === 'correct' ? 'bg-emerald-500/20' : 'bg-red-500/20'
          }`}>
            <div className={`p-8 rounded-full ${feedback === 'correct' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'} shadow-2xl scale-125`}>
              {feedback === 'correct' ? <CheckCircle2 className="w-16 h-16" /> : <XCircle className="w-16 h-16" />}
            </div>
          </div>
        )}

        {/* ШАПКА СЧЕТА */}
        <div className="flex items-center justify-between mb-6 bg-slate-900/80 p-4 rounded-xl border border-slate-700">
          <div className="text-right">
            <div className="text-cyan-400 font-bold text-lg">ВЫ</div>
            <div className="text-3xl font-black text-white">{myScore}/10</div>
          </div>
          
          {/* ТАЙМЕР ПО ЦЕНТРУ */}
          <div className="flex flex-col items-center">
             <div className="text-slate-500 font-mono text-xs mb-1">ВРЕМЯ</div>
             <div className={`flex items-center gap-1 font-mono font-bold text-xl ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                <Timer className="w-4 h-4" />
                {timeLeft}
             </div>
          </div>

          <div className="text-left">
            <div className="text-red-400 font-bold text-lg flex items-center gap-2">
              {opponentName}
            </div>
            <div className="text-3xl font-black text-white">{oppScore}/10</div>
          </div>
        </div>

        {/* ПРОГРЕСС БАРЫ */}
        <div className="space-y-4 mb-6">
          <div>
             <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${(currentProbIndex / 10) * 100}%` }} />
            </div>
          </div>
          <div>
             <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(oppProgress / 10) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* ЗОНА ВОПРОСА */}
        <div className="flex-1 flex flex-col justify-center">
          {currentProbIndex < 10 && currentProb ? (
            <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
               <div className="flex justify-between items-center mb-6">
                 <div className="text-slate-400 text-sm font-mono">ЗАДАЧА {currentProbIndex + 1}</div>
                 <div className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">Ввод ответа</div>
               </div>
               
               <h2 className="text-3xl font-bold text-white mb-8 leading-relaxed">
                 <Latex>{currentProb.question}</Latex>
               </h2>
               
               <form onSubmit={handleAnswer} className="flex gap-4">
                 <input 
                    autoFocus
                    type="text" 
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    disabled={!!feedback} // Блокируем ввод во время анимации
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-6 py-4 text-xl text-white outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                    placeholder="Ваш ответ..."
                 />
                 <button 
                    type="submit" 
                    disabled={!!feedback || !userAnswer}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold text-xl transition-colors"
                 >
                   GO
                 </button>
               </form>
            </div>
          ) : (
             <div className="flex items-center justify-center h-full">
               <div className="text-center animate-pulse text-white">
                 <Loader className="w-10 h-10 mx-auto mb-4 animate-spin" />
                 <div>Ожидание результата матча...</div>
               </div>
             </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-12 bg-slate-800 rounded-3xl border-2 border-slate-600 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-300">
          {winner === 'me' ? (
            <>
              <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
                ПОБЕДА!
              </h1>
              <p className="text-slate-300 text-lg mb-8">Рейтинг повышен! (+25 MMR)</p>
            </>
          ) : (
            <>
              <XCircle className="w-24 h-24 text-red-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
              <h1 className="text-5xl font-black text-red-500 mb-4">
                ПОРАЖЕНИЕ
              </h1>
              <p className="text-slate-300 text-lg mb-8">Рейтинг понижен (-25 MMR)</p>
            </>
          )}
          
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 mb-8">
            <div className="text-sm text-slate-500 mb-2">ИТОГОВЫЙ СЧЕТ</div>
            <div className="flex items-center justify-center gap-8 text-4xl font-mono font-bold">
              <span className={winner === 'me' ? 'text-yellow-400' : 'text-slate-400'}>{myScore}</span>
              <span className="text-slate-600">:</span>
              <span className={winner === 'opponent' ? 'text-yellow-400' : 'text-slate-400'}>{oppScore}</span>
            </div>
          </div>

          <button onClick={onBack} className="w-full px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors">
            Вернуться в меню
          </button>
        </div>
      </div>
    );
  }

  return null;
}
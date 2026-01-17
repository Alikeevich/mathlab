import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Latex from 'react-latex-next';
import { Zap, Loader, Trophy, XCircle, Play, CheckCircle2, Timer, WifiOff, ArrowLeft, Flag, AlertTriangle } from 'lucide-react';
import { getPvPRank } from '../lib/gameLogic';
import { MathKeypad } from './MathKeypad';
import { MathInput } from './MathInput';
import { useBotOpponent } from '../hooks/useBotOpponent';
import { checkAnswer } from '../lib/mathUtils';

type DuelState = 'lobby' | 'searching' | 'battle' | 'finished';

type Props = {
  onBack: () => void;
  initialDuelId?: string | null;
};

export function PvPMode({ onBack, initialDuelId }: Props) {
  const { user, profile, refreshProfile } = useAuth();
 
  const [status, setStatus] = useState<DuelState>(initialDuelId ? 'searching' : 'lobby');
  const [duelId, setDuelId] = useState<string | null>(initialDuelId || null);
 
  const [opponentName, setOpponentName] = useState<string>('???');
  const [opponentMMR, setOpponentMMR] = useState<number>(1000);
  const [isBotMatch, setIsBotMatch] = useState(false);
  const [problems, setProblems] = useState<any[]>([]);
  const [currentProbIndex, setCurrentProbIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  
  // Ввод
  const [userAnswer, setUserAnswer] = useState('');
  const mfRef = useRef<any>(null);
  
  // Результаты
  const [winner, setWinner] = useState<'me' | 'opponent' | 'draw' | null>(null);
  const [mmrChange, setMmrChange] = useState<number | null>(null);
  
  // Состояния интерфейса
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);

  useBotOpponent({
    isEnabled: isBotMatch && status === 'battle',
    difficulty: 'medium', // Можно сделать зависимость от MMR: profile?.mmr > 1200 ? 'hard' : 'easy'
    maxQuestions: problems.length || 10,
    onProgressUpdate: (score, progress) => {
      // Когда бот "решает", мы просто обновляем локальный стейт
      setOppScore(score);
      setOppProgress(progress);
      
      // Если бот закончил раньше нас — он победил
      if (progress >= (problems.length || 10)) {
          endGame('bot_id', -25); // Бот победил
      }
    }
  });

  // === 1. АВТО-РЕКОННЕКТ (ЕСЛИ ОБНОВИЛ СТРАНИЦУ) ===
  useEffect(() => {
    if (initialDuelId && status === 'searching') {
      reconnectToDuel(initialDuelId);
    }
  }, []);

  async function reconnectToDuel(id: string) {
    const { data: duel } = await supabase.from('duels').select('*').eq('id', id).single();
    // Если матч уже кончился или не найден
    if (!duel || duel.status === 'finished') {
       setStatus('finished');
       if (duel) endGame(duel.winner_id, duel.elo_change);
       return;
    }
    
    // Восстанавливаем данные
    const isP1 = duel.player1_id === user?.id;
    const oppId = isP1 ? duel.player2_id : duel.player1_id;
    
    await loadProblems(duel.problem_ids);
    if (oppId) await fetchOpponentData(oppId);
   
    setMyScore(isP1 ? duel.player1_score : duel.player2_score);
    setCurrentProbIndex(isP1 ? duel.player1_progress : duel.player2_progress);
    setOppScore(isP1 ? duel.player2_score : duel.player1_score);
    setOppProgress(isP1 ? duel.player2_progress : duel.player1_progress);
    
    startBattleSubscription(id, isP1 ? 'player1' : 'player2');
    setStatus('battle');
  }

  // === 2. ЛОГИКА ИГРЫ ===

  // Поиск матча
  async function findMatch() {
    setStatus('searching');
    const myMMR = profile?.mmr || 1000;
    const range = 300;
    const oldTime = new Date(Date.now() - 20000).toISOString();
   
    // Чистим старые заявки
    await supabase.from('duels').delete().eq('status', 'waiting').lt('last_seen', oldTime).is('tournament_id', null);
    
    // Ищем соперника
    const { data: waitingDuel } = await supabase.from('duels').select('*').eq('status', 'waiting').is('tournament_id', null).neq('player1_id', user!.id).gte('player1_mmr', myMMR - range).lte('player1_mmr', myMMR + range).limit(1).maybeSingle();
    
    if (waitingDuel) {
      // Нашли -> присоединяемся
      setDuelId(waitingDuel.id);
      await loadProblems(waitingDuel.problem_ids);
      await fetchOpponentData(waitingDuel.player1_id);
      await supabase.from('duels').update({ player2_id: user!.id, player2_mmr: myMMR, status: 'active', player2_last_seen: new Date().toISOString() }).eq('id', waitingDuel.id);
      startBattleSubscription(waitingDuel.id, 'player2');
      setStatus('battle');
    } else {
      // Не нашли -> создаем новую
      const { data: allProbs } = await supabase.from('problems').select('id').eq('module_id', '00000000-0000-0000-0000-000000000099');
      const shuffled = allProbs?.sort(() => 0.5 - Math.random()).slice(0, 10).map(p => p.id) || [];
      const { data: newDuel } = await supabase.from('duels').insert({
          player1_id: user!.id, player1_mmr: myMMR, status: 'waiting', last_seen: new Date().toISOString(), player1_last_seen: new Date().toISOString(), problem_ids: shuffled
        }).select().single();
      if (newDuel) {
        setDuelId(newDuel.id);
        await loadProblems(shuffled);
        startBattleSubscription(newDuel.id, 'player1');
      }
    }
  }

  // Подписка на обновления
  function startBattleSubscription(id: string, myRole: 'player1' | 'player2') {
    supabase.channel(`duel-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${id}` },
      (payload) => {
        const newData = payload.new;
        // Если нашли соперника пока ждали
        if (newData.status === 'active' && status === 'searching') {
           if (myRole === 'player1' && newData.player2_id) fetchOpponentData(newData.player2_id).then(() => setStatus('battle'));
        }
        // Обновляем счет соперника
        if (myRole === 'player1') {
          setOppScore(newData.player2_score);
          setOppProgress(newData.player2_progress);
        } else {
          setOppScore(newData.player1_score);
          setOppProgress(newData.player1_progress);
        }
        // Если игра закончилась
        if (newData.status === 'finished') {
            endGame(newData.winner_id, newData.elo_change);
        }
      })
      .subscribe();
  }

  // === 3. ВВОД И ОТПРАВКА ===

  // Обработчики клавиатуры
  const handleKeypadCommand = (cmd: string, arg?: string) => {
    if (!mfRef.current) return;
    const scrollY = window.scrollY;
    
    if (cmd === 'insert') mfRef.current.executeCommand(['insert', arg]);
    else if (cmd === 'perform') mfRef.current.executeCommand([arg]);
    
    if (document.activeElement !== mfRef.current) {
       mfRef.current.focus({ preventScroll: true });
    }
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  };
 
  const handleKeypadDelete = () => {
    if (!mfRef.current) return;
    const scrollY = window.scrollY;
    mfRef.current.executeCommand(['deleteBackward']);
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  };
 
  const handleKeypadClear = () => {
    if (!mfRef.current) return;
    const scrollY = window.scrollY;
    mfRef.current.setValue('');
    setUserAnswer('');
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  };

  async function handleAnswer(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!duelId || feedback || !userAnswer || userAnswer.trim() === '') return;
    const currentProb = problems[currentProbIndex];
    const isCorrect = checkAnswer(userAnswer, currentProb.answer);
    submitResult(isCorrect);
  }

  async function submitResult(isCorrect: boolean) {
    setFeedback(isCorrect ? 'correct' : 'wrong');
    const newScore = isCorrect ? myScore + 1 : myScore;
    setMyScore(newScore);
    const newProgress = currentProbIndex + 1;
   
    const { data: duel } = await supabase.from('duels').select('player1_id').eq('id', duelId!).single();
    if (duel) {
        const isP1 = duel.player1_id === user!.id;
        const updateData = isP1
        ? { player1_score: newScore, player1_progress: newProgress, player1_last_seen: new Date().toISOString() }
        : { player2_score: newScore, player2_progress: newProgress, player2_last_seen: new Date().toISOString() };
       
        await supabase.from('duels').update(updateData).eq('id', duelId!);
        if (newProgress >= problems.length) {
           await supabase.rpc('finish_duel', { duel_uuid: duelId, finisher_uuid: user!.id });
        }
    }
    setTimeout(() => {
      setFeedback(null);
      setCurrentProbIndex(newProgress);
      setUserAnswer('');
      if (mfRef.current) {
        mfRef.current.setValue('');
        setTimeout(() => {
          if (mfRef.current) mfRef.current.focus({ preventScroll: true });
        }, 50);
      }
    }, 1000);
  }

  // === 4. ВСПОМОГАТЕЛЬНЫЕ ЭФФЕКТЫ ===

  // Поиск в цикле (на случай потери связи)
  useEffect(() => {
    let interval: any;
    if (status === 'searching' && duelId && !initialDuelId) {
      interval = setInterval(async () => {
        const { data } = await supabase.from('duels').select('status, player2_id').eq('id', duelId).single();
        if (data && data.status === 'active' && data.player2_id) {
          clearInterval(interval);
          const oppId = data.player2_id;
          await fetchOpponentData(oppId);
          setStatus('battle');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, duelId, initialDuelId]);

  // Таймер
  useEffect(() => {
    let timer: any;
    if (status === 'battle' && !feedback && currentProbIndex < problems.length) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { handleTimeout(); return 60; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, feedback, currentProbIndex, problems.length]);
  
  useEffect(() => { setTimeLeft(60); }, [currentProbIndex]);
  const handleTimeout = () => submitResult(false);

  // Heartbeat (проверка связи)
  useEffect(() => {
    let interval: any;
    if (status === 'battle' && duelId && user) {
      interval = setInterval(async () => {
        const { data: duelInfo } = await supabase.from('duels').select('player1_id').eq('id', duelId).single();
        if (!duelInfo) return;
        const isP1 = duelInfo.player1_id === user.id;
        const updateField = isP1 ? 'player1_last_seen' : 'player2_last_seen';
        await supabase.from('duels').update({ [updateField]: new Date().toISOString() }).eq('id', duelId);
        
        const { data } = await supabase.from('duels').select('player1_last_seen, player2_last_seen').eq('id', duelId).single();
        if (data) {
          const oppLastSeen = isP1 ? data.player2_last_seen : data.player1_last_seen;
          if (oppLastSeen && (Date.now() - new Date(oppLastSeen).getTime() > 30000)) {
            setOpponentDisconnected(true);
            await supabase.rpc('claim_timeout_win', { duel_uuid: duelId, claimant_uuid: user.id });
          }
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [status, duelId, user]);

  // Страховка финиша (если сокет не сработал)
  useEffect(() => {
    let interval: any;
    if ((status === 'battle' || status === 'searching') && duelId) {
      interval = setInterval(async () => {
        const { data } = await supabase.from('duels').select('status, winner_id, elo_change').eq('id', duelId).single();
        if (data && data.status === 'finished') {
          clearInterval(interval);
          endGame(data.winner_id, data.elo_change);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, duelId]);

  // Загрузка данных
  async function loadProblems(ids: string[]) {
    if (!ids || ids.length === 0) return;
    const { data } = await supabase.from('problems').select('*').in('id', ids);
    const sorted = ids.map(id => data?.find(p => p.id === id)).filter(Boolean);
    setProblems(sorted);
  }

  async function fetchOpponentData(uid: string) {
    const { data } = await supabase.from('profiles').select('username, mmr').eq('id', uid).single();
    if (data) {
      setOpponentName(data.username);
      setOpponentMMR(data.mmr || 1000);
    }
  }

  function endGame(winnerId: string, eloChange: number = 0) {
    if (status === 'finished') return;
    setStatus('finished');
    setMmrChange(eloChange > 0 ? eloChange : 25);
    if (winnerId === user!.id) setWinner('me');
    else setWinner('opponent');
    refreshProfile();
  }

  const confirmSurrender = async () => {
    setShowSurrenderModal(false);
    if (duelId && user) {
      await supabase.rpc('surrender_duel', { duel_uuid: duelId, surrendering_uuid: user.id });
    }
  };

  // === 5. РЕНДЕР ===

  // ЭКРАН 1: ЛОББИ
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
               {profile?.mmr || 1000} MP <span className="text-sm text-slate-500">({getPvPRank(profile?.mmr || 1000)})</span>
             </div>
          </div>
          <button onClick={findMatch} className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-bold text-white text-xl hover:scale-105 transition-transform shadow-lg shadow-red-500/30 flex items-center justify-center gap-2">
            <Play className="w-6 h-6 fill-current" />
            НАЙТИ СОПЕРНИКА
          </button>
          <button onClick={onBack} className="text-slate-500 hover:text-white text-sm flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Вернуться в лабораторию
          </button>
        </div>
      </div>
    );
  }

  // ЭКРАН 2: ПОИСК
  if (status === 'searching') {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <Loader className="w-16 h-16 text-red-500 animate-spin" />
        <h2 className="text-2xl font-bold text-white animate-pulse">
           {initialDuelId ? 'Восстановление связи...' : 'Поиск противника...'}
        </h2>
        <div className="text-slate-400 text-sm max-w-xs text-center">
          {initialDuelId ? 'Возвращаемся в битву...' : 'Ожидаем подключения...'}
          <br/>
          (Ваш рейтинг: {profile?.mmr || 1000} MP)
        </div>
        <button onClick={async () => {
           if (!initialDuelId) {
             if (duelId) await supabase.from('duels').delete().eq('id', duelId);
             setDuelId(null);
             setStatus('lobby');
           } else {
             onBack();
           }
        }} className="px-6 py-2 border border-slate-600 rounded-full text-slate-400 hover:bg-slate-800">
          Отмена
        </button>
      </div>
    );
  }

  // ЭКРАН 3: БИТВА (ВАЖНО: НОВАЯ ВЕРСТКА)
  if (status === 'battle') {
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-900 overflow-hidden">
        
        {/* Оверлеи (Сдача, Дисконнект) */}
        {opponentDisconnected && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-bounce z-50 shadow-lg">
            <WifiOff className="w-4 h-4" />
            <span className="text-xs">Соперник теряет сеть...</span>
          </div>
        )}

        {showSurrenderModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex flex-col items-center text-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                <h3 className="text-xl font-bold text-white mb-1">Сдаться?</h3>
                <p className="text-slate-400 text-sm">Вы потеряете рейтинг.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowSurrenderModal(false)} className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold">Отмена</button>
                <button onClick={confirmSurrender} className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold">Сдаться</button>
              </div>
            </div>
          </div>
        )}

        {/* ВЕРХНЯЯ ЧАСТЬ (Скроллится) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-0">
            
            {/* ТАБЛО */}
            <div className="flex items-center justify-between mb-4 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <button onClick={() => setShowSurrenderModal(true)} className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg">
                <Flag className="w-5 h-5" />
              </button>
              
              <div className="text-right">
                <div className="text-cyan-400 text-xs font-bold">ВЫ</div>
                <div className="text-2xl font-black text-white leading-none">{myScore}</div>
              </div>
              
              <div className="flex flex-col items-center px-4">
                 <div className={`flex items-center gap-1 font-mono font-bold text-xl ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    <Timer className="w-4 h-4" /> {timeLeft}
                 </div>
              </div>
              
              <div className="text-left">
                <div className="text-red-400 text-xs font-bold truncate max-w-[80px]">{opponentName}</div>
                <div className="text-2xl font-black text-white leading-none">{oppScore}</div>
              </div>
            </div>

            {/* ПРОГРЕСС БАРЫ */}
            <div className="space-y-1.5 mb-4">
               <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${(currentProbIndex / 10) * 100}%` }} /></div>
               <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(oppProgress / 10) * 100}%` }} /></div>
            </div>

            {/* ЗАДАЧА */}
            {currentProbIndex < problems.length && problems[currentProbIndex] ? (
               <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 mb-4 relative overflow-hidden min-h-[120px] flex items-center justify-center text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                    <Latex>{problems[currentProbIndex].question}</Latex>
                  </h2>
               </div>
            ) : (
               <div className="flex items-center justify-center h-20">
                 <div className="text-center animate-pulse text-white text-sm">
                   <Loader className="w-6 h-6 mx-auto mb-2 animate-spin" />
                   Ожидание результата...
                 </div>
               </div>
            )}
        </div>

        {/* НИЖНЯЯ ЧАСТЬ (Клавиатура) */}
        <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 z-50">
            {feedback ? (
              // ЗОНА РЕЗУЛЬТАТА (вместо клавы)
              <div className={`p-6 flex items-center justify-center gap-4 animate-in zoom-in duration-300 min-h-[300px] ${feedback === 'correct' ? 'bg-emerald-900/20' : 'bg-red-900/20'}`}>
                  <div className="text-center">
                    <div className={`text-4xl font-black mb-2 ${feedback === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {feedback === 'correct' ? 'ВЕРНО!' : 'МИМО!'}
                    </div>
                  </div>
              </div>
            ) : (
              // ЗОНА ВВОДА
              <div className="p-2 pb-safe">
                 <div className="mb-2 px-1">
                   <MathInput
                     value={userAnswer}
                     onChange={setUserAnswer}
                     onSubmit={() => handleAnswer()}
                     mfRef={mfRef}
                   />
                 </div>
                 <MathKeypad
                   onCommand={handleKeypadCommand}
                   onDelete={handleKeypadDelete}
                   onClear={handleKeypadClear}
                   onSubmit={() => handleAnswer()}
                 />
              </div>
            )}
        </div>

      </div>
    );
  }

  // ЭКРАН 4: ФИНИШ
  if (status === 'finished') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 md:p-12 bg-slate-800 rounded-3xl border-2 border-slate-600 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-300 m-4">
          {winner === 'me' ? (
            <>
              <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4 drop-shadow-lg" />
              <h1 className="text-4xl font-black text-yellow-400 mb-2">ПОБЕДА!</h1>
              {opponentDisconnected ? (
                 <p className="text-emerald-300 mb-6 text-sm">Противник сдался.</p>
              ) : (
                 <p className="text-emerald-400 font-bold mb-6 animate-pulse">+ {mmrChange} MP</p>
              )}
            </>
          ) : (
            <>
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <h1 className="text-4xl font-black text-red-500 mb-2">ПОРАЖЕНИЕ</h1>
              <p className="text-slate-400 mb-6">- {mmrChange} MP</p>
            </>
          )}
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-6">
            <div className="text-xs text-slate-500 mb-1 uppercase tracking-widest">Счет матча</div>
            <div className="flex items-center justify-center gap-4 text-3xl font-mono font-bold">
              <span className={winner === 'me' ? 'text-yellow-400' : 'text-slate-500'}>{myScore}</span>
              <span className="text-slate-600">:</span>
              <span className={winner === 'opponent' ? 'text-yellow-400' : 'text-slate-500'}>{oppScore}</span>
            </div>
          </div>
          <button onClick={onBack} className="w-full px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors">
            В меню
          </button>
        </div>
      </div>
    );
  }
  return null;
}
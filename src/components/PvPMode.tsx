import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Latex from 'react-latex-next';
import { Zap, Loader, Trophy, XCircle, Play, CheckCircle2, Timer, WifiOff, ArrowLeft, Flag, AlertTriangle } from 'lucide-react';
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
  
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);

  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);

  // === ФУНКЦИИ КЛАВИАТУРЫ ===
  const handleKeyInput = (symbol: string) => {
    setUserAnswer((prev) => prev + symbol);
  };

  const handleBackspace = () => {
    setUserAnswer((prev) => prev.slice(0, -1));
  };

  // === ЛОГИКА ВЫХОДА / СДАЧИ ===
  const handleExitRequest = () => {
    if (status === 'battle') {
      setShowSurrenderModal(true);
    } else {
      if (status === 'searching' && duelId) {
        supabase.from('duels').delete().eq('id', duelId).then(() => {});
      }
      onBack();
    }
  };

  const confirmSurrender = async () => {
    setShowSurrenderModal(false);
    if (duelId && user) {
      await supabase.rpc('surrender_duel', { 
        duel_uuid: duelId, 
        surrendering_uuid: user.id 
      });
      onBack(); 
    }
  };

  // === 1. ТАЙМЕР ЗАДАЧИ ===
  useEffect(() => {
    let timer: any;
    if (status === 'battle' && !feedback && currentProbIndex < 10) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeout(); 
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, feedback, currentProbIndex]);

  useEffect(() => { setTimeLeft(60); }, [currentProbIndex]);
  const handleTimeout = () => submitResult(false);

  // === 2. HEARTBEAT БИТВЫ ===
  useEffect(() => {
    let interval: any;
    if (status === 'battle' && duelId) {
      interval = setInterval(async () => {
        const { data: duelInfo } = await supabase.from('duels').select('player1_id').eq('id', duelId).single();
        if (!duelInfo) return;

        const isP1 = duelInfo.player1_id === user!.id;
        const updateField = isP1 ? 'player1_last_seen' : 'player2_last_seen';
        
        await supabase.from('duels').update({ [updateField]: new Date().toISOString() }).eq('id', duelId);

        const { data } = await supabase.from('duels').select('player1_last_seen, player2_last_seen').eq('id', duelId).single();
        
        if (data) {
          const oppLastSeen = isP1 ? data.player2_last_seen : data.player1_last_seen;
          if (oppLastSeen) {
            const diff = Date.now() - new Date(oppLastSeen).getTime();
            if (diff > 30000) {
              setOpponentDisconnected(true);
              await supabase.rpc('claim_timeout_win', { duel_uuid: duelId, claimant_uuid: user!.id });
            }
          }
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [status, duelId]);

  // === 3. ПОИСК (POLLING) ===
  useEffect(() => {
    let interval: any;
    if (status === 'searching' && duelId) {
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
  }, [status, duelId]);

  async function findMatch() {
    setStatus('searching');
    const myMMR = profile?.mmr || 1000;
    const range = 300;
    const oldTime = new Date(Date.now() - 20000).toISOString();
    
    await supabase.from('duels').delete().eq('status', 'waiting').lt('last_seen', oldTime);

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
      setDuelId(waitingDuel.id);
      await loadProblems(waitingDuel.problem_ids);
      await fetchOpponentData(waitingDuel.player1_id);
      await supabase.from('duels').update({ 
          player2_id: user!.id, 
          player2_mmr: myMMR, 
          status: 'active',
          player2_last_seen: new Date().toISOString()
      }).eq('id', waitingDuel.id);
      
      startBattleSubscription(waitingDuel.id, 'player2');
      setStatus('battle');
    } else {
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
          last_seen: new Date().toISOString(),
          player1_last_seen: new Date().toISOString(),
          problem_ids: shuffled
        })
        .select().single();

      if (newDuel) {
        setDuelId(newDuel.id);
        await loadProblems(shuffled);
        startBattleSubscription(newDuel.id, 'player1');
      }
    }
  }

  // === 4. ПОДПИСКА ===
  function startBattleSubscription(id: string, myRole: 'player1' | 'player2') {
    supabase.channel(`duel-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${id}` }, 
      (payload) => {
        const newData = payload.new;
        if (newData.status === 'active' && status === 'searching') {
           if (myRole === 'player1' && newData.player2_id) {
             fetchOpponentData(newData.player2_id).then(() => setStatus('battle'));
           }
        }
        if (myRole === 'player1') {
          setOppScore(newData.player2_score);
          setOppProgress(newData.player2_progress);
        } else {
          setOppScore(newData.player1_score);
          setOppProgress(newData.player1_progress);
        }
        if (newData.status === 'finished') endGame(newData.winner_id);
      })
      .subscribe();
  }

  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!duelId || feedback || userAnswer.trim() === '') return; 
    const currentProb = problems[currentProbIndex];
    const isCorrect = userAnswer.toLowerCase().trim() === currentProb.answer.toLowerCase().trim();
    submitResult(isCorrect);
  }

  async function submitResult(isCorrect: boolean) {
    setFeedback(isCorrect ? 'correct' : 'wrong');
    const newScore = isCorrect ? myScore + 1 : myScore;
    setMyScore(newScore);
    const newProgress = currentProbIndex + 1;

    const { data: duel } = await supabase.from('duels').select('player1_id').eq('id', duelId!).single();
    const isP1 = duel?.player1_id === user!.id;
    const updateData = isP1 
      ? { player1_score: newScore, player1_progress: newProgress, player1_last_seen: new Date().toISOString() }
      : { player2_score: newScore, player2_progress: newProgress, player2_last_seen: new Date().toISOString() };
    
    supabase.from('duels').update(updateData).eq('id', duelId!).then(async () => {
       if (newProgress >= 10) {
          await supabase.rpc('finish_duel', { duel_uuid: duelId, finisher_uuid: user!.id });
       }
    });

    setTimeout(() => {
      setFeedback(null);
      setCurrentProbIndex(newProgress);
      setUserAnswer('');
    }, 1000);
  }

  async function loadProblems(ids: string[]) {
    if (!ids || ids.length === 0) return;
    const { data } = await supabase.from('problems').select('*').in('id', ids);
    setProblems(ids.map(id => data?.find(p => p.id === id)).filter(Boolean));
  }

  async function fetchOpponentData(uid: string) {
    const { data } = await supabase.from('profiles').select('username, mmr').eq('id', uid).single();
    if (data) {
      setOpponentName(data.username);
      setOpponentMMR(data.mmr || 1000);
    }
  }

  function endGame(winnerId: string) {
    setStatus('finished');
    if (winnerId === user!.id) setWinner('me');
    else setWinner('opponent');
  }

  // === РЕНДЕР ===
  return (
    <>
      {/* МОДАЛКА СДАЧИ */}
      {showSurrenderModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Признать поражение?</h3>
              <p className="text-slate-400 text-sm">
                Вы потеряете <span className="text-red-400 font-bold">25 MP</span>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowSurrenderModal(false)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={confirmSurrender}
                className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
              >
                Сдаться
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ЛОББИ */}
      {status === 'lobby' && (
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
      )}

      {/* ПОИСК */}
      {status === 'searching' && (
        <div className="flex flex-col items-center justify-center h-full space-y-6">
          <Loader className="w-16 h-16 text-red-500 animate-spin" />
          <h2 className="text-2xl font-bold text-white animate-pulse">Поиск противника...</h2>
          <div className="text-slate-400 text-sm max-w-xs text-center">
            Ожидаем подключения...<br/>
            (Ваш рейтинг: {profile?.mmr || 1000} MP)
          </div>
          <button onClick={handleExitRequest} className="px-6 py-2 border border-slate-600 rounded-full text-slate-400 hover:bg-slate-800">
            Отмена
          </button>
        </div>
      )}

      {/* БИТВА */}
      {status === 'battle' && (
        <div className="max-w-4xl mx-auto p-4 md:p-8 h-full flex flex-col relative">
          
          {opponentDisconnected && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-bounce z-50 shadow-lg">
              <WifiOff className="w-4 h-4" />
              <span>Соперник теряет соединение...</span>
            </div>
          )}

          {feedback && (
            <div className={`absolute inset-0 z-50 flex items-center justify-center rounded-3xl backdrop-blur-sm animate-in fade-in duration-200 ${
              feedback === 'correct' ? 'bg-emerald-500/20' : 'bg-red-500/20'
            }`}>
              <div className={`p-8 rounded-full ${feedback === 'correct' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'} shadow-2xl scale-125`}>
                {feedback === 'correct' ? <CheckCircle2 className="w-16 h-16" /> : <XCircle className="w-16 h-16" />}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6 bg-slate-900/80 p-4 rounded-xl border border-slate-700 relative">
            <button 
              onClick={handleExitRequest}
              className="absolute -top-12 left-0 md:static md:mr-4 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all flex items-center gap-2"
              title="Сдаться"
            >
              <Flag className="w-5 h-5" />
              <span className="text-xs font-bold hidden md:inline">СДАТЬСЯ</span>
            </button>

            <div className="text-right">
              <div className="text-cyan-400 font-bold text-lg">ВЫ</div>
              <div className="text-3xl font-black text-white">{myScore}/10</div>
            </div>
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

          <div className="flex-1 flex flex-col justify-center">
            {currentProbIndex < 10 && problems[currentProbIndex] ? (
              <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                 <div className="flex justify-between items-center mb-6">
                   <div className="text-slate-400 text-sm font-mono">ЗАДАЧА {currentProbIndex + 1}</div>
                   <div className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">Ввод ответа</div>
                 </div>
                 
                 <h2 className="text-3xl font-bold text-white mb-8 leading-relaxed">
                   <Latex>{problems[currentProbIndex].question}</Latex>
                 </h2>
                 
                 <form onSubmit={handleAnswer} className="flex flex-col gap-4">
                   <div className="flex flex-col sm:flex-row gap-3">
                     <input 
                        autoFocus
                        type="text" 
                        value={userAnswer}
                        onChange={e => setUserAnswer(e.target.value)}
                        disabled={!!feedback}
                        className="w-full flex-1 bg-slate-900 border border-slate-600 rounded-xl px-6 py-4 text-xl text-white outline-none focus:border-cyan-500 transition-colors disabled:opacity-50 font-mono"
                        placeholder="Ваш ответ..."
                     />
                     <button 
                        type="submit" 
                        disabled={!!feedback || userAnswer.trim() === ''}
                        className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold text-xl transition-colors disabled:cursor-not-allowed"
                     >
                       GO
                     </button>
                   </div>
                   
                   <MathKeypad onKeyPress={handleKeyInput} onBackspace={handleBackspace} />
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
      )}

      {/* ФИНИШ */}
      {status === 'finished' && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-12 bg-slate-800 rounded-3xl border-2 border-slate-600 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-300">
            {winner === 'me' ? (
              <>
                <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
                  ПОБЕДА!
                </h1>
                {opponentDisconnected ? (
                   <p className="text-emerald-300 text-lg mb-8">Соперник сбежал с поля боя.</p>
                ) : (
                   <p className="text-slate-300 text-lg mb-8">Рейтинг повышен! (+25 MP)</p>
                )}
              </>
            ) : (
              <>
                <XCircle className="w-24 h-24 text-red-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                <h1 className="text-5xl font-black text-red-500 mb-4">
                  ПОРАЖЕНИЕ
                </h1>
                <p className="text-slate-300 text-lg mb-8">Рейтинг понижен (-25 MP)</p>
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
      )}
    </>
  );
}
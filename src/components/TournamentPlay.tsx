import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Latex from 'react-latex-next';
import { Loader, Trophy, XCircle, Timer, Flag, AlertTriangle, WifiOff } from 'lucide-react';
import { MathKeypad } from './MathKeypad';
import { MathInput } from './MathInput';
import { checkAnswer } from '../lib/mathUtils';
import { RealtimeChannel } from '@supabase/supabase-js';

type Props = {
  duelId: string;
  onFinished: () => void;
};

export function TournamentPlay({ duelId, onFinished }: Props) {
  const { user } = useAuth();
 
  const [loading, setLoading] = useState(true);
  const [opponentName, setOpponentName] = useState<string>('Соперник');
 
  const [problems, setProblems] = useState<any[]>([]);
  const [currentProbIndex, setCurrentProbIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  
  const [userAnswer, setUserAnswer] = useState('');
  const mfRef = useRef<any>(null);
 
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [matchStatus, setMatchStatus] = useState<'active' | 'finished'>('active');
  const [winnerId, setWinnerId] = useState<string | null>(null);
 
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  // === ОБРАБОТЧИКИ КЛАВИАТУРЫ ===
  const handleKeypadCommand = (cmd: string, arg?: string) => {
    if (!mfRef.current) return;
    const scrollY = window.scrollY;
   
    if (cmd === 'insert') {
      mfRef.current.executeCommand(['insert', arg]);
    } else if (cmd === 'perform') {
      mfRef.current.executeCommand([arg]);
    }
    
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

  // === 1. ИНИЦИАЛИЗАЦИЯ ===
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    async function initMatch() {
      if (!user) return;
     
      const { data: duel } = await supabase.from('duels').select('*').eq('id', duelId).single();
      if (!duel) { onFinished(); return; }
      
      supabase.from('tournament_logs').insert({
        tournament_id: duel.tournament_id,
        user_id: user.id,
        event: 'enter_match',
        details: { duel_id: duelId, round: duel.round }
      }).then(() => {});

      if (duel.status === 'finished') {
        setMatchStatus('finished');
        setWinnerId(duel.winner_id);
        setMyScore(duel.player1_id === user.id ? duel.player1_score : duel.player2_score);
        setOppScore(duel.player1_id === user.id ? duel.player2_score : duel.player1_score);
        setLoading(false);
        return;
      }

      const isP1 = duel.player1_id === user.id;
      const oppId = isP1 ? duel.player2_id : duel.player1_id;
     
      await loadProblems(duel.problem_ids);
     
      if (oppId) {
        const { data: oppProfile } = await supabase.from('profiles').select('username').eq('id', oppId).single();
        if (oppProfile) setOpponentName(oppProfile.username);
      } else {
        setOpponentName("Ожидание...");
      }

      const myProg = isP1 ? duel.player1_progress : duel.player2_progress;
      const myPts = isP1 ? duel.player1_score : duel.player2_score;
      const oppPts = isP1 ? duel.player2_score : duel.player1_score;
      const oppProg = isP1 ? duel.player2_progress : duel.player1_progress;
     
      setCurrentProbIndex(myProg);
      setMyScore(myPts);
      setOppScore(oppPts);
      setOppProgress(oppProg);
      setLoading(false);
     
      channel = supabase
        .channel(`t-duel-${duel.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${duel.id}` },
        (payload) => {
          const newData = payload.new;
          const newOppScore = isP1 ? newData.player2_score : newData.player1_score;
          const newOppProg = isP1 ? newData.player2_progress : newData.player1_progress;
          setOppScore(newOppScore);
          setOppProgress(newOppProg);
          if (newData.status === 'finished') {
            setMatchStatus('finished');
            setWinnerId(newData.winner_id);
          }
        })
        .subscribe();
    }
    initMatch();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [duelId, user, onFinished]);

  // === 2. HEARTBEAT ===
  useEffect(() => {
    let interval: any;
    if (matchStatus === 'active' && duelId && !loading && user) {
      interval = setInterval(async () => {
        const { data: duelInfo } = await supabase.from('duels').select('player1_id').eq('id', duelId).single();
        if (!duelInfo) return;
        const isP1 = duelInfo.player1_id === user.id;
        const updateField = isP1 ? 'player1_last_seen' : 'player2_last_seen';
       
        await supabase.from('duels').update({ [updateField]: new Date().toISOString() }).eq('id', duelId);
        
        const { data } = await supabase.from('duels').select('player1_last_seen, player2_last_seen').eq('id', duelId).single();
        if (data) {
          const oppLastSeen = isP1 ? data.player2_last_seen : data.player1_last_seen;
          if (oppLastSeen && (Date.now() - new Date(oppLastSeen).getTime() > 120000)) {
            setOpponentDisconnected(true);
            await supabase.rpc('claim_timeout_win', { duel_uuid: duelId, claimant_uuid: user.id });
          }
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [matchStatus, duelId, loading, user]);

  // === 3. ОТПРАВКА ОТВЕТА ===
  const submitResult = useCallback(async (isCorrect: boolean) => {
    if (!user || !duelId) return;
    setFeedback(isCorrect ? 'correct' : 'wrong');
   
    const newScore = isCorrect ? myScore + 1 : myScore;
    setMyScore(newScore);
    const newProgress = currentProbIndex + 1;

    try {
      await supabase.rpc('submit_pvp_move', {
        duel_uuid: duelId,
        player_uuid: user.id,
        is_correct: isCorrect,
        problem_idx: currentProbIndex
      });
      if (newProgress >= problems.length) {
          await supabase.rpc('finish_duel', { duel_uuid: duelId, finisher_uuid: user.id });
      }
    } catch (err) {
      console.error("Ошибка при отправке ответа:", err);
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
  }, [duelId, user, myScore, currentProbIndex, problems.length]);

  // === 4. ТАЙМЕР ===
  const handleTimeout = useCallback(() => {
    if (feedback) return;
    submitResult(false);
  }, [feedback, submitResult]);

  useEffect(() => {
    let timer: any;
    if (matchStatus === 'active' && !feedback && currentProbIndex < problems.length) {
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
  }, [matchStatus, feedback, currentProbIndex, problems.length, handleTimeout]);

  useEffect(() => { setTimeLeft(60); }, [currentProbIndex]);

  useEffect(() => {
    if (!loading && mfRef.current && matchStatus === 'active') {
      setTimeout(() => {
         if (mfRef.current) mfRef.current.focus({ preventScroll: true });
      }, 50);
    }
  }, [loading, matchStatus]);

  // === 5. ОБРАБОТЧИКИ ===
  const handleAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (feedback || !userAnswer || userAnswer.trim() === '') return;
    const currentProb = problems[currentProbIndex];
    const isCorrect = checkAnswer(userAnswer, currentProb.answer);
    submitResult(isCorrect);
  }

  const confirmSurrender = async () => {
    setShowSurrenderModal(false);
    if (duelId && user) {
      await supabase.rpc('surrender_duel', { duel_uuid: duelId, surrendering_uuid: user.id });
    }
  };

  async function loadProblems(ids: string[]) {
    if (!ids || ids.length === 0) return;
    const { data } = await supabase.from('problems').select('*').in('id', ids);
    const sorted = ids.map(id => data?.find(p => p.id === id)).filter(Boolean);
    setProblems(sorted);
  }

  if (loading) return <div className="flex h-full items-center justify-center"><Loader className="animate-spin text-cyan-400 w-10 h-10"/></div>;

  // === ЭКРАН ФИНИША ===
  if (matchStatus === 'finished' || currentProbIndex >= problems.length) {
    const isWinner = winnerId === user!.id;
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-12 bg-slate-800 rounded-3xl border-2 border-slate-600 shadow-2xl max-w-lg w-full animate-in zoom-in duration-300">
          {isWinner ? (
            <>
              <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
              <h1 className="text-4xl font-black text-yellow-400 mb-4">ПОБЕДА!</h1>
              {opponentDisconnected ? (
                 <p className="text-emerald-300 mb-8">Соперник отключился.</p>
              ) : (
                 <p className="text-slate-300 mb-8">Вы проходите в следующий раунд.</p>
              )}
            </>
          ) : (
            <>
              <XCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
              <h1 className="text-4xl font-black text-red-500 mb-4">ВЫБЫВАНИЕ</h1>
              <p className="text-slate-300 mb-8">Хорошая игра. Тренируйтесь в лаборатории!</p>
            </>
          )}
         
          <div className="text-4xl font-mono font-bold text-white mb-8">
            {myScore} : {oppScore}
          </div>
          <button onClick={onFinished} className="w-full px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors">
            Вернуться к сетке
          </button>
        </div>
      </div>
    );
  }

  const currentProb = problems[currentProbIndex];
  
  // ============ НОВЫЙ STICKY LAYOUT (КАК В PVP) ============
  return (
    <div className="flex flex-col h-[100dvh] bg-slate-900 overflow-hidden">
     
      {showSurrenderModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Сдаться?</h3>
              <p className="text-slate-400 text-sm">Вам будет засчитано поражение.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowSurrenderModal(false)} className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold">Отмена</button>
              <button onClick={confirmSurrender} className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold">Сдаться</button>
            </div>
          </div>
        </div>
      )}

      {opponentDisconnected && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-bounce z-50 shadow-lg">
            <WifiOff className="w-4 h-4" />
            <span className="text-xs">Соперник теряет соединение...</span>
          </div>
      )}

      {/* ========== STICKY ВЕРХНЯЯ ЧАСТЬ ========== */}
      <div className="flex-shrink-0 bg-slate-900 border-b border-slate-800 shadow-lg z-10">
        
        {/* ТАБЛО */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700">
          <button onClick={() => setShowSurrenderModal(true)} className="p-1.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg">
            <Flag className="w-4 h-4" />
          </button>
          
          <div className="text-right">
            <div className="text-cyan-400 text-[10px] font-bold uppercase">ВЫ</div>
            <div className="text-xl font-black text-white leading-none">{myScore}</div>
          </div>
          
          <div className="flex flex-col items-center px-3">
             <div className={`flex items-center gap-1 font-mono font-bold text-lg ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                <Timer className="w-3.5 h-3.5" /> {timeLeft}
             </div>
          </div>
          
          <div className="text-left">
            <div className="text-red-400 text-[10px] font-bold truncate max-w-[70px] uppercase">
               {opponentName}
            </div>
            <div className="text-xl font-black text-white leading-none">{oppScore}</div>
          </div>
        </div>

        {/* ПРОГРЕССБАРЫ */}
        <div className="space-y-1 px-3 py-2 bg-slate-900">
           <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${(currentProbIndex / (problems.length || 10)) * 100}%` }} />
           </div>
           <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(oppProgress / (problems.length || 10)) * 100}%` }} />
           </div>
        </div>

        {/* ========== STICKY ЗАДАНИЕ ========== */}
        {currentProb ? (
           <div className="px-3 py-3 bg-gradient-to-b from-slate-900 to-slate-900/95">
              <div className="bg-slate-800/60 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-3 shadow-lg">
                <div className="text-base md:text-lg font-bold text-white leading-snug text-center">
                  <Latex>{currentProb.question}</Latex>
                </div>
              </div>
           </div>
        ) : (
           <div className="flex items-center justify-center py-4">
             <div className="text-center animate-pulse text-white text-sm">
               <Loader className="w-5 h-5 mx-auto mb-1 animate-spin" />
               Загрузка...
             </div>
           </div>
        )}
      </div>

      {/* ========== НИЖНЯЯ ЧАСТЬ (КЛАВИАТУРА) ========== */}
      <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 shadow-2xl z-20">
        {feedback ? (
          <div className={`p-4 flex items-center justify-center gap-4 animate-in zoom-in duration-300 min-h-[280px] ${feedback === 'correct' ? 'bg-emerald-900/20' : 'bg-red-900/20'}`}>
              <div className="text-center">
                <div className={`text-3xl font-black mb-2 ${feedback === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {feedback === 'correct' ? 'ВЕРНО!' : 'МИМО!'}
                </div>
              </div>
          </div>
        ) : (
          <div className="p-2 pb-safe">
             <div className="mb-1.5 px-1">
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
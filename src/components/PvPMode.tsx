import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Latex from 'react-latex-next';
import {
  Zap,
  Loader,
  Trophy,
  XCircle,
  Play,
  Timer,
  WifiOff,
  ArrowLeft,
  Flag,
  AlertTriangle,
  Target,
  Info
} from 'lucide-react';
import { getPvPRank, getPvPShortRank } from '../lib/gameLogic';
import { MathKeypad } from './MathKeypad';
import { MathInput } from './MathInput';
import { checkAnswer } from '../lib/mathUtils';
import { useBotOpponent, getDeterministicBotName } from '../hooks/useBotOpponent';
import { grantXp } from '../lib/xpSystem';
import { recordCalibrationMatch } from '../lib/CalibrationSystem';
import { PvPRank } from '../lib/PvPRankSystem';
import { RankUpModal } from './RankUpModal';
import { RankLegendModal } from './RankLegendModal';
const BOT_UUID = 'c00d4ad6-1ed1-4195-b596-ac6960f3830a';
const PVP_MODULE_ID = '00000000-0000-0000-0000-000000000099';
const BASE_MMR = 700;
type DuelState = 'lobby' | 'searching' | 'battle' | 'finished';
type Props = {
  onBack: () => void;
  initialDuelId?: string | null;
};
export function PvPMode({ onBack, initialDuelId }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  // === State ===
  const [status, setStatus] = useState<DuelState>(initialDuelId ? 'searching' : 'lobby');
  const [duelId, setDuelId] = useState<string | null>(initialDuelId || null);
  // Opponent Data
  const [opponentName, setOpponentName] = useState<string>('???');
  const [opponentMMR, setOpponentMMR] = useState<number>(1000);
  const [isBotMatch, setIsBotMatch] = useState(false);
  const [botName, setBotName] = useState<string>('Bot');
  // Game Data
  const [problems, setProblems] = useState<any[]>([]);
  const [currentProbIndex, setCurrentProbIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  // Input
  const [userAnswer, setUserAnswer] = useState('');
  const mfRef = useRef<any>(null);
  // Results & UI
  const [winner, setWinner] = useState<'me' | 'opponent' | 'draw' | null>(null);
  const [mmrChange, setMmrChange] = useState<number | null>(null);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
 
  // Modals / Statuses
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showRankLegend, setShowRankLegend] = useState(false);
  // Rank Reveal (Calibration finish)
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [revealOldMMR, setRevealOldMMR] = useState<number | null>(null);
  const [revealNewMMR, setRevealNewMMR] = useState<number | null>(null);
  const [revealRank, setRevealRank] = useState<PvPRank | null>(null);
  // === Bot Setup ===
  const myMMR = profile?.mmr ?? 700;
  let botDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
  if (myMMR < 800) botDifficulty = 'easy';
  if (myMMR > 1400) botDifficulty = 'hard';
  const botOpponent = useBotOpponent({
    isEnabled: isBotMatch && status === 'battle',
    duelId: duelId,
    difficulty: botDifficulty,
    maxQuestions: problems.length || 10,
    initialScore: isBotMatch ? oppScore : 0,
    initialProgress: isBotMatch ? oppProgress : 0,
    onProgressUpdate: async (score, progress) => {
      setOppScore(score);
      setOppProgress(progress);
      if (duelId) {
        await supabase.from('duels').update({ player2_score: score, player2_progress: progress }).eq('id', duelId);
      }
      if (progress >= (problems.length || 10)) handleBotWin(score);
    }
  });
  // Sync bot name
  useEffect(() => {
    if (botOpponent?.botName) setBotName(botOpponent.botName);
    else if (duelId) setBotName(getDeterministicBotName(duelId));
  }, [botOpponent, duelId]);
  const handleBotWin = async (finalBotScore: number) => {
    if (status === 'finished') return;
    if (duelId) await supabase.rpc('finish_duel', { duel_uuid: duelId, finisher_uuid: BOT_UUID });
   
    // Determine winner immediately for bot match
    if (myScore > finalBotScore) endGame('me', 25);
    else if (myScore < finalBotScore) endGame('opponent', -20);
    else endGame('opponent', -10); // Draw favors bot slightly in simpler logic, or handle draw
  };
  // === Initial Load / Reconnect ===
  useEffect(() => {
    if (initialDuelId && status === 'searching') {
      reconnectToDuel(initialDuelId);
    }
  }, []);
  async function reconnectToDuel(id: string) {
    const { data: duel } = await supabase.from('duels').select('*').eq('id', id).single();
    if (!duel || duel.status === 'finished') {
      setStatus('finished');
      if (duel) endGame(duel.winner_id, duel.elo_change);
      return;
    }
    const isP1 = duel.player1_id === user?.id;
    const oppId = isP1 ? duel.player2_id : duel.player1_id;
    if (duel.player2_id === BOT_UUID) {
      setIsBotMatch(true);
      setOpponentName(getDeterministicBotName(id));
      setOppScore(duel.player2_score);
      setOppProgress(duel.player2_progress);
    } else {
      if (oppId) await fetchOpponentData(oppId);
      setOppScore(isP1 ? duel.player2_score : duel.player1_score);
      setOppProgress(isP1 ? duel.player2_progress : duel.player1_progress);
      startBattleSubscription(id, isP1 ? 'player1' : 'player2');
    }
    await loadProblems(duel.problem_ids);
    setMyScore(isP1 ? duel.player1_score : duel.player2_score);
    setCurrentProbIndex(isP1 ? duel.player1_progress : duel.player2_progress);
    setStatus('battle');
  }
  // === Matchmaking ===
  async function findMatch() {
    setStatus('searching');
    setIsBotMatch(false);
    const range = 300;
    const { data: waitingDuel } = await supabase
      .from('duels')
      .select('*')
      .eq('status', 'waiting')
      .is('tournament_id', null)
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
        player2_id: user!.id, player2_mmr: myMMR, status: 'active', player2_last_seen: new Date().toISOString()
      }).eq('id', waitingDuel.id);
     
      startBattleSubscription(waitingDuel.id, 'player2');
      setStatus('battle');
      return;
    }
    // Create new duel
    const { data: allProbs } = await supabase.from('problems').select('id').eq('module_id', PVP_MODULE_ID);
    const shuffled = (allProbs ?? []).sort(() => 0.5 - Math.random()).slice(0, 10).map((p: any) => p.id);
   
    const { data: newDuel } = await supabase.from('duels').insert({
      player1_id: user!.id, player1_mmr: myMMR, status: 'waiting',
      last_seen: new Date().toISOString(), player1_last_seen: new Date().toISOString(),
      problem_ids: shuffled
    }).select().single();
    if (!newDuel) return;
    setDuelId(newDuel.id);
    await loadProblems(shuffled);
    const channel = supabase.channel(`duel-${newDuel.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${newDuel.id}` },
        (payload) => {
          const newData = payload.new;
          if (newData.status === 'active' && newData.player2_id && newData.player2_id !== BOT_UUID) {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            fetchOpponentData(newData.player2_id).then(() => setStatus('battle'));
          }
        })
      .subscribe();
    // Fallback to Bot after 7s
    searchTimeoutRef.current = setTimeout(async () => {
      supabase.removeChannel(channel);
      const fakeBotMMR = myMMR + Math.floor(Math.random() * 100 - 50);
      setOpponentMMR(fakeBotMMR);
      await supabase.from('duels').update({
        status: 'active', player2_id: BOT_UUID, player2_mmr: fakeBotMMR
      }).eq('id', newDuel.id);
      setIsBotMatch(true);
      setStatus('battle');
    }, 7000);
  }
  function startBattleSubscription(id: string, myRole: 'player1' | 'player2') {
    if (isBotMatch) return;
    supabase.channel(`duel-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${id}` },
        (payload) => {
          const newData = payload.new;
          if (myRole === 'player1') {
            setOppScore(newData.player2_score);
            setOppProgress(newData.player2_progress);
          } else {
            setOppScore(newData.player1_score);
            setOppProgress(newData.player1_progress);
          }
          if (newData.status === 'finished') {
            endGame(newData.winner_id, newData.elo_change);
          }
        })
      .subscribe();
  }
  // === Game Logic ===
  async function submitResult(isCorrect: boolean) {
    setFeedback(isCorrect ? 'correct' : 'wrong');
    const newScore = isCorrect ? myScore + 1 : myScore;
    setMyScore(newScore);
    const newProgress = currentProbIndex + 1;
    // Save mistake
    if (!isCorrect && user && problems[currentProbIndex]) {
      supabase.from('user_errors').insert({
        user_id: user.id, problem_id: problems[currentProbIndex].id, module_id: PVP_MODULE_ID,
        user_answer: userAnswer, correct_answer: problems[currentProbIndex].answer
      }).then(() => {});
    }
    if (duelId) {
      const updateData = isBotMatch
        ? { player1_score: newScore, player1_progress: newProgress, player1_last_seen: new Date().toISOString() }
        : (await getMyUpdateData(newScore, newProgress));
       
      await supabase.from('duels').update(updateData).eq('id', duelId);
      if (newProgress >= problems.length) {
        await supabase.rpc('finish_duel', { duel_uuid: duelId, finisher_uuid: user!.id });
        if (isBotMatch) {
           // Immediate calculation for bot
           if (newScore > oppScore) endGame('me', 25);
           else if (newScore < oppScore) endGame('opponent', -20);
           else endGame('me', 10);
        }
      }
    }
    setTimeout(() => {
      setFeedback(null);
      setCurrentProbIndex(newProgress);
      setUserAnswer('');
      if (mfRef.current) mfRef.current.setValue('');
    }, 1000);
  }
  async function getMyUpdateData(score: number, progress: number) {
    const { data } = await supabase.from('duels').select('player1_id').eq('id', duelId!).single();
    const isP1 = data?.player1_id === user?.id;
    return isP1
      ? { player1_score: score, player1_progress: progress, player1_last_seen: new Date().toISOString() }
      : { player2_score: score, player2_progress: progress, player2_last_seen: new Date().toISOString() };
  }
  const handleAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!duelId || feedback || !userAnswer.trim()) return;
    const isCorrect = checkAnswer(userAnswer, problems[currentProbIndex].answer);
    submitResult(isCorrect);
  };
  const handleTimeout = () => submitResult(false);
  // Timer
  useEffect(() => {
    let timer: any;
    if (status === 'battle' && !feedback && currentProbIndex < problems.length) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { handleTimeout(); return 60; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, feedback, currentProbIndex, problems.length]);
  useEffect(() => setTimeLeft(60), [currentProbIndex]);
  // Keypad Handlers
  const keypadProps = {
    onCommand: (cmd: string, arg?: string) => {
      if (cmd === 'insert') mfRef.current?.executeCommand(['insert', arg]);
      else mfRef.current?.executeCommand([arg]);
      mfRef.current?.focus();
    },
    onDelete: () => mfRef.current?.executeCommand(['deleteBackward']),
    onClear: () => { mfRef.current?.setValue(''); setUserAnswer(''); },
    onSubmit: () => handleAnswer()
  };
  // === End Game & Calibration Logic ===
  async function endGame(winnerId: string | null, eloChange: number = 0) {
    if (status === 'finished') return;
    setStatus('finished');
    const isWin = isBotMatch ? winnerId === 'me' : winnerId === user!.id;
    setWinner(isWin ? 'me' : 'opponent');
    setMmrChange(Math.abs(eloChange));
    // Capture old MMR for animation
    const oldMMR = profile?.mmr ?? 1000;
    setRevealOldMMR(oldMMR);
    // 1. Calibration Logic
    if (user && !profile?.has_calibrated) {
      try {
        // Вызываем запись матча
        const result = await recordCalibrationMatch(user.id, isWin, opponentMMR);
       
        // Если это был 5-й матч и калибровка завершилась
        if (result && !result.isCalibrating) {
          const finalMMR = result.provisionalMMR;
          setRevealNewMMR(finalMMR);
          setRevealRank(getPvPRank(finalMMR));
          setShowRevealModal(true);
        }
      } catch (e) { console.error("Calibration error:", e); }
    }
    // 2. XP Logic (Only if Win)
    if (isWin && user) {
      try {
        const res = await grantXp(user.id, profile?.is_premium || false, 50);
        if (res) setXpGained(res.gained);
      } catch (e) { console.error(e); }
    }
    await refreshProfile();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  }
  const confirmSurrender = async () => {
    setShowSurrenderModal(false);
    if (duelId && user) {
      await supabase.rpc('surrender_duel', { duel_uuid: duelId, surrendering_uuid: user.id });
      if (isBotMatch) endGame('opponent', -25);
    }
  };
  // Helpers
  async function loadProblems(ids: string[]) {
    if (!ids?.length) return;
    const { data } = await supabase.from('problems').select('*').in('id', ids);
    // Preserve order
    setProblems(ids.map(id => data?.find((p: any) => p.id === id)).filter(Boolean));
  }
  async function fetchOpponentData(uid: string) {
    const { data } = await supabase.from('profiles').select('username, mmr').eq('id', uid).single();
    if (data) {
      setOpponentName(data.username);
      setOpponentMMR(data.mmr || 1000);
    }
  }
  // --- RENDERING ---
  // 1. Lobby
  if (status === 'lobby') {
    const isUnranked = !!(profile && !profile.has_calibrated);
    const calibPlayed = profile?.calibration_matches_played ?? 0;

    return (
      <>
        {showRevealModal && revealRank && revealNewMMR !== null && revealOldMMR !== null && (
          <RankUpModal newRank={revealRank} oldMMR={revealOldMMR} newMMR={revealNewMMR} onClose={() => setShowRevealModal(false)} />
        )}
        
        {/* Модалка с легендой рангов */}
        {showRankLegend && <RankLegendModal onClose={() => setShowRankLegend(false)} />}

        <div className="flex items-center justify-center h-full animate-in fade-in duration-300">
          <div className="text-center space-y-8 max-w-md w-full p-8 bg-slate-800/50 rounded-2xl border border-red-500/30 shadow-2xl relative">
            
            {/* ЕДИНСТВЕННАЯ КНОПКА ИНФО В УГЛУ */}
            <button 
              onClick={() => setShowRankLegend(true)}
              className="absolute top-4 right-4 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-all border border-white/5"
              title="Инфо о рангах"
            >
              <Info className="w-5 h-5" />
            </button>

            <div className="mx-auto w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
              <Zap className="w-12 h-12 text-red-500" />
            </div>

            <div>
              <h1 className="text-4xl font-black text-white italic uppercase mb-2">PVP АРЕНА</h1>
              <p className="text-red-300/60">Битва умов в реальном времени</p>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Ваш статус</div>
              <div className="text-2xl font-bold text-white">
                {isUnranked ? (
                  <span className="text-yellow-400 flex items-center justify-center gap-2">
                    <Target className="w-5 h-5" /> Калибровка: {calibPlayed}/5
                  </span>
                ) : (
                  <>
                    {profile?.mmr} MP <span className="text-sm text-slate-500">({getPvPShortRank(profile?.mmr || 1000)})</span>
                  </>
                )}
              </div>
            </div>

            {/* КНОПКА ПОИСКА НА ВСЮ ШИРИНУ */}
            <button 
              onClick={findMatch} 
              className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-bold text-white text-xl hover:scale-[1.02] transition-transform shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 active:scale-95"
            >
              <Play className="w-6 h-6 fill-current" />
              НАЙТИ СОПЕРНИКА
            </button>

            <button onClick={onBack} className="text-slate-500 hover:text-white text-sm flex items-center justify-center gap-2 mx-auto">
              <ArrowLeft className="w-4 h-4" /> Вернуться в лабораторию
            </button>
          </div>
        </div>
      </>
    );
  }
  // 2. Searching
  if (status === 'searching') {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in">
        <Loader className="w-16 h-16 text-red-500 animate-spin" />
        <h2 className="text-2xl font-bold text-white animate-pulse">
          {initialDuelId ? 'Восстановление связи...' : 'Поиск противника...'}
        </h2>
        <button onClick={async () => {
          if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
          if (duelId && !initialDuelId) await supabase.from('duels').delete().eq('id', duelId);
          setDuelId(null);
          setStatus('lobby');
        }} className="px-6 py-2 border border-slate-600 rounded-full text-slate-400 hover:bg-slate-800">
          Отмена
        </button>
      </div>
    );
  }
  // 3. Battle (RESTORED & FIXED UI)
  if (status === 'battle') {
    const currentProb = problems[currentProbIndex];
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-900 overflow-hidden">
       
        {/* Modals & Alerts */}
        {showSurrenderModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full">
              <div className="text-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <h3 className="text-xl font-bold text-white mb-1">Сдаться?</h3>
                <p className="text-slate-400 text-sm">Вам будет засчитано поражение.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowSurrenderModal(false)} className="px-4 py-3 bg-slate-800 rounded-xl text-white">Отмена</button>
                <button onClick={confirmSurrender} className="px-4 py-3 bg-red-600 rounded-xl text-white font-bold">Сдаться</button>
              </div>
            </div>
          </div>
        )}
       
        {opponentDisconnected && !isBotMatch && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-bounce z-50">
            <WifiOff className="w-4 h-4" /> <span className="text-xs">Соперник теряет сеть...</span>
          </div>
        )}
        {/* --- STICKY TOP: SCOREBOARD --- */}
        <div className="flex-shrink-0 bg-slate-900 border-b border-slate-800 shadow-lg z-10">
         
          {/* Scoreboard */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700">
            <button onClick={() => setShowSurrenderModal(true)} className="p-1.5 text-red-500/50 hover:text-red-500 rounded-lg">
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
                 {isBotMatch ? botName : opponentName}
              </div>
              <div className="text-xl font-black text-white leading-none">{oppScore}</div>
            </div>
          </div>
          {/* Progress Bars */}
          <div className="space-y-1 px-3 py-2 bg-slate-900">
             <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${(currentProbIndex / (problems.length || 10)) * 100}%` }} />
             </div>
             <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(oppProgress / (problems.length || 10)) * 100}%` }} />
             </div>
          </div>
        </div>
        {/* --- MIDDLE: TASK (Centered & Large) --- */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-900 overflow-y-auto">
          {currentProb ? (
             <div className="w-full max-w-lg">
                {/* Карточка задачи с увеличенным шрифтом */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-6 shadow-xl text-center min-h-[150px] flex flex-col items-center justify-center">
                  <div className="text-2xl md:text-3xl font-bold text-white leading-relaxed tracking-wide">
                    {/* LaTeX рендеринг (ИСПРАВЛЕНО: добавлены $) */}
                    <Latex>{`$${currentProb.question}$`}</Latex>
                  </div>
                 
                  {/* Подсказка для типа задачи */}
                  <div className="mt-4 text-xs text-slate-500 font-mono uppercase tracking-widest">
                    Решите задачу
                  </div>
                </div>
             </div>
          ) : (
             <div className="text-white text-sm animate-pulse flex items-center gap-2">
               <Loader className="w-6 h-6 animate-spin text-cyan-400" />
               <span className="text-lg font-bold">Подготовка задания...</span>
             </div>
          )}
        </div>
        {/* --- BOTTOM: INPUT & KEYPAD --- */}
        <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 shadow-2xl z-20 pb-safe">
          {feedback ? (
            <div className={`p-8 flex flex-col items-center justify-center h-[320px] animate-in zoom-in duration-200 ${feedback === 'correct' ? 'bg-emerald-900/20' : 'bg-red-900/20'}`}>
              <div className={`text-4xl font-black mb-2 ${feedback === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                {feedback === 'correct' ? 'ВЕРНО!' : 'ОШИБКА'}
              </div>
            </div>
          ) : (
            <div className="p-2">
               <div className="mb-2 px-1">
                 <MathInput
                   value={userAnswer}
                   onChange={setUserAnswer}
                   onSubmit={handleAnswer}
                   mfRef={mfRef}
                 />
               </div>
               <MathKeypad {...keypadProps} />
            </div>
          )}
        </div>
      </div>
    );
  }
  // 4. Finished
  if (status === 'finished') {
    const isWin = winner === 'me';
    const isCalibrating = profile?.is_calibrating;
    return (
      <div className="flex items-center justify-center h-full p-4 animate-in zoom-in duration-300">
        <div className="text-center p-8 md:p-12 bg-slate-800 rounded-3xl border-2 border-slate-600 shadow-2xl max-w-lg w-full">
          {isWin ? (
            <>
              <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4 drop-shadow-lg" />
              <h1 className="text-4xl font-black text-yellow-400 mb-2">ПОБЕДА!</h1>
              {xpGained && (
                <div className="inline-flex items-center gap-2 px-4 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 font-bold mb-4">
                   <Zap className="w-4 h-4 fill-current" /> +{xpGained} XP
                </div>
              )}
              {isCalibrating ? (
                <p className="text-slate-300 font-mono mb-6">Калибровочный матч записан.</p>
              ) : (
                <p className="text-emerald-400 font-bold text-lg mb-6 animate-pulse">+ {mmrChange} MP</p>
              )}
            </>
          ) : (
            <>
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <h1 className="text-4xl font-black text-red-500 mb-2">ПОРАЖЕНИЕ</h1>
              {isCalibrating ? (
                <p className="text-slate-400 mb-6">Результат учтен в калибровке.</p>
              ) : (
                <p className="text-slate-400 mb-6">- {mmrChange} MP</p>
              )}
            </>
          )}
         
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-6">
            <div className="text-xs text-slate-500 mb-1 uppercase tracking-widest">Счет матча</div>
            <div className="flex items-center justify-center gap-4 text-3xl font-mono font-bold">
              <span className={isWin ? 'text-yellow-400' : 'text-slate-500'}>{myScore}</span>
              <span className="text-slate-600">:</span>
              <span className={!isWin ? 'text-yellow-400' : 'text-slate-500'}>{oppScore}</span>
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
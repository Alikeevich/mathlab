// src/components/PvPMode.tsx
import { useState, useEffect, useRef } from 'react';
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
  AlertTriangle
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

const BOT_UUID = 'c00d4ad6-1ed1-4195-b596-ac6960f3830a';
const PVP_MODULE_ID = '00000000-0000-0000-0000-000000000099';

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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [problems, setProblems] = useState<any[]>([]);
  const [currentProbIndex, setCurrentProbIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);

  const [userAnswer, setUserAnswer] = useState('');
  const mfRef = useRef<any>(null);

  const [winner, setWinner] = useState<'me' | 'opponent' | 'draw' | null>(null);
  const [mmrChange, setMmrChange] = useState<number | null>(null);
  const [xpGained, setXpGained] = useState<number | null>(null);

  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);

  const [botName, setBotName] = useState<string>('Bot');
  const myMMR = profile?.mmr ?? BASE_MMR;

  // For Rank reveal after calibration
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [revealOldMMR, setRevealOldMMR] = useState<number | null>(null);
  const [revealNewMMR, setRevealNewMMR] = useState<number | null>(null);
  const [revealRank, setRevealRank] = useState<PvPRank | null>(null);

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
        await supabase.from('duels').update({
          player2_score: score,
          player2_progress: progress
        }).eq('id', duelId);
      }

      if (progress >= (problems.length || 10)) {
        handleBotWin(score);
      }
    }
  });
  // botName from hook (or deterministic)
  useEffect(() => {
    if (botOpponent?.botName) setBotName(botOpponent.botName);
    else if (duelId) setBotName(getDeterministicBotName(duelId));
  }, [botOpponent, duelId]);

  const handleBotWin = async (finalBotScore: number) => {
    if (status === 'finished') return;
    if (duelId) {
      await supabase.rpc('finish_duel', { duel_uuid: duelId, finisher_uuid: BOT_UUID });
    }

    if (myScore > finalBotScore) {
      endGame('me', 25);
    } else if (myScore < finalBotScore) {
      endGame('opponent', -20);
    } else {
      endGame('opponent', -10);
    }
  };

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

  async function findMatch() {
    setStatus('searching');
    setIsBotMatch(false);

    const myMMRLocal = profile?.mmr ?? 1000;
    const range = 300;

    const { data: waitingDuel } = await supabase
      .from('duels')
      .select('*')
      .eq('status', 'waiting')
      .is('tournament_id', null)
      .neq('player1_id', user!.id)
      .gte('player1_mmr', myMMRLocal - range)
      .lte('player1_mmr', myMMRLocal + range)
      .limit(1)
      .maybeSingle();

    if (waitingDuel) {
      setDuelId(waitingDuel.id);
      await loadProblems(waitingDuel.problem_ids);
      await fetchOpponentData(waitingDuel.player1_id);
      await supabase
        .from('duels')
        .update({ player2_id: user!.id, player2_mmr: myMMRLocal, status: 'active', player2_last_seen: new Date().toISOString() })
        .eq('id', waitingDuel.id);
      startBattleSubscription(waitingDuel.id, 'player2');
      setStatus('battle');
      return;
    }

    const { data: allProbs } = await supabase.from('problems').select('id').eq('module_id', PVP_MODULE_ID);
    const shuffled = (allProbs ?? []).sort(() => 0.5 - Math.random()).slice(0, 10).map((p: any) => p.id) || [];

    const { data: newDuel } = await supabase.from('duels').insert({
      player1_id: user!.id,
      player1_mmr: myMMRLocal,
      status: 'waiting',
      last_seen: new Date().toISOString(),
      player1_last_seen: new Date().toISOString(),
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

    searchTimeoutRef.current = setTimeout(async () => {
      // No match found — use bot
      supabase.removeChannel(channel);

      const fakeBotMMR = (profile?.mmr ?? 1000) + Math.floor(Math.random() * 100 - 50);
      setOpponentMMR(fakeBotMMR);

      await supabase.from('duels').update({
        status: 'active',
        player2_id: BOT_UUID,
        player2_mmr: fakeBotMMR
      }).eq('id', newDuel.id);

      setIsBotMatch(true);
      setStatus('battle');

    }, 5000);
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

  const handleKeypadCommand = (cmd: string, arg?: string) => {
    if (!mfRef.current) return;
    const scrollY = window.scrollY;
    if (cmd === 'insert') mfRef.current.executeCommand(['insert', arg]);
    else if (cmd === 'perform') mfRef.current.executeCommand([arg]);
    if (document.activeElement !== mfRef.current) mfRef.current.focus({ preventScroll: true });
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
    const currentProb = problems[currentProbIndex];

    // Save mistake
    if (!isCorrect && user && currentProb) {
      const { error } = await supabase.from('user_errors').insert({
        user_id: user.id,
        problem_id: currentProb.id,
        module_id: PVP_MODULE_ID,
        user_answer: userAnswer,
        correct_answer: currentProb.answer
      });
      if (error) console.error('Error saving pvp mistake:', error);
    }

    if (!isBotMatch) {
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
    } else {
      await supabase.from('duels').update({
        player1_score: newScore,
        player1_progress: newProgress,
        player1_last_seen: new Date().toISOString()
      }).eq('id', duelId!);

      if (newProgress >= problems.length) {
        await supabase.rpc('finish_duel', { duel_uuid: duelId, finisher_uuid: user!.id });

        if (newScore > oppScore) {
          endGame('me', 25);
        } else if (newScore < oppScore) {
          endGame('opponent', -20);
        } else {
          endGame('me', 10);
        }
      }
    }

    setTimeout(() => {
      setFeedback(null);
      setCurrentProbIndex(newProgress);
      setUserAnswer('');
      if (mfRef.current) {
        mfRef.current.setValue('');
        setTimeout(() => { if (mfRef.current) mfRef.current.focus({ preventScroll: true }); }, 50);
      }
    }, 1000);
  }

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

  useEffect(() => {
    if (isBotMatch) return;
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
  }, [status, duelId, user, isBotMatch]);

  async function loadProblems(ids: string[]) {
    if (!ids || ids.length === 0) return;
    const { data } = await supabase.from('problems').select('*').in('id', ids);
    const sorted = ids.map(id => data?.find((p: any) => p.id === id)).filter(Boolean);
    setProblems(sorted);
  }

  async function fetchOpponentData(uid: string) {
    if (uid === BOT_UUID) return;
    const { data } = await supabase.from('profiles').select('username, mmr').eq('id', uid).single();
    if (data) {
      setOpponentName(data.username);
      setOpponentMMR(data.mmr || 1000);
    }
  }

  // === UPDATED endGame with Calibration handling (Valorant-style hidden MMR & reveal)
  async function endGame(winnerId: string, eloChange: number = 0) {
    if (status === 'finished') return;
    setStatus('finished');

    let isWin = false;
    if (isBotMatch) {
      isWin = winnerId === 'me';
    } else {
      isWin = winnerId === user!.id;
    }

    setMmrChange(Math.abs(eloChange));
    setWinner(isWin ? 'me' : 'opponent');

    // Capture old MMR before any DB update (for reveal)
    const oldMMR = profile?.mmr ?? 1000;
    setRevealOldMMR(oldMMR);

    // === Calibration recording (counts match towards 5) ===
    try {
      if (profile?.is_calibrating && user) {
        const result = await recordCalibrationMatch(user.id, isWin, opponentMMR);
        // result.provisionalMMR === finalMMR when finished (per implementation)
        if (result && result.isCalibrating === false) {
          // Calibration just finished -> show reveal modal (final MMR)
          const finalMMR = result.provisionalMMR;
          setRevealNewMMR(finalMMR);
          const r = getPvPRank(finalMMR);
          setRevealRank(r);
          setShowRevealModal(true);
        }
      }
    } catch (err) {
      console.error('Calibration error:', err);
    }

    // === XP awarding (unchanged) ===
    if (isWin && user) {
      const xpAmount = 50;
      try {
        const xpRes = await grantXp(user.id, profile?.is_premium || false, xpAmount);
        if (xpRes) setXpGained(xpRes.gained);
      } catch (err) {
        console.error('grantXp failed', err);
      }
    }

    // Refresh local profile to reflect DB changes (MMR updated if calibration finished)
    try {
      await refreshProfile();
    } catch (err) {
      console.error('refreshProfile failed', err);
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  }

  const confirmSurrender = async () => {
    setShowSurrenderModal(false);
    if (duelId && user) {
      await supabase.rpc('surrender_duel', { duel_uuid: duelId, surrendering_uuid: user.id });
      if (isBotMatch) endGame('opponent', -25);
    }
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // ---- UI Rendering ----

  // Helper for display: if user hasn't calibrated yet => hide MMR and show calibration status
  const isUnranked = !!(profile && !profile.has_calibrated);
  const calibrationPlayed = profile?.calibration_matches_played ?? 0;

  if (status === 'lobby') {
    return (
      <>
        {showRevealModal && revealRank && revealNewMMR !== null && revealOldMMR !== null && (
          <RankUpModal
            newRank={revealRank}
            oldMMR={revealOldMMR}
            newMMR={revealNewMMR}
            onClose={() => setShowRevealModal(false)}
          />
        )}

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
                {isUnranked ? (
                  <span className="text-yellow-400">Unranked — Калибровка {calibrationPlayed}/5</span>
                ) : (
                  <>
                    {profile?.mmr ?? 1000} MP{' '}
                    <span className="text-sm text-slate-500">({getPvPShortRank(profile?.mmr ?? 1000)})</span>
                  </>
                )}
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
      </>
    );
  }

  if (status === 'searching') {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <Loader className="w-16 h-16 text-red-500 animate-spin" />
        <h2 className="text-2xl font-bold text-white animate-pulse">
          {initialDuelId ? 'Восстановление связи...' : 'Поиск противника...'}
        </h2>
        <div className="text-slate-400 text-sm max-w-xs text-center">
          Желаем удачной и честной партии!
        </div>
        <button onClick={async () => {
          if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
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

  if (status === 'battle') {
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-900 overflow-hidden">
        {/* ... main battle UI unchanged (header, problems, keypad, feedback) ... */}
        {opponentDisconnected && !isBotMatch && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-bounce z-50 shadow-lg">
            <WifiOff className="w-4 h-4" />
            <span className="text-xs">Соперник теряет сеть...</span>
          </div>
        )}

        {/* (rest of the battle UI from your original file remains — header, problems etc.) */}
        {/* For brevity the detailed JSX for battle layout is unchanged; keep your existing markup here. */}

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

  if (status === 'finished') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 md:p-12 bg-slate-800 rounded-3xl border-2 border-slate-600 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-300 m-4">
          {winner === 'me' ? (
            <>
              <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4 drop-shadow-lg" />
              <h1 className="text-4xl font-black text-yellow-400 mb-2">ПОБЕДА!</h1>

              {xpGained && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 font-bold mb-4 animate-pulse">
                  <Zap className="w-4 h-4 fill-current" />
                  +{xpGained} XP
                </div>
              )}

              {opponentDisconnected && !isBotMatch ? (
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

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Latex from 'react-latex-next';
import { Zap, Loader, Trophy, XCircle, CheckCircle2, Timer, ArrowLeft } from 'lucide-react';
import { MathKeypad } from './MathKeypad';
import { checkAnswer } from '../lib/mathUtils';

type Props = {
  duelId: string;
  onFinished: () => void; // Вернуться в сетку
};

export function TournamentPlay({ duelId, onFinished }: Props) {
  const { user } = useAuth();
  
  // Состояния игры
  const [loading, setLoading] = useState(true);
  const [opponentName, setOpponentName] = useState<string>('Соперник');
  
  const [problems, setProblems] = useState<any[]>([]);
  const [currentProbIndex, setCurrentProbIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [matchStatus, setMatchStatus] = useState<'active' | 'finished'>('active');
  const [winnerId, setWinnerId] = useState<string | null>(null);

  // Клавиатура
  const handleKeyInput = (s: string) => setUserAnswer(p => p + s);
  const handleBackspace = () => setUserAnswer(p => p.slice(0, -1));

  // 1. ИНИЦИАЛИЗАЦИЯ
  useEffect(() => {
    async function initMatch() {
      if (!user) return;
      
      const { data: duel } = await supabase.from('duels').select('*').eq('id', duelId).single();
      if (!duel) {
        onFinished(); // Дуэли нет - уходим
        return;
      }

      // Если матч уже все - показываем результат
      if (duel.status === 'finished') {
        setMatchStatus('finished');
        setWinnerId(duel.winner_id);
        setMyScore(duel.player1_id === user.id ? duel.player1_score : duel.player2_score);
        setOppScore(duel.player1_id === user.id ? duel.player2_score : duel.player1_score);
        setLoading(false);
        return;
      }

      // Определяем соперника
      const isP1 = duel.player1_id === user.id;
      const oppId = isP1 ? duel.player2_id : duel.player1_id;
      
      // Грузим задачи
      await loadProblems(duel.problem_ids);
      
      // Грузим имя врага
      if (oppId) {
        const { data: oppProfile } = await supabase.from('profiles').select('username').eq('id', oppId).single();
        if (oppProfile) setOpponentName(oppProfile.username);
      } else {
        setOpponentName("Ожидание..."); // Если нечетный игрок (авто-победа)
      }

      // Восстанавливаем прогресс (Реконнект внутри боя)
      const myProg = isP1 ? duel.player1_progress : duel.player2_progress;
      const myPts = isP1 ? duel.player1_score : duel.player2_score;
      const oppPts = isP1 ? duel.player2_score : duel.player1_score;
      
      setCurrentProbIndex(myProg);
      setMyScore(myPts);
      setOppScore(oppPts);

      setLoading(false);
      
      // Подписка на врага
      subscribeToDuel(duel.id, isP1);
    }
    initMatch();
  }, [duelId]);

  // 2. ПОДПИСКА
  function subscribeToDuel(dId: string, isP1: boolean) {
    const channel = supabase
      .channel(`t-duel-${dId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${dId}` }, 
      (payload) => {
        const newData = payload.new;
        
        // Обновляем очки врага
        const newOppScore = isP1 ? newData.player2_score : newData.player1_score;
        setOppScore(newOppScore);

        // Если матч кончился
        if (newData.status === 'finished') {
          setMatchStatus('finished');
          setWinnerId(newData.winner_id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }

  // 3. ЗАГРУЗКА ЗАДАЧ
  async function loadProblems(ids: string[]) {
    if (!ids || ids.length === 0) return;
    const { data } = await supabase.from('problems').select('*').in('id', ids);
    // Сортируем в порядке ID
    const sorted = ids.map(id => data?.find(p => p.id === id)).filter(Boolean);
    setProblems(sorted);
  }

  // 4. ТАЙМЕР
  useEffect(() => {
    let timer: any;
    if (matchStatus === 'active' && !feedback && currentProbIndex < problems.length) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { handleTimeout(); return 60; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [matchStatus, feedback, currentProbIndex, problems.length]);

  useEffect(() => { setTimeLeft(60); }, [currentProbIndex]);
  const handleTimeout = () => submitResult(false);

  // 5. ОТПРАВКА ОТВЕТА
  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (feedback || userAnswer.trim() === '') return; 
    const currentProb = problems[currentProbIndex];
    const isCorrect = checkAnswer(userAnswer, currentProb.answer);
    submitResult(isCorrect);
  }

  async function submitResult(isCorrect: boolean) {
    setFeedback(isCorrect ? 'correct' : 'wrong');
    const newScore = isCorrect ? myScore + 1 : myScore;
    setMyScore(newScore);
    const newProgress = currentProbIndex + 1;

    // Отправляем в базу
    const { data: duel } = await supabase.from('duels').select('player1_id').eq('id', duelId).single();
    const isP1 = duel?.player1_id === user!.id;
    const updateData = isP1 
      ? { player1_score: newScore, player1_progress: newProgress }
      : { player2_score: newScore, player2_progress: newProgress };
    
    // Если это последний вопрос
    const isLastQuestion = newProgress >= problems.length; // Обычно 5 вопросов в турнире

    await supabase.from('duels').update(updateData).eq('id', duelId);
    
    if (isLastQuestion) {
        // Вызываем финиш (триггер сам решит кто победил и переведет раунд)
        await supabase.rpc('finish_duel', { duel_uuid: duelId, finisher_uuid: user!.id });
    }

    setTimeout(() => {
      setFeedback(null);
      setCurrentProbIndex(newProgress);
      setUserAnswer('');
    }, 1000);
  }

  // === РЕНДЕР ===

  if (loading) return <div className="flex h-full items-center justify-center"><Loader className="animate-spin text-cyan-400 w-10 h-10"/></div>;

  // ЭКРАН РЕЗУЛЬТАТА (Ждем следующего раунда)
  if (matchStatus === 'finished' || currentProbIndex >= problems.length) {
    const isWinner = winnerId === user!.id;
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-12 bg-slate-800 rounded-3xl border-2 border-slate-600 shadow-2xl max-w-lg w-full animate-in zoom-in duration-300">
          {isWinner ? (
            <>
              <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
              <h1 className="text-4xl font-black text-yellow-400 mb-4">ПОБЕДА!</h1>
              <p className="text-slate-300 mb-8">Вы проходите в следующий раунд.</p>
            </>
          ) : (
            <>
              <XCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
              <h1 className="text-4xl font-black text-red-500 mb-4">ВЫБЫВАНИЕ</h1>
              <p className="text-slate-300 mb-8">Спасибо за участие в турнире.</p>
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

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 h-full flex flex-col relative">
      
      {/* Оверлей ответа */}
      {feedback && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center rounded-3xl backdrop-blur-sm ${feedback === 'correct' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
          <div className={`p-8 rounded-full ${feedback === 'correct' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'} shadow-2xl scale-125`}>
            {feedback === 'correct' ? <CheckCircle2 className="w-16 h-16" /> : <XCircle className="w-16 h-16" />}
          </div>
        </div>
      )}

      {/* Шапка */}
      <div className="flex items-center justify-between mb-6 bg-slate-900/80 p-4 rounded-xl border border-slate-700">
        <div className="text-right">
          <div className="text-cyan-400 font-bold text-lg">ВЫ</div>
          <div className="text-3xl font-black text-white">{myScore}</div>
        </div>
        <div className="flex flex-col items-center">
            <div className="text-slate-500 font-mono text-xs mb-1">ВРЕМЯ</div>
            <div className={`flex items-center gap-1 font-mono font-bold text-xl ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              <Timer className="w-4 h-4" /> {timeLeft}
            </div>
        </div>
        <div className="text-left">
          <div className="text-red-400 font-bold text-lg">{opponentName}</div>
          <div className="text-3xl font-black text-white">{oppScore}</div>
        </div>
      </div>

      {/* Задача */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div className="text-slate-400 text-sm font-mono">ВОПРОС {currentProbIndex + 1} / {problems.length}</div>
            </div>
            
            {currentProb && (
              <h2 className="text-3xl font-bold text-white mb-8 leading-relaxed">
                <Latex>{currentProb.question}</Latex>
              </h2>
            )}
            
            <form onSubmit={handleAnswer} className="flex flex-col gap-4">
              <div className="flex gap-3">
                <input 
                  autoFocus
                  type="text" 
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  disabled={!!feedback}
                  className="w-full flex-1 bg-slate-900 border border-slate-600 rounded-xl px-6 py-4 text-xl text-white outline-none focus:border-cyan-500 font-mono"
                  placeholder="Ответ..."
                />
                <button 
                  type="submit" 
                  disabled={!!feedback || userAnswer.trim() === ''}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold text-xl"
                >
                  GO
                </button>
              </div>
              <MathKeypad onKeyPress={handleKeyInput} onBackspace={handleBackspace} />
            </form>
        </div>
      </div>
    </div>
  );
}
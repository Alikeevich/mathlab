import { useState, useEffect, useRef } from 'react';
// ... старые импорты (оставь Module, supabase, useAuth и т.д.)
import { Module } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { checkAnswer } from '../lib/mathUtils';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Loader,
  MessageSquare,
  AlertCircle,
  Lock
} from 'lucide-react';
import { CompanionChat } from './CompanionChat';

// === НОВЫЕ ИМПОРТЫ ===
import { MathInput } from './MathInput';
import { MathKeypad } from './MathKeypad';

// ... (тип Problem и ReactorProps оставляем без изменений)
type Problem = {
  id: string;
  question: string;
  answer: string;
  type: string;
  hint?: string;
  image_url?: string;
};

type ReactorProps = {
  module: Module;
  onBack: () => void;
  onRequestAuth?: () => void;
};

export function Reactor({ module, onBack, onRequestAuth }: ReactorProps) {
  // ... (хуки остаются)
  const { user, profile, refreshProfile } = useAuth();
  
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  
  const [userAnswer, setUserAnswer] = useState('');
  const mfRef = useRef<any>(null); // Реф на MathLive

  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [problemsSolved, setProblemsSolved] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  
  const GUEST_LIMIT = 3;
  const [showPaywall, setShowPaywall] = useState(false);

  // ... (useEffect для загрузки задач остается)
  useEffect(() => {
    async function fetchProblems() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('problems')
          .select('*')
          .eq('module_id', module.id);
        
        if (data && data.length > 0) {
          const shuffled = data.sort(() => 0.5 - Math.random());
          setProblems(shuffled);
          setCurrentProblem(shuffled[0]);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProblems();
  }, [module.id]);

  function loadNextProblem() {
    if (!user && problemsSolved >= GUEST_LIMIT) {
      setShowPaywall(true);
      return;
    }
    if (problems.length === 0) return;
    const randomProblem = problems[Math.floor(Math.random() * problems.length)];
    
    setCurrentProblem(randomProblem);
    setResult(null);
    setShowHint(false);
    setStartTime(Date.now());
    
    // Очистка поля
    setUserAnswer('');
    if (mfRef.current) {
      mfRef.current.setValue('');
      setTimeout(() => mfRef.current.focus(), 50);
    }
  }

  // === НОВОЕ УПРАВЛЕНИЕ MATHLIVE ===
  const handleKeypadCommand = (cmd: string, arg?: string) => {
    if (!mfRef.current) return;
    
    if (cmd === 'insert') {
      mfRef.current.executeCommand(['insert', arg]);
    } else if (cmd === 'perform') {
      mfRef.current.executeCommand([arg]);
    }
    mfRef.current.focus();
  };

  const handleKeypadDelete = () => {
    if (!mfRef.current) return;
    mfRef.current.executeCommand(['deleteBackward']);
    mfRef.current.focus();
  };

  const handleKeypadClear = () => {
    if (!mfRef.current) return;
    mfRef.current.setValue('');
    setUserAnswer('');
    mfRef.current.focus();
  };

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!currentProblem) return;

    // ВАЖНО: MathLive выдает очень чистый LaTeX, парсер его поймет
    const isCorrect = checkAnswer(userAnswer, currentProblem.answer);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    setResult(isCorrect ? 'correct' : 'incorrect');
    setProblemsSolved(prev => prev + 1);
    if (isCorrect) setCorrectCount(prev => prev + 1);

    if (user) {
      await supabase.from('experiments').insert({
        user_id: user.id,
        module_id: module.id,
        problem_id: currentProblem.id, 
        problem_type: currentProblem.type,
        correct: isCorrect,
        time_spent: timeSpent,
      });

      if (isCorrect) {
        setTimeout(() => refreshProfile(), 100);
        // ... (логика прогресса остается такая же, как была) ...
        const { data: progressData } = await supabase.from('user_progress').select('*').eq('user_id', user.id).eq('module_id', module.id).maybeSingle();
        const newExperiments = (progressData?.experiments_completed ?? 0) + 1;
        const newPercentage = Math.min(newExperiments * 10, 100);
        if (progressData) {
          await supabase.from('user_progress').update({ experiments_completed: newExperiments, completion_percentage: newPercentage }).eq('id', progressData.id);
        } else {
          await supabase.from('user_progress').insert({ user_id: user.id, module_id: module.id, experiments_completed: 1, completion_percentage: 10 });
        }
      }
    }

    setTimeout(() => {
      loadNextProblem();
    }, 2000);
  }

  const successRate = problemsSolved > 0 ? ((correctCount / problemsSolved) * 100).toFixed(0) : 0;

  if (loading) return <div className="flex h-full items-center justify-center"><Loader className="animate-spin text-cyan-400 w-10 h-10"/></div>;

  // ... (код Paywall тот же)
  if (showPaywall) {
     return (/*... код блокировки тот же ... */ <div className="p-8 text-white text-center">Лимит исчерпан</div>);
  }

  return (
    <div className="w-full h-full overflow-y-auto pb-20 custom-scrollbar">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        
        {/* Шапка (оставляем как было) */}
        <div className="flex justify-between items-center mb-6 md:mb-8">
           <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors group px-3 py-2 rounded-lg hover:bg-slate-800">
             <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
             <span className="font-bold">Назад</span>
           </button>
           {!user && <div className="text-amber-400 text-xs font-mono">ДЕМО: {problemsSolved}/{GUEST_LIMIT}</div>}
        </div>

        {/* ... Блок заголовка и статистики (оставляем) ... */}
        
        {currentProblem ? (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-2xl p-4 md:p-8 mb-6 relative overflow-hidden shadow-2xl">
            {/* ... Картинка и Вопрос ... */}
            <div className="mb-8 relative z-10">
               {currentProblem.image_url && <img src={currentProblem.image_url} className="max-h-48 rounded mx-auto mb-4"/>}
               <h2 className="text-xl md:text-2xl font-semibold text-white mb-4 leading-relaxed">
                 <Latex>{currentProblem.question}</Latex>
               </h2>
            </div>

            {/* ЗОНА РЕШЕНИЯ */}
            {result === null ? (
              <div className="relative z-10">
                <div className="mb-4">
                  <label className="block text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
                    Ввод решения
                  </label>
                  
                  {/* === MATHLIVE INPUT === */}
                  <MathInput 
                    value={userAnswer}
                    onChange={setUserAnswer}
                    onSubmit={() => handleSubmit()}
                    mfRef={mfRef}
                  />
                </div>

                {/* === KEYPAD === */}
                <MathKeypad 
                  onCommand={handleKeypadCommand} 
                  onDelete={handleKeypadDelete}
                  onClear={handleKeypadClear}
                  onSubmit={() => handleSubmit()}
                />

                {/* Кнопки помощи */}
                <div className="flex justify-end gap-3 pt-2">
                    {user && profile?.companion_name && (
                      <button type="button" onClick={() => setShowChat(true)} className="px-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-500/20">
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    )}
                    {!showHint && currentProblem.hint && (
                      <button type="button" onClick={() => setShowHint(true)} className="px-5 bg-slate-700 hover:bg-slate-600 text-cyan-400 font-bold rounded-xl">?</button>
                    )}
                </div>
                
                {showHint && currentProblem.hint && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mt-4 text-blue-300 text-sm">
                    <Latex>{currentProblem.hint}</Latex>
                  </div>
                )}
              </div>
            ) : (
              // ЗОНА РЕЗУЛЬТАТА
              <div className={`p-6 rounded-2xl border-2 flex items-center gap-4 ${result === 'correct' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
                {result === 'correct' ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <XCircle className="w-8 h-8 text-red-400" />}
                <div>
                  <div className={`text-xl font-bold ${result === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result === 'correct' ? 'Верно!' : 'Ошибка'}
                  </div>
                  {result === 'incorrect' && (
                    <div className="text-slate-300 text-sm mt-1">
                      Ответ: <span className="font-mono font-bold text-white bg-slate-700 px-2 py-0.5 rounded"><Latex>{`$${currentProblem.answer}$`}</Latex></span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500">Задачи закончились</div>
        )}
      </div>

      {showChat && currentProblem && (
         <CompanionChat onClose={() => setShowChat(false)} problemContext={currentProblem.question} />
      )}
    </div>
  );
}
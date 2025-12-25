import { useState, useEffect, useRef } from 'react';
import { Module } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Latex from 'react-latex-next';
import { checkAnswer } from '../lib/mathUtils';
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
import { MathInput } from './MathInput';
import { MathKeypad } from './MathKeypad';

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
  const { user, refreshProfile } = useAuth();
  
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  
  const [userAnswer, setUserAnswer] = useState('');
  const mfRef = useRef<any>(null);

  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [problemsSolved, setProblemsSolved] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const GUEST_LIMIT = 3;
  const [showPaywall, setShowPaywall] = useState(false);

  // === 1. ЗАГРУЗКА ===
  useEffect(() => {
    async function fetchProblems() {
      setLoading(true);
      try {
        const { data } = await supabase.from('problems').select('*').eq('module_id', module.id);
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

  // === 2. ЛОГИКА ===
  function loadNextProblem() {
    if (!user && problemsSolved >= GUEST_LIMIT) { setShowPaywall(true); return; }
    if (problems.length === 0) return;
    
    const randomProblem = problems[Math.floor(Math.random() * problems.length)];
    setCurrentProblem(randomProblem);
    setResult(null);
    setShowHint(false);
    setStartTime(Date.now());
    
    setUserAnswer('');
    if (mfRef.current) {
      mfRef.current.setValue('');
      // Легкий фокус без скролла
      setTimeout(() => { if (mfRef.current) mfRef.current.focus({ preventScroll: true }); }, 50);
    }
  }

  const handleKeypadCommand = (cmd: string, arg?: string) => {
    if (!mfRef.current) return;
    if (document.activeElement !== mfRef.current) mfRef.current.focus({ preventScroll: true });
    
    if (cmd === 'insert') mfRef.current.executeCommand(['insert', arg]);
    else if (cmd === 'perform') mfRef.current.executeCommand([arg]);
  };

  const handleKeypadDelete = () => {
    if (!mfRef.current) return;
    if (document.activeElement !== mfRef.current) mfRef.current.focus({ preventScroll: true });
    mfRef.current.executeCommand(['deleteBackward']);
  };

  const handleKeypadClear = () => {
    if (!mfRef.current) return;
    mfRef.current.setValue('');
    setUserAnswer('');
    mfRef.current.focus({ preventScroll: true });
  };

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!currentProblem) return;

    const isCorrect = checkAnswer(userAnswer, currentProblem.answer);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    setResult(isCorrect ? 'correct' : 'incorrect');
    setProblemsSolved(prev => prev + 1);
    if (isCorrect) setCorrectCount(prev => prev + 1);

    if (user) {
      await supabase.from('experiments').insert({
        user_id: user.id, module_id: module.id, problem_id: currentProblem.id, problem_type: currentProblem.type, correct: isCorrect, time_spent: timeSpent,
      });
      if (isCorrect) {
        setTimeout(() => refreshProfile(), 100);
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
    setTimeout(() => { loadNextProblem(); }, 2000);
  }

  const successRate = problemsSolved > 0 ? ((correctCount / problemsSolved) * 100).toFixed(0) : 0;

  if (loading) return <div className="flex h-full items-center justify-center"><Loader className="animate-spin text-cyan-400 w-10 h-10"/></div>;

  if (showPaywall) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center animate-in zoom-in duration-300">
        <div className="bg-slate-800 border border-amber-500/30 p-8 rounded-3xl max-w-md shadow-2xl">
          <Lock className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Демо-режим завершен</h2>
          <p className="text-slate-400 mb-8">Создайте аккаунт для продолжения.</p>
          <button onClick={onRequestAuth} className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl">Создать аккаунт</button>
          <button onClick={onBack} className="mt-4 text-slate-500 hover:text-white text-sm">Вернуться</button>
        </div>
      </div>
    );
  }

  return (
    // === НОВАЯ ВЕРСТКА: FLEX COLUMN НА ВСЮ ВЫСОТУ (100dvh) ===
    // Это предотвращает скролл всей страницы и дерганье
    <div className="flex flex-col h-[100dvh] bg-slate-900 overflow-hidden">
      
      {/* 1. ВЕРХНЯЯ ЧАСТЬ (СКРОЛЛИТСЯ) - Задача и инфо */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-0">
        
        {/* Хедер */}
        <div className="flex justify-between items-center mb-4">
           <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 font-bold text-sm bg-slate-800/50 px-3 py-2 rounded-lg hover:bg-slate-800">
             <ArrowLeft className="w-4 h-4" /> Назад
           </button>
           {!user && <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-[10px] font-bold font-mono">ДЕМО: {problemsSolved}/{GUEST_LIMIT}</div>}
        </div>

        {/* Инфо о модуле */}
        <div className="flex items-center gap-2 mb-4 opacity-80">
           <div className="w-1 h-4 bg-cyan-500 rounded-full" />
           <span className="text-cyan-300 text-xs uppercase font-bold tracking-wider truncate">{module.name}</span>
        </div>

        {/* Статистика (Компактная) */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-2 text-center">
            <div className="text-cyan-400/60 text-[10px] uppercase">Всего</div>
            <div className="text-lg font-bold text-white">{problemsSolved}</div>
          </div>
          <div className="bg-slate-800/50 border border-emerald-500/20 rounded-lg p-2 text-center">
            <div className="text-emerald-400/60 text-[10px] uppercase">Верно</div>
            <div className="text-lg font-bold text-white">{correctCount}</div>
          </div>
          <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-2 text-center">
            <div className="text-purple-400/60 text-[10px] uppercase">КПД</div>
            <div className="text-lg font-bold text-white">{successRate}%</div>
          </div>
        </div>

        {currentProblem ? (
          // БЛОК ЗАДАЧИ
          <div className="bg-slate-800/40 border border-cyan-500/20 rounded-xl p-4 md:p-6 mb-4 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 opacity-70">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span className="text-cyan-400 font-mono text-[10px] font-bold">АКТИВНАЯ ЗАДАЧА</span>
            </div>

            <div className="mb-2 relative z-10">
              {currentProblem.image_url && (
                <div className="mb-4 flex justify-center">
                  <img src={currentProblem.image_url} alt="Problem" className="max-h-40 md:max-h-56 rounded border border-cyan-500/30 bg-white/5 object-contain"/>
                </div>
              )}
              <div className="text-lg md:text-xl font-medium text-white leading-relaxed">
                <Latex>{currentProblem.question}</Latex>
              </div>
            </div>
            
            {showHint && currentProblem.hint && (
               <div className="mt-4 pt-4 border-t border-slate-700/50 animate-in fade-in">
                 <div className="text-blue-300 text-sm flex gap-2 items-start bg-blue-500/10 p-3 rounded-lg">
                   <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                   <span><Latex>{currentProblem.hint}</Latex></span>
                 </div>
               </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500">Задачи закончились</div>
        )}
      </div>

      {/* 2. НИЖНЯЯ ЧАСТЬ (ФИКСИРОВАННАЯ) - Ввод и Клава */}
      {/* z-index высокий, чтобы перекрывать контент. shrink-0 запрещает сжиматься. */}
      <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 z-50">
        
        {/* Зона результата (перекрывает ввод если ответил) */}
        {result ? (
           <div className={`p-6 flex items-center justify-center gap-4 animate-in zoom-in duration-300 min-h-[300px] ${result === 'correct' ? 'bg-emerald-900/20' : 'bg-red-900/20'}`}>
              <div className="text-center">
                <div className={`text-2xl font-black mb-2 ${result === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result === 'correct' ? 'ВЕРНО!' : 'ОШИБКА'}
                </div>
                {result === 'incorrect' && (
                  <div className="text-slate-300 text-sm bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700">
                    Ответ: <Latex>{`$${currentProblem?.answer}$`}</Latex>
                  </div>
                )}
                <div className="mt-4 text-xs text-slate-500 uppercase tracking-widest animate-pulse">Загрузка следующей...</div>
              </div>
           </div>
        ) : (
           // ЗОНА ВВОДА И КЛАВИАТУРЫ
           <div className="p-2 pb-safe"> {/* pb-safe учитывает полоску iPhone */}
              
              {/* Поле ввода и кнопки помощи в одном ряду */}
              <div className="flex gap-2 mb-2 items-center px-1">
                 <div className="flex-1">
                    <MathInput 
                      value={userAnswer}
                      onChange={setUserAnswer}
                      onSubmit={() => handleSubmit()}
                      mfRef={mfRef}
                    />
                 </div>
                 
                 {/* Кнопки помощи (компактные) */}
                 <div className="flex gap-1">
                    {!showHint && currentProblem?.hint && (
                      <button onClick={() => setShowHint(true)} className="w-10 h-[60px] bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-xl border border-slate-700 flex items-center justify-center">
                        ?
                      </button>
                    )}
                    {user && (
                      <button onClick={() => setShowChat(true)} className="w-10 h-[60px] bg-amber-900/20 border border-amber-500/30 text-amber-400 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    )}
                 </div>
              </div>

              {/* Клавиатура */}
              <MathKeypad 
                onCommand={handleKeypadCommand} 
                onDelete={handleKeypadDelete}
                onClear={handleKeypadClear}
                onSubmit={() => handleSubmit()}
              />
           </div>
        )}
      </div>

      {showChat && currentProblem && (
         <CompanionChat onClose={() => setShowChat(false)} problemContext={currentProblem.question} />
      )}
    </div>
  );
}
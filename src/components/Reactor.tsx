import { useState, useEffect } from 'react';
import { Module } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Latex from 'react-latex-next';
import { checkAnswer } from '../lib/mathUtils';
import 'katex/dist/katex.min.css';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Loader,
  MessageSquare,
  Lock // Иконка замка
} from 'lucide-react';
import { MathKeypad } from './MathKeypad';
import { CompanionChat } from './CompanionChat';

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
  onRequestAuth?: () => void; // Проп для вызова регистрации
};

export function Reactor({ module, onBack, onRequestAuth }: ReactorProps) {
  const { user, profile, refreshProfile } = useAuth();
  
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showHint, setShowHint] = useState(false);
  
  const [startTime, setStartTime] = useState(Date.now());
  const [problemsSolved, setProblemsSolved] = useState(0); // Счетчик за сессию
  const [correctCount, setCorrectCount] = useState(0);

  // === ГОСТЕВОЙ ЛИМИТ ===
  const GUEST_LIMIT = 3;
  const [showPaywall, setShowPaywall] = useState(false);

  const handleKeyInput = (symbol: string) => {
    setUserAnswer((prev) => prev + symbol);
  };

  const handleBackspace = () => {
    setUserAnswer((prev) => prev.slice(0, -1));
  };

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
    // ЕСЛИ ГОСТЬ И ЛИМИТ ИСЧЕРПАН
    if (!user && problemsSolved >= GUEST_LIMIT) {
      setShowPaywall(true);
      return;
    }

    if (problems.length === 0) return;
    const randomProblem = problems[Math.floor(Math.random() * problems.length)];
    setCurrentProblem(randomProblem);
    setUserAnswer('');
    setResult(null);
    setShowHint(false);
    setStartTime(Date.now());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentProblem) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const isCorrect = checkAnswer(userAnswer, currentProblem.answer);

    setResult(isCorrect ? 'correct' : 'incorrect');
    setProblemsSolved(prev => prev + 1); // Увеличиваем счетчик сессии
    if (isCorrect) setCorrectCount(prev => prev + 1);

    // СОХРАНЯЕМ В БАЗУ ТОЛЬКО ЕСЛИ ЮЗЕР ЗАЛОГИНЕН
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

  // === ЭКРАН БЛОКИРОВКИ (PAYWALL) ===
  if (showPaywall) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center animate-in zoom-in duration-300">
        <div className="bg-slate-800 border border-amber-500/30 p-8 rounded-3xl max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-orange-600" />
          
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-amber-500/50">
            <Lock className="w-10 h-10 text-amber-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">Демо-режим завершен</h2>
          <p className="text-slate-400 mb-8">
            Вы решили {GUEST_LIMIT} задачи! Чтобы продолжить обучение, сохранять прогресс и открыть PvP — нужно создать аккаунт. Это бесплатно.
          </p>

          <button 
            onClick={onRequestAuth}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
          >
            Создать аккаунт
          </button>
          
          <button onClick={onBack} className="mt-4 text-slate-500 hover:text-white text-sm">
            Вернуться в меню
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto pb-20">
      <div className="max-w-4xl mx-auto p-8">
        
        {/* Шапка с кнопкой назад и счетчиком демо */}
        <div className="flex justify-between items-center mb-8">
           <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors group">
             <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
             <span>Назад</span>
           </button>

           {!user && (
             <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold font-mono">
               ДЕМО: {problemsSolved}/{GUEST_LIMIT}
             </div>
           )}
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg animate-pulse">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Реактор</h1>
          </div>
          <p className="text-cyan-300/60 font-mono text-sm uppercase tracking-wider">
            Модуль: {module.name}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-4">
            <div className="text-cyan-400/60 text-sm mb-1">Опытов</div>
            <div className="text-2xl font-bold text-white">{problemsSolved}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/30 rounded-xl p-4">
            <div className="text-emerald-400/60 text-sm mb-1">Успех</div>
            <div className="text-2xl font-bold text-white">{correctCount}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
            <div className="text-purple-400/60 text-sm mb-1">КПД</div>
            <div className="text-2xl font-bold text-white">{successRate}%</div>
          </div>
        </div>

        {currentProblem ? (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-2xl p-8 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="flex items-center gap-2 mb-6 relative z-10">
              <Clock className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-400 font-mono text-sm">СТАТУС: АКТИВЕН</span>
            </div>

            <div className="mb-8 relative z-10">
              {currentProblem.image_url && (
                <div className="mb-6 flex justify-center">
                  <img src={currentProblem.image_url} alt="График" className="max-h-64 rounded-lg border border-cyan-500/30 shadow-lg"/>
                </div>
              )}
              <h2 className="text-2xl font-semibold text-white mb-4 leading-relaxed">
                <Latex>{currentProblem.question}</Latex>
              </h2>
            </div>

            {result === null ? (
              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                <div>
                  <label className="block text-cyan-300 text-sm font-medium mb-2">Ввод данных</label>
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/80 border border-cyan-500/30 rounded-lg text-white text-lg focus:outline-none focus:border-cyan-400 font-mono"
                    placeholder="Ответ..."
                    autoFocus
                  />
                </div>

                <MathKeypad onKeyPress={handleKeyInput} onBackspace={handleBackspace} />

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={!userAnswer.trim()} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-lg transition-all">
                    Ответить
                  </button>

                  {/* Чат суриката - только для зарегистрированных */}
                  {user && profile?.companion_name && (
                    <button type="button" onClick={() => setShowChat(true)} className="px-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 py-3 rounded-lg flex items-center justify-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      <span className="hidden sm:inline">Помощь</span>
                    </button>
                  )}

                  {!showHint && currentProblem.hint && (
                    <button type="button" onClick={() => setShowHint(true)} className="px-6 bg-slate-700/50 hover:bg-slate-700 text-cyan-400 font-medium py-3 rounded-lg">?</button>
                  )}
                </div>
                
                {showHint && currentProblem.hint && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                    <div className="text-blue-300/80 text-sm"><Latex>{currentProblem.hint}</Latex></div>
                  </div>
                )}
              </form>
            ) : (
              <div className={`p-6 rounded-xl border-2 ${result === 'correct' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
                <div className="flex items-center gap-4">
                  {result === 'correct' ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <div className="text-xl font-bold text-emerald-400">Верно!</div>
                    </>
                  ) : (
                    <>
                       <XCircle className="w-8 h-8 text-red-400" />
                       <div>
                        <div className="text-xl font-bold text-red-400">Ошибка</div>
                        <div className="text-red-300/60 text-sm mt-1">Ответ: <span className="font-mono font-bold"><Latex>{`$${currentProblem.answer}$`}</Latex></span></div>
                       </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">Нет задач</div>
        )}
      </div>

      {showChat && currentProblem && (
         <CompanionChat onClose={() => setShowChat(false)} problemContext={currentProblem.question} />
      )}
    </div>
  );
}
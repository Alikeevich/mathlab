import { useState, useEffect } from 'react';
import { Module } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Loader
} from 'lucide-react';
// Импортируем нашу клавиатуру
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
};

export function Reactor({ module, onBack }: ReactorProps) {
  const { user, profile } = useAuth();
  
  // Состояния
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showHint, setShowHint] = useState(false);
  
  // Статистика сессии
  const [startTime, setStartTime] = useState(Date.now());
  const [problemsSolved, setProblemsSolved] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // === ФУНКЦИИ КЛАВИАТУРЫ ===
  const handleKeyInput = (symbol: string) => {
    setUserAnswer((prev) => prev + symbol);
  };

  const handleBackspace = () => {
    setUserAnswer((prev) => prev.slice(0, -1));
  };

  // Загрузка задач
  useEffect(() => {
    async function fetchProblems() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('problems')
          .select('*')
          .eq('module_id', module.id);

        if (error) {
          console.error('Ошибка:', error);
          return;
        }

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
    if (problems.length === 0) return;
    const randomProblem = problems[Math.floor(Math.random() * problems.length)];
    setCurrentProblem(randomProblem);
    setUserAnswer('');
    setResult(null);
    setShowHint(false);
    setStartTime(Date.now());
  }

  function normalizeAnswer(answer: string): string {
    return answer.toLowerCase().replace(/\s+/g, '').replace(',', '.');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentProblem || !user) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(currentProblem.answer);

    setResult(isCorrect ? 'correct' : 'incorrect');

    // 1. ОТПРАВЛЯЕМ В БАЗУ
    // SQL-триггер сам начислит XP (если не гринд) и пересчитает точность
    await supabase.from('experiments').insert({
      user_id: user.id,
      module_id: module.id,
      problem_id: currentProblem.id, 
      problem_type: currentProblem.type,
      correct: isCorrect,
      time_spent: timeSpent,
    });

    // 2. Локальная статистика (для красивых цифр прямо сейчас)
    setProblemsSolved(prev => prev + 1);
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }

    // ВАЖНО: Мы убрали ручное обновление profiles (total_experiments), 
    // потому что это теперь делает База Данных автоматически.

    // 3. Обновляем прогресс МОДУЛЯ (Полоска конкретной темы)
    if (isCorrect) {
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('module_id', module.id)
          .maybeSingle();

       const newExperiments = (progressData?.experiments_completed ?? 0) + 1;
       const newPercentage = Math.min(newExperiments * 10, 100);

       if (progressData) {
         await supabase.from('user_progress').update({
             experiments_completed: newExperiments,
             completion_percentage: newPercentage,
             last_accessed: new Date().toISOString(),
           }).eq('id', progressData.id);
       } else {
         await supabase.from('user_progress').insert({
           user_id: user.id,
           module_id: module.id,
           experiments_completed: 1,
           completion_percentage: 10,
         });
       }
    }

    setTimeout(() => {
      loadNextProblem();
    }, 2000);
  }

  // Расчет локального КПД для отображения
  const successRate = problemsSolved > 0 ? ((correctCount / problemsSolved) * 100).toFixed(0) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-cyan-400 flex flex-col items-center gap-4">
          <Loader className="w-10 h-10 animate-spin" />
          <span className="font-mono animate-pulse">Инициализация реактора...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto pb-20">
      <div className="max-w-4xl mx-auto p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Прервать эксперимент</span>
        </button>

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
            <div className="text-purple-400/60 text-sm mb-1">КПД (Сессия)</div>
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
                  <img 
                    src={currentProblem.image_url} 
                    alt="График к задаче" 
                    className="max-h-64 rounded-lg border border-cyan-500/30 shadow-lg"
                  />
                </div>
              )}

              <h2 className="text-2xl font-semibold text-white mb-4 leading-relaxed">
                <Latex>{currentProblem.question}</Latex>
              </h2>
            </div>

            {result === null ? (
              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                <div>
                  <label className="block text-cyan-300 text-sm font-medium mb-2">
                    Ввод данных
                  </label>
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/80 border border-cyan-500/30 rounded-lg text-white text-lg placeholder-cyan-300/30 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all font-mono"
                    placeholder="Ответ..."
                    autoFocus
                  />
                </div>

                <MathKeypad onKeyPress={handleKeyInput} onBackspace={handleBackspace} />

                {showHint && currentProblem.hint && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-blue-400 font-semibold text-sm mb-1">Данные разведки</div>
                      <div className="text-blue-300/80 text-sm">
                         <Latex>{currentProblem.hint}</Latex>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!userAnswer.trim()}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                  >
                    Синтезировать ответ
                  </button>
                  {!showHint && currentProblem.hint && (
                    <button
                      type="button"
                      onClick={() => setShowHint(true)}
                      className="px-6 bg-slate-700/50 hover:bg-slate-700 text-cyan-400 font-medium py-3 rounded-lg transition-all border border-cyan-500/20"
                    >
                      ?
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div
                className={`p-6 rounded-xl border-2 animate-in zoom-in-95 duration-200 ${
                  result === 'correct'
                    ? 'bg-emerald-500/10 border-emerald-500/50'
                    : 'bg-red-500/10 border-red-500/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {result === 'correct' ? (
                    <>
                      <div className="bg-emerald-500/20 p-2 rounded-full">
                         <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-emerald-400">
                          Синтез успешен!
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                       <div className="bg-red-500/20 p-2 rounded-full">
                        <XCircle className="w-8 h-8 text-red-400" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-red-400">
                          Ошибка вычислений
                        </div>
                        <div className="text-red-300/60 text-sm mt-1">
                          Верное значение: <span className="font-mono font-bold">{currentProblem.answer}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-dashed border-cyan-500/30">
            <Zap className="w-12 h-12 text-cyan-400/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Нет данных</h3>
            <p className="text-cyan-300/40">
              В этом секторе пока нет задач.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
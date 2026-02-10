import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Latex from 'react-latex-next';
import { 
  BookOpen, 
  CheckCircle, 
  ChevronRight, 
  Loader, 
  RefreshCcw, 
  Trash2, 
  ClipboardList,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';

// Типы данных
type ErrorRecord = {
  id: string;
  user_answer: string;
  correct_answer: string;
  created_at: string;
  problem: {
    id: string;
    question: string;
    hint: string | null;
  };
  module: {
    id: string;
    name: string;
    theory_content: string | null; // Теория из модуля
  };
};

type GroupedErrors = {
  [moduleName: string]: ErrorRecord[];
};

export function ErrorAnalyzer({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ID ошибки, для которой сейчас развернута теория
  const [expandedTheoryId, setExpandedTheoryId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadErrors();
  }, [user]);

  async function loadErrors() {
    setLoading(true);
    // Запрашиваем ошибки + данные задачи + теорию модуля
    const { data } = await supabase
      .from('user_errors')
      .select(`
        id, user_answer, correct_answer, created_at,
        problem:problems (id, question, hint),
        module:modules (id, name, theory_content)
      `)
      .eq('user_id', user!.id)
      .gt('expires_at', new Date().toISOString()) // Только актуальные (48ч)
      .order('created_at', { ascending: false });

    if (data) {
      // @ts-ignore: Supabase types mapping helper
      setErrors(data);
    }
    setLoading(false);
  }

  // Группировка ошибок по модулям для статистики
  const groupedErrors: GroupedErrors = errors.reduce((acc, err) => {
    const modName = err.module.name;
    if (!acc[modName]) acc[modName] = [];
    acc[modName].push(err);
    return acc;
  }, {} as GroupedErrors);

  const dismissError = async (id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
    await supabase.from('user_errors').delete().eq('id', id);
  };

  const toggleTheory = (id: string) => {
    setExpandedTheoryId(prev => prev === id ? null : id);
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center bg-slate-900">
      <Loader className="w-10 h-10 text-cyan-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-full bg-slate-900 p-4 md:p-8 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180" /> Назад
        </button>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-8 h-8 text-cyan-500" />
          Работа над ошибками
        </h1>
      </div>

      {errors.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-3xl animate-in zoom-in duration-300">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Журнал чист!</h2>
          <p className="text-slate-400">За последние 48 часов ошибок не зафиксировано.</p>
          <p className="text-slate-500 text-sm mt-2">Продолжайте обучение в Реакторе или PvP.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Сводка (Dashboard) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Статистика по темам */}
            <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
              <h3 className="text-slate-400 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Проблемные зоны
              </h3>
              <div className="space-y-3">
                {Object.entries(groupedErrors)
                  .sort(([,a], [,b]) => b.length - a.length)
                  .map(([modName, modErrors]) => (
                  <div key={modName} className="flex justify-between items-center">
                    <span className="text-white font-medium truncate pr-2 text-sm">{modName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="h-1.5 w-16 md:w-24 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500" 
                          style={{ width: `${Math.min((modErrors.length / errors.length) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-amber-400 font-mono font-bold text-xs">{modErrors.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Большая кнопка действия */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 rounded-2xl flex flex-col justify-center items-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none" />
              <div className="text-4xl font-black text-white mb-1 relative z-10">{errors.length}</div>
              <div className="text-slate-400 text-sm mb-4 relative z-10">Ошибок к исправлению</div>
              <button 
                onClick={() => alert("Функция 'Массовая тренировка' в разработке. Пожалуйста, разберите ошибки вручную ниже.")}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-cyan-900/20 relative z-10"
              >
                <RefreshCcw className="w-5 h-5" />
                Тренировка
              </button>
            </div>
          </div>

          {/* Детальный список */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white px-1 uppercase tracking-wide text-slate-400 text-xs">Детальный разбор</h2>
            {errors.map((err) => (
              <div key={err.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 relative transition-all hover:border-slate-600">
                
                {/* Header карточки */}
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-slate-900 px-3 py-1 rounded-lg text-[10px] text-cyan-400 font-bold font-mono border border-slate-700 uppercase tracking-wide">
                    {err.module.name}
                  </div>
                  <button 
                    onClick={() => dismissError(err.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1"
                    title="Удалить из списка"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Задача */}
                <div className="mb-4 text-base md:text-lg text-white font-medium leading-relaxed">
                  <Latex>{err.problem.question}</Latex>
                </div>

                {/* Сравнение ответов */}
                <div className="grid grid-cols-2 gap-4 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 mb-4">
                  <div>
                    <div className="text-[10px] text-red-400/70 uppercase mb-1 font-bold">Ваш ответ</div>
                    <div className="text-red-400 font-mono text-sm break-all">
                      <Latex>{`$${err.user_answer || "\\emptyset"}$`}</Latex>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-400/70 uppercase mb-1 font-bold">Верно</div>
                    <div className="text-emerald-400 font-mono text-sm break-all">
                      <Latex>{`$${err.correct_answer}$`}</Latex>
                    </div>
                  </div>
                </div>

                {/* Материалы (Теория) */}
                <div>
                  <button 
                    onClick={() => toggleTheory(err.id)}
                    className={`flex items-center gap-2 text-sm font-bold transition-all w-full p-3 rounded-lg border ${
                      expandedTheoryId === err.id 
                        ? 'bg-slate-700/50 text-amber-400 border-amber-500/30' 
                        : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-700/30 hover:text-slate-200'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Материалы по теме</span>
                    {expandedTheoryId === err.id ? <ChevronUp className="w-4 h-4 ml-auto"/> : <ChevronDown className="w-4 h-4 ml-auto"/>}
                  </button>
                  
                  {expandedTheoryId === err.id && (
                    <div className="mt-2 p-4 bg-slate-900 rounded-xl border border-slate-700 text-slate-300 text-sm leading-relaxed animate-in slide-in-from-top-2 fade-in duration-200">
                      {err.module.theory_content ? (
                        <>
                          <div className="text-[10px] text-slate-500 uppercase mb-3 font-bold tracking-wider">Теоретическая справка:</div>
                          <div className="prose prose-invert prose-sm max-w-none">
                            <Latex>{err.module.theory_content}</Latex>
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-500 italic text-center py-2">
                          Для этого модуля материалы еще не загружены.
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
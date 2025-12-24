import { useEffect, useState } from 'react';
import { supabase, Module, Sector, UserProgress } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, BookOpen, Beaker, CheckCircle, Lock, PlayCircle } from 'lucide-react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';

type ModuleViewerProps = {
  sector: Sector;
  onBack: () => void;
  onStartExperiment: (module: Module) => void;
};

export function ModuleViewer({ sector, onBack, onStartExperiment }: ModuleViewerProps) {
  const { user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<Map<string, UserProgress>>(new Map());

  useEffect(() => {
    loadModules();
    if (user) loadProgress();
  }, [sector.id, user]);

  async function loadModules() {
    const { data } = await supabase.from('modules').select('*').eq('sector_id', sector.id).order('order_index');
    if (data) setModules(data);
  }

  async function loadProgress() {
    if (!user) return;
    const { data } = await supabase.from('user_progress').select('*').eq('user_id', user.id);
    if (data) {
      setProgress(new Map(data.map(p => [p.module_id, p])));
    }
  }

  const getProgressPercentage = (moduleId: string) => progress.get(moduleId)?.completion_percentage ?? 0;

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto p-4 md:p-8 pb-32">
        
        {/* Кнопка Назад */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 hover:text-white mb-8 transition-colors group px-4 py-2 rounded-full hover:bg-slate-800/50 w-fit"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold">К карте секторов</span>
        </button>

        {/* Заголовок Сектора */}
        <div className="mb-10 bg-slate-900/60 backdrop-blur-xl border border-cyan-500/20 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg mb-4">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">Сектор {sector.id}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4">{sector.name}</h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">{sector.description}</p>
            
            {!user && (
              <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-sm flex items-center gap-3">
                <Lock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span>Вы в демо-режиме. Вам открыт только первый модуль для ознакомления.</span>
              </div>
            )}
          </div>
        </div>

        {/* Список Модулей */}
        <div className="space-y-4">
          {modules.map((module, index) => {
            const percentage = getProgressPercentage(module.id);
            const isComplete = percentage === 100;
            const isLocked = !user && index > 0;

            return (
              <div
                key={module.id}
                className={`
                  group relative rounded-2xl p-1 transition-all duration-300
                  ${isLocked ? 'opacity-70 grayscale' : 'hover:scale-[1.01]'}
                `}
              >
                {/* Градиентная рамка при наведении (только если открыто) */}
                {!isLocked && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/30 to-blue-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                )}

                <div className={`
                  relative h-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-6
                  ${!isLocked && 'group-hover:border-cyan-500/30 group-hover:bg-slate-800/80'}
                `}>
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    
                    {/* Иконка номера */}
                    <div className={`
                      flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold border
                      ${isComplete 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : isLocked
                          ? 'bg-slate-800 text-slate-500 border-slate-700'
                          : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                      }
                    `}>
                      {isComplete ? <CheckCircle className="w-6 h-6" /> : index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-xl font-bold truncate ${isLocked ? 'text-slate-500' : 'text-white'}`}>
                          {module.name}
                        </h3>
                        {isLocked && <Lock className="w-5 h-5 text-slate-600" />}
                      </div>

                      <div className="text-slate-400 text-sm leading-relaxed mb-6">
                        <Latex>{module.theory_content}</Latex>
                      </div>

                      {/* Футер карточки */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-700/50">
                        
                        {/* Прогресс */}
                        {user ? (
                           <div className="flex-1 max-w-xs">
                             <div className="flex justify-between text-xs font-mono text-slate-500 mb-1">
                               <span>ПРОГРЕСС</span>
                               <span className={percentage === 100 ? 'text-emerald-400' : 'text-cyan-400'}>{percentage}%</span>
                             </div>
                             <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                               <div 
                                 className={`h-full transition-all duration-500 ${percentage === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} 
                                 style={{ width: `${percentage}%` }} 
                               />
                             </div>
                           </div>
                        ) : (
                           <div className="text-xs text-slate-600 font-mono">ПРОГРЕСС НЕ СОХРАНЯЕТСЯ</div>
                        )}

                        {/* Кнопка */}
                        <button
                          onClick={() => !isLocked && onStartExperiment(module)}
                          disabled={isLocked}
                          className={`
                            px-6 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all
                            ${isLocked 
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                              : 'bg-white text-black hover:bg-cyan-50 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                            }
                          `}
                        >
                          {isLocked ? (
                            'Заблокировано'
                          ) : (
                            <>
                              <PlayCircle className="w-4 h-4" />
                              {percentage > 0 ? 'Продолжить' : 'Начать'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {modules.length === 0 && (
          <div className="text-center py-20 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl backdrop-blur-sm">
            <div className="inline-block p-4 bg-slate-800 rounded-full mb-4">
              <BookOpen className="w-12 h-12 text-slate-600" />
            </div>
            <p className="text-slate-500 font-medium">Данные сектора загружаются...</p>
          </div>
        )}
      </div>
    </div>
  );
}
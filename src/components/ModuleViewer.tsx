import { useEffect, useState } from 'react';
import { supabase, Module, Sector, UserProgress } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, BookOpen, Beaker, CheckCircle } from 'lucide-react';
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
    if (user) {
      loadProgress();
    }
  }, [sector.id, user]);

  async function loadModules() {
    const { data } = await supabase
      .from('modules')
      .select('*')
      .eq('sector_id', sector.id)
      .order('order_index');

    if (data) {
      setModules(data);
    }
  }

  async function loadProgress() {
    const { data } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user!.id);

    if (data) {
      const progressMap = new Map(data.map(p => [p.module_id, p]));
      setProgress(progressMap);
    }
  }

  const getProgressPercentage = (moduleId: string) => {
    return progress.get(moduleId)?.completion_percentage ?? 0;
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Вернуться к карте</span>
        </button>

        <div className="mb-12">
          <div className="inline-block px-4 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full mb-4">
            <span className="text-cyan-400 font-mono text-sm">SECTOR {sector.id}</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">{sector.name}</h1>
          <p className="text-cyan-300/60 text-lg">{sector.description}</p>
        </div>

        <div className="space-y-4">
          {modules.map((module, index) => {
            const percentage = getProgressPercentage(module.id);
            const isComplete = percentage === 100;

            return (
              <div
                key={module.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-400/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-3 rounded-lg shrink-0">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">
                          {index + 1}. {module.name}
                        </h3>
                        {isComplete && (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-cyan-300/60 text-sm leading-relaxed">
                        <Latex>{module.theory_content}</Latex>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-cyan-400/60 font-mono">Прогресс модуля</span>
                    <span className="text-cyan-400 font-mono">{percentage}%</span>
                  </div>
                  <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => onStartExperiment(module)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.01]"
                >
                  <Beaker className="w-5 h-5" />
                  {percentage > 0 ? 'Продолжить эксперименты' : 'Начать эксперименты'}
                </button>
              </div>
            );
          })}
        </div>

        {modules.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-slate-800/50 rounded-full mb-4">
              <BookOpen className="w-12 h-12 text-cyan-400/30" />
            </div>
            <p className="text-cyan-300/40">
              Модули для этого сектора находятся в разработке
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

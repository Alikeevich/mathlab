import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // Перевод
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
  AlertTriangle,
  Lock,
  Zap
} from 'lucide-react';

type ErrorRecord = {
  id: string;
  problem_id: string;
  user_answer: string;
  correct_answer: string;
  created_at: string;
  problem: {
    id: string;
    question: string;
    question_kz?: string; // для перевода
    hint: string | null;
  };
  module: {
    id: string;
    name: string;
    name_kz?: string; // для перевода
    theory_content: string | null;
    theory_content_kz?: string | null; // для перевода
  };
};

type GroupedErrors = {
  [moduleName: string]: ErrorRecord[];
};

type ErrorAnalyzerProps = {
  onBack: () => void;
  onStartTraining: (problemIds: string[]) => void;
};

export function ErrorAnalyzer({ onBack, onStartTraining }: ErrorAnalyzerProps) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTheoryId, setExpandedTheoryId] = useState<string | null>(null);

  const hasAccess = profile?.is_premium || profile?.role === 'teacher' || profile?.role === 'admin';

  useEffect(() => {
    if (user && hasAccess) loadErrors();
    else setLoading(false);
  }, [user, hasAccess]);

  async function loadErrors() {
    setLoading(true);
    const { data } = await supabase
      .from('user_errors')
      .select(`
        id, problem_id, user_answer, correct_answer, created_at,
        problem:problems (id, question, question_kz, hint),
        module:modules (id, name, name_kz, theory_content, theory_content_kz)
      `)
      .eq('user_id', user!.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      setErrors(data as any);
    }
    setLoading(false);
  }

  const groupedErrors: GroupedErrors = errors.reduce((acc, err) => {
    // Используем переведенное имя модуля для группировки
    const modName = i18n.language === 'kk' && err.module.name_kz ? err.module.name_kz : err.module.name;
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

  const handleStartTraining = () => {
    const problemIds = Array.from(new Set(errors.map(e => e.problem_id)));
    if (problemIds.length > 0) {
      onStartTraining(problemIds);
    }
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center bg-slate-900">
      <Loader className="w-10 h-10 text-cyan-400 animate-spin" />
    </div>
  );

  if (!hasAccess) {
    return (
      <div className="min-h-full bg-slate-900 p-4 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
        <div className="max-w-md w-full bg-slate-800/50 border border-amber-500/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="bg-slate-900 p-4 rounded-full inline-block mb-6 border border-slate-700 shadow-lg">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">{t('analyzer.paywall_title')}</h2>
          <p className="text-slate-400 mb-6 leading-relaxed text-sm">{t('analyzer.paywall_desc')}</p>

          <div className="space-y-3 mb-8 text-left bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t('analyzer.paywall_feat1')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t('analyzer.paywall_feat2')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t('analyzer.paywall_feat3')}</span>
            </div>
          </div>

          <div className="flex gap-3">
             <button onClick={onBack} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors">
               {t('analyzer.back')}
             </button>
             <a href="/pricing" className="flex-[2] py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2">
               <Zap className="w-4 h-4 fill-current" />
               {t('analyzer.buy_premium')}
             </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-900 p-4 md:p-8 overflow-y-auto custom-scrollbar">
      
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180" /> {t('analyzer.back')}
        </button>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-8 h-8 text-cyan-500" />
          {t('analyzer.title')}
        </h1>
      </div>

      {errors.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-3xl animate-in zoom-in duration-300">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{t('analyzer.no_errors_title')}</h2>
          <p className="text-slate-400">{t('analyzer.no_errors_desc')}</p>
          <p className="text-slate-500 text-sm mt-2">{t('analyzer.no_errors_hint')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
              <h3 className="text-slate-400 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {t('analyzer.problem_zones')}
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

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 rounded-2xl flex flex-col justify-center items-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none" />
              <div className="text-4xl font-black text-white mb-1 relative z-10">{errors.length}</div>
              <div className="text-slate-400 text-sm mb-4 relative z-10">{t('analyzer.errors_to_fix')}</div>
              <button 
                onClick={handleStartTraining}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-cyan-900/20 relative z-10"
              >
                <RefreshCcw className="w-5 h-5" />
                {t('analyzer.start_training')}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white px-1 uppercase tracking-wide text-slate-400 text-xs">{t('analyzer.details')}</h2>
            {errors.map((err) => {
              // Локализация
              const modName = i18n.language === 'kk' && err.module.name_kz ? err.module.name_kz : err.module.name;
              const question = i18n.language === 'kk' && err.problem.question_kz ? err.problem.question_kz : err.problem.question;
              const theory = i18n.language === 'kk' && err.module.theory_content_kz ? err.module.theory_content_kz : err.module.theory_content;

              return (
                <div key={err.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 relative transition-all hover:border-slate-600">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-slate-900 px-3 py-1 rounded-lg text-[10px] text-cyan-400 font-bold font-mono border border-slate-700 uppercase tracking-wide">
                      {modName}
                    </div>
                    <button 
                      onClick={() => dismissError(err.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1"
                      title={t('analyzer.delete_btn')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mb-4 text-base md:text-lg text-white font-medium leading-relaxed">
                    <Latex>{`$${question}$`}</Latex>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 mb-4">
                    <div>
                      <div className="text-[10px] text-red-400/70 uppercase mb-1 font-bold">{t('analyzer.your_answer')}</div>
                      <div className="text-red-400 font-mono text-sm break-all">
                        <Latex>{`$${err.user_answer || "\\emptyset"}$`}</Latex>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-400/70 uppercase mb-1 font-bold">{t('analyzer.correct_answer')}</div>
                      <div className="text-emerald-400 font-mono text-sm break-all">
                        <Latex>{`$${err.correct_answer}$`}</Latex>
                      </div>
                    </div>
                  </div>

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
                      <span>{t('analyzer.theory_materials')}</span>
                      {expandedTheoryId === err.id ? <ChevronUp className="w-4 h-4 ml-auto"/> : <ChevronDown className="w-4 h-4 ml-auto"/>}
                    </button>
                    
                    {expandedTheoryId === err.id && (
                      <div className="mt-2 p-4 bg-slate-900 rounded-xl border border-slate-700 text-slate-300 text-sm leading-relaxed animate-in slide-in-from-top-2 fade-in duration-200">
                        {theory ? (
                          <>
                            <div className="text-[10px] text-slate-500 uppercase mb-3 font-bold tracking-wider">{t('analyzer.theory_hint')}</div>
                            <div className="prose prose-invert prose-sm max-w-none">
                              <Latex>{theory}</Latex>
                            </div>
                          </>
                        ) : (
                          <div className="text-slate-500 italic text-center py-2">{t('analyzer.no_theory')}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Achievement } from '../lib/supabase';
import {
  User, LogOut, Trophy, Target, TrendingUp, Award, Zap, Clock, CheckCircle2, XCircle, X, Mail, ShieldCheck
} from 'lucide-react';
import { BecomeTeacherModal } from './BecomeTeacherModal';

type DashboardProps = {
  onClose: () => void;
};

type UserAchievement = {
  achievement: Achievement;
  earned_at: string;
};

type RecentExperiment = {
  problem_type: string;
  correct: boolean;
  time_spent: number;
  attempted_at: string;
};

const rarityColors = {
  common: 'from-slate-400 to-slate-500',
  rare: 'from-blue-400 to-purple-500',
  legendary: 'from-amber-400 to-orange-500'
};

const typeTranslations: Record<string, string> = {
  input: 'Ввод значения',
  choice: 'Тестирование',
  arithmetic: 'Арифметика',
  equation: 'Уравнение',
  power: 'Степени',
  logarithm: 'Логарифмы',
  trigonometry: 'Тригонометрия',
  geometry: 'Геометрия'
};

export function Dashboard({ onClose }: DashboardProps) {
  const { profile, signOut } = useAuth();
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [recentExperiments, setRecentExperiments] = useState<RecentExperiment[]>([]);
  const [showTeacherModal, setShowTeacherModal] = useState(false);

  useEffect(() => {
    loadAchievements();
    loadRecentExperiments();
  }, []);

  async function loadAchievements() {
    if (!profile) return;
    const { data } = await supabase
      .from('user_achievements')
      .select('earned_at, achievement:achievements(*)')
      .eq('user_id', profile.id)
      .order('earned_at', { ascending: false })
      .limit(6);

    if (data) {
      setAchievements(data.map(item => ({
        achievement: item.achievement as unknown as Achievement,
        earned_at: item.earned_at
      })));
    }
  }

  async function loadRecentExperiments() {
    if (!profile) return;
    const { data } = await supabase
      .from('experiments')
      .select('problem_type, correct, time_spent, attempted_at')
      .eq('user_id', profile.id)
      .order('attempted_at', { ascending: false })
      .limit(10);

    if (data) {
      setRecentExperiments(data);
    }
  }

  async function handleSignOut() {
    onClose();
    await signOut();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[70] overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Лабораторный Журнал</h1>
            <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-3">
            
            {/* КНОПКА "Я УЧИТЕЛЬ" */}
            {profile && profile.role !== 'teacher' && !profile.is_admin && (
              <button
                onClick={() => setShowTeacherModal(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Я учитель</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="hidden md:block px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Закрыть
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
          
          {/* Мобильная кнопка учителя */}
          {profile && profile.role !== 'teacher' && !profile.is_admin && (
              <button
                onClick={() => setShowTeacherModal(true)}
                className="md:hidden w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Я учитель</span>
              </button>
          )}

        </div>

        {profile && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              
              {/* ПРОФИЛЬ */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-4 md:p-6 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-3 relative z-10">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <User className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="text-cyan-400/60 text-xs md:text-sm uppercase tracking-wider">
                    {profile.role === 'teacher' ? 'Учитель' : 'Сотрудник'}
                  </div>
                </div>
                <div className="text-lg md:text-xl font-bold text-white truncate relative z-10">{profile.username}</div>
                
                {profile.companion_name && (
                  <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-4 animate-in slide-in-from-left-4 fade-in duration-500">
                     <img 
                       src="/meerkat/avatar.png" 
                       alt="Pet" 
                       className="w-14 h-14 object-contain drop-shadow-md"
                       onError={(e) => { e.currentTarget.style.display='none'; }}
                     />
                     <div>
                       <div className="text-[10px] text-amber-400/60 font-mono uppercase tracking-wider">Компаньон</div>
                       <div className="text-amber-100 font-bold text-lg">{profile.companion_name}</div>
                     </div>
                  </div>
                )}
              </div>

              {/* УРОВЕНЬ */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 md:p-6">
                <div className="flex items-center gap-3 mb-2 md:mb-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Target className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-purple-400/60 text-xs md:text-sm uppercase tracking-wider">Уровень</div>
                </div>
                <div className="text-2xl font-bold text-white">LVL {profile.clearance_level}</div>
              </div>

              {/* ОПЫТ */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/30 rounded-xl p-4 md:p-6">
                <div className="flex items-center gap-3 mb-2 md:mb-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-emerald-400/60 text-xs md:text-sm uppercase tracking-wider">Всего задач</div>
                </div>
                <div className="text-2xl font-bold text-white">{profile.total_experiments}</div>
              </div>

              {/* ТОЧНОСТЬ */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/30 rounded-xl p-4 md:p-6">
                <div className="flex items-center gap-3 mb-2 md:mb-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-blue-400/60 text-xs md:text-sm uppercase tracking-wider">Точность</div>
                </div>
                <div className="text-2xl font-bold text-white">{profile.success_rate.toFixed(0)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
              {/* ДОСТИЖЕНИЯ */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg md:text-xl font-bold text-white">Достижения</h2>
                </div>
                <div className="space-y-3 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {achievements.length > 0 ? (
                    achievements.map((item, index) => (
                      <div
                        key={index}
                        className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-3 md:p-4 flex items-center gap-3 md:gap-4 hover:bg-slate-800 transition-colors"
                      >
                        <div className={`p-2 md:p-3 rounded-lg bg-gradient-to-br ${rarityColors[item.achievement.rarity]} shadow-lg shrink-0`}>
                          <Award className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white text-sm md:text-base truncate">{item.achievement.name}</h3>
                          </div>
                          <p className="text-cyan-300/60 text-xs md:text-sm truncate">{item.achievement.description}</p>
                        </div>
                        <div className="text-[10px] md:text-xs text-slate-500 font-mono shrink-0">
                          {new Date(item.earned_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-cyan-300/40 border-2 border-dashed border-slate-700 rounded-xl text-sm">
                      <Award className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      Пока нет достижений
                    </div>
                  )}
                </div>
              </div>

              {/* ИСТОРИЯ */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg md:text-xl font-bold text-white">История</h2>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-3 md:p-4">
                  <div className="space-y-2 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {recentExperiments.length > 0 ? (
                      recentExperiments.map((exp, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2 md:py-3 px-3 md:px-4 rounded-lg bg-slate-900/40 hover:bg-slate-700/40 transition-colors border border-slate-700/50"
                        >
                          <div className="flex items-center gap-3">
                            {exp.correct ? (
                              <div className="bg-emerald-500/10 p-1 rounded-full shrink-0">
                                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                              </div>
                            ) : (
                              <div className="bg-red-500/10 p-1 rounded-full shrink-0">
                                <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
                              </div>
                            )}
                            
                            <div className="min-w-0">
                              <div className="text-white text-xs md:text-sm font-medium truncate max-w-[120px] md:max-w-none">
                                {typeTranslations[exp.problem_type] || exp.problem_type}
                              </div>
                              <div className="text-cyan-300/40 text-[10px] md:text-xs flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {exp.time_spent} сек.
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                             <div className="text-slate-400 text-[10px] md:text-xs font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700">
                               {formatDate(exp.attempted_at)}
                             </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-cyan-300/40 text-sm">
                        Журнал пуст
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ТЕХПОДДЕРЖКА */}
            <div className="mt-8 pt-6 border-t border-slate-700 flex justify-center">
              <a 
                href="mailto:support@mathlabpvp.org?subject=Вопрос по MathLab"
                className="flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors px-4 py-2 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-700"
              >
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Нашли ошибку? Напишите в поддержку</span>
              </a>
            </div>

          </>
        )}
        
        {/* Рендер модалки учителя */}
        {showTeacherModal && <BecomeTeacherModal onClose={() => setShowTeacherModal(false)} />}
      </div>
    </div>
  );
}
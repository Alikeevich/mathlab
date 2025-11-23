import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Achievement } from '../lib/supabase';
import {
  User,
  LogOut,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Award,
  Zap
} from 'lucide-react';

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

export function Dashboard({ onClose }: DashboardProps) {
  const { profile, signOut } = useAuth();
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [recentExperiments, setRecentExperiments] = useState<RecentExperiment[]>([]);

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
    await signOut();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Лабораторный Журнал</h1>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Закрыть
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </div>

        {profile && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <User className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="text-cyan-400/60 text-sm">Сотрудник</div>
                </div>
                <div className="text-2xl font-bold text-white">{profile.username}</div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Target className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-purple-400/60 text-sm">Уровень допуска</div>
                </div>
                <div className="text-2xl font-bold text-white">LVL {profile.clearance_level}</div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-emerald-400/60 text-sm">Экспериментов</div>
                </div>
                <div className="text-2xl font-bold text-white">{profile.total_experiments}</div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-blue-400/60 text-sm">Точность</div>
                </div>
                <div className="text-2xl font-bold text-white">{profile.success_rate.toFixed(0)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h2 className="text-xl font-bold text-white">Достижения</h2>
                </div>
                <div className="space-y-3">
                  {achievements.length > 0 ? (
                    achievements.map((item, index) => (
                      <div
                        key={index}
                        className="bg-slate-800/50 backdrop-blur-sm border border-amber-500/30 rounded-xl p-4 flex items-center gap-4"
                      >
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${rarityColors[item.achievement.rarity]} shadow-lg`}>
                          <Award className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{item.achievement.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              item.achievement.rarity === 'legendary'
                                ? 'bg-amber-500/20 text-amber-400'
                                : item.achievement.rarity === 'rare'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-slate-500/20 text-slate-400'
                            }`}>
                              {item.achievement.rarity}
                            </span>
                          </div>
                          <p className="text-cyan-300/60 text-sm">{item.achievement.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-cyan-400/60 text-xs">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.earned_at)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-cyan-300/40">
                      Решайте задачи, чтобы заработать достижения
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-xl font-bold text-white">Последние эксперименты</h2>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {recentExperiments.length > 0 ? (
                      recentExperiments.map((exp, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-700/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${exp.correct ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <div>
                              <div className="text-white text-sm font-medium">{exp.problem_type}</div>
                              <div className="text-cyan-300/40 text-xs">{exp.time_spent}с</div>
                            </div>
                          </div>
                          <div className="text-cyan-400/60 text-xs">
                            {formatDate(exp.attempted_at)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-cyan-300/40 text-sm">
                        Нет данных об экспериментах
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

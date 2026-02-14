import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Achievement } from '../lib/supabase';
import {
  User, LogOut, Trophy, Target, TrendingUp, Award, Zap, Clock, CheckCircle2, 
  XCircle, X, Mail, ShieldCheck, GraduationCap, CreditCard, Loader, Shield, ExternalLink
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
  const { profile, signOut, refreshProfile } = useAuth();
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [recentExperiments, setRecentExperiments] = useState<RecentExperiment[]>([]);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  
  const [teacherRequestStatus, setTeacherRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [loadingRequest, setLoadingRequest] = useState(false);

  useEffect(() => {
    loadAchievements();
    loadRecentExperiments();
    checkTeacherRequest();
    
    if (!profile) return;
    
    // Realtime подписка на статус заявки
    const channel = supabase
      .channel('teacher-status-changes')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'teacher_requests', 
          filter: `user_id=eq.${profile.id}` 
        },
        (payload) => {
          setTeacherRequestStatus(payload.new.status);
          refreshProfile(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

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

  async function checkTeacherRequest() {
    if (!profile) return;
    setLoadingRequest(true);
    
    const { data } = await supabase
      .from('teacher_requests')
      .select('status')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setTeacherRequestStatus(data.status as any);
    } else {
      setTeacherRequestStatus('none');
    }
    setLoadingRequest(false);
  }

  const handleTeacherPaymentRedirect = () => {
    // Редирект на страницу цен
    window.location.href = "/pricing";
  };

  async function handleSignOut() {
    onClose();
    await signOut();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // === ЛОГИКА ОТОБРАЖЕНИЯ РОЛИ ===
  const getRoleDisplay = () => {
    if (!profile) return { label: 'Guest', color: 'text-slate-400', icon: User, bg: 'bg-slate-700' };

    if (profile.role === 'admin') {
      return { label: 'ADMINISTRATOR', color: 'text-red-400', icon: Shield, bg: 'bg-red-500/10 border-red-500/50' };
    }
    if (profile.role === 'teacher') {
      return { label: 'MENTOR', color: 'text-cyan-400', icon: GraduationCap, bg: 'bg-cyan-500/10 border-cyan-500/50' };
    }
    if (profile.is_premium) {
      return { label: 'PREMIUM AGENT', color: 'text-amber-400', icon: Zap, bg: 'bg-amber-500/10 border-amber-500/50' };
    }
    return { label: 'CADET', color: 'text-slate-300', icon: User, bg: 'bg-slate-800 border-slate-700' };
  };

  const roleInfo = getRoleDisplay();
  const RoleIcon = roleInfo.icon;

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[70] overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in duration-300">
        
        {/* === HEADER === */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <User className="w-8 h-8 text-cyan-500" />
            Личное Дело
          </h1>
          <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {profile && (
          <div className="space-y-6">
            
            {/* === MAIN ID CARD === */}
            <div className={`p-6 rounded-3xl border ${roleInfo.bg} relative overflow-hidden shadow-2xl`}>
              {/* Фоновые элементы */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start relative z-10">
                
                {/* Аватар / Иконка роли */}
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center shrink-0 border-2 ${roleInfo.color.replace('text', 'border')} bg-slate-900/50 shadow-lg`}>
                   <RoleIcon className={`w-12 h-12 ${roleInfo.color}`} />
                </div>

                {/* Инфо о пользователе */}
                <div className="flex-1 text-center md:text-left">
                  <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border ${roleInfo.bg} ${roleInfo.color}`}>
                    {roleInfo.label}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-white mb-1">{profile.username}</h2>
                  <p className="text-slate-400 font-mono text-xs uppercase tracking-wider">ID: {profile.id.split('-')[0]}</p>
                
                  {/* Кнопки действий */}
                  <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-lg transition-all font-bold text-sm flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Выход
                    </button>

                    {/* Логика "Стать учителем" */}
                    {profile.role !== 'teacher' && profile.role !== 'admin' && (
                      <>
                        {teacherRequestStatus === 'none' && (
                          <button
                            onClick={() => setShowTeacherModal(true)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-lg transition-colors font-bold text-sm flex items-center gap-2"
                          >
                            <GraduationCap className="w-4 h-4" /> Стать учителем
                          </button>
                        )}
                        {teacherRequestStatus === 'pending' && (
                          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg font-bold text-sm flex items-center gap-2 animate-pulse cursor-wait">
                            <Clock className="w-4 h-4" /> Заявка на проверке
                          </div>
                        )}
                        {teacherRequestStatus === 'approved' && (
                          <button
                            onClick={handleTeacherPaymentRedirect}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/20 animate-pulse"
                          >
                            <CreditCard className="w-4 h-4" /> Активировать статус
                          </button>
                        )}
                        {teacherRequestStatus === 'rejected' && (
                          <button
                            onClick={() => setShowTeacherModal(true)}
                            className="px-4 py-2 bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-red-900/40"
                          >
                            <XCircle className="w-4 h-4" /> Заявка отклонена. Повторить?
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Компаньон */}
                {profile.companion_name && (
                  <div className="hidden md:flex flex-col items-center bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                    <img src="/meerkat/avatar.png" alt="Pet" className="w-16 h-16 object-contain mb-2" />
                    <div className="text-xs font-bold text-white">{profile.companion_name}</div>
                    <div className="text-[10px] text-slate-500 uppercase">LVL {profile.companion_level || 1}</div>
                  </div>
                )}
              </div>
            </div>

            {/* === STATS GRID === */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Уровень</div>
                  <div className="text-2xl font-black text-white">{profile.clearance_level}</div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Задач решено</div>
                  <div className="text-2xl font-black text-white">{profile.total_experiments}</div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Точность</div>
                  <div className="text-2xl font-black text-white">{profile.success_rate.toFixed(0)}%</div>
                </div>
              </div>
            </div>

            {/* === ACHIEVEMENTS & HISTORY === */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div>
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-white uppercase tracking-tight">Достижения</h2>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 min-h-[200px]">
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {achievements.length > 0 ? (
                      achievements.map((item, index) => (
                        <div key={index} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${rarityColors[item.achievement.rarity]} shadow-lg`}>
                            <Award className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-sm truncate">{item.achievement.name}</h3>
                            <p className="text-slate-400 text-[10px] truncate">{item.achievement.description}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-600 text-sm italic">Нет наград</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white uppercase tracking-tight">Последняя активность</h2>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 min-h-[200px]">
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {recentExperiments.length > 0 ? (
                      recentExperiments.map((exp, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700/50">
                          <div className="flex items-center gap-3">
                            {exp.correct ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                            <div>
                              <div className="text-white text-sm font-bold">{typeTranslations[exp.problem_type] || exp.problem_type}</div>
                              <div className="text-[10px] text-slate-500">{exp.time_spent}с • {formatDate(exp.attempted_at)}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-600 text-sm italic">Журнал пуст</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex justify-center">
              <a href="mailto:support@mathlabpvp.org" className="flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-all text-xs font-bold uppercase tracking-widest">
                <Mail className="w-4 h-4" /> Служба поддержки
              </a>
            </div>
          </div>
        )}
        
        {showTeacherModal && <BecomeTeacherModal onClose={() => {
            setShowTeacherModal(false);
            checkTeacherRequest(); 
        }} />}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { LabMap } from './components/LabMap';
import { ModuleViewer } from './components/ModuleViewer';
import { Reactor } from './components/Reactor';
import { Dashboard } from './components/Dashboard';
import { Sector, Module } from './lib/supabase';
import { Menu, User, Settings, Trophy, Zap, MonitorPlay, Crown, Keyboard } from 'lucide-react';
import { supabase } from './lib/supabase';
import 'katex/dist/katex.min.css';
import { AdminGenerator } from './components/AdminGenerator';
import { Leaderboard } from './components/Leaderboard';
import { Onboarding } from './components/Onboarding';
import { getRank, getLevelProgress } from './lib/gameLogic';
import { PvPMode } from './components/PvPMode';
import { VideoArchive } from './components/VideoArchive';
import { TournamentAdmin } from './components/TournamentAdmin';
import { TournamentLobby } from './components/TournamentLobby';
import { JoinTournamentModal } from './components/JoinTournamentModal';
import { CompanionLair } from './components/CompanionLair';
import { CompanionSetup } from './components/CompanionSetup';

type View = 'map' | 'modules' | 'reactor' | 'pvp' | 'tournament_lobby';

function MainApp() {
  const { user, loading, profile } = useAuth();
  const [view, setView] = useState<View>('map');
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  
  // Состояния модальных окон
  const [showDashboard, setShowDashboard] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showTournamentAdmin, setShowTournamentAdmin] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [showCompanion, setShowCompanion] = useState(false);
  const [showCompanionSetup, setShowCompanionSetup] = useState(false);

  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);

  // === ФУНКЦИЯ ВХОДА В ТУРНИР ===
  async function joinTournament(code: string) {
    if (!user) return;
    const { data: tour } = await supabase.from('tournaments').select('id, status').eq('code', code).single();

    if (tour) {
      await supabase.from('tournament_participants').upsert({
        tournament_id: tour.id,
        user_id: user.id
      });
      setShowJoinCode(false);
      window.history.replaceState({}, document.title, "/");
      setActiveTournamentId(tour.id);
      setView('tournament_lobby');
    } else {
      alert("Турнир с таким кодом не найден!");
    }
  }

  // === ПРОВЕРКИ ПРИ ЗАГРУЗКЕ ===
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tCode = params.get('t');
    if (tCode) joinTournament(tCode);
  }, [user]);

  useEffect(() => {
    async function checkActiveDuel() {
      if (!user) return;
      const { data } = await supabase.from('duels').select('id').eq('status', 'active').or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`).maybeSingle();
      if (data) setView('pvp');
    }
    checkActiveDuel();
  }, [user]);

  useEffect(() => {
    if (!profile) return;
    if (profile.total_experiments === 0 && profile.clearance_level === 0) {
      const hasSeen = localStorage.getItem('onboarding_seen');
      if (!hasSeen) { setShowOnboarding(true); return; }
    }
    if (!profile.companion_name) setShowCompanionSetup(true);
  }, [profile, showOnboarding]);

  function finishOnboarding() {
    localStorage.setItem('onboarding_seen', 'true');
    setShowOnboarding(false);
  }

  const currentRank = profile ? getRank(profile.clearance_level, profile.is_admin) : null;
  const progressPercent = profile ? getLevelProgress(profile.total_experiments) : 0;

  // Навигация
  function handleSectorSelect(sector: Sector) { setSelectedSector(sector); setView('modules'); }
  function handleStartExperiment(module: Module) { setSelectedModule(module); setView('reactor'); }
  function handleBackToMap() {
    if (activeTournamentId && view === 'pvp') { setView('tournament_lobby'); } 
    else { setView('map'); setSelectedSector(null); setActiveTournamentId(null); }
  }
  function handleBackToModules() { setView('modules'); setSelectedModule(null); }

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-cyan-400">Загрузка...</div>;
  }

  if (!user) return <Auth />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.05),transparent_70%)]" />
      
      {/* === ШАПКА (ОПТИМИЗИРОВАНА ДЛЯ МОБИЛОК) === */}
      <header className="relative border-b border-cyan-500/20 bg-slate-900/50 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* ЛЕВАЯ ЧАСТЬ: Меню */}
          <button onClick={handleBackToMap} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg shadow-lg">
              <Menu className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            {/* Скрываем текст на мобильных */}
            <div className="hidden md:block text-left">
              <h1 className="text-xl font-bold text-white leading-tight">MathLab</h1>
              <p className="text-cyan-400/60 text-xs">Научный центр</p>
            </div>
          </button>

          {/* ПРАВАЯ ЧАСТЬ: Иконки и Профиль */}
          <div className="flex items-center gap-2 md:gap-4">
            
            {/* 1. СУРИКАТ */}
            {profile?.companion_name && (
              <button 
                onClick={() => setShowCompanion(true)}
                className="relative group p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors"
                title={`Домик ${profile.companion_name}`}
              >
                <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
                   <img 
                     src="/meerkat/avatar.png" 
                     alt="Pet" 
                     className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                     onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerText = '🦦'; }}
                   />
                </div>
                {profile.companion_hunger < 30 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 border border-slate-900 rounded-full animate-ping" />
                )}
              </button>
            )}

            {/* 2. АРХИВ */}
            <button onClick={() => setShowArchive(true)} className="p-1.5 md:p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors">
              <MonitorPlay className="w-5 h-5 text-cyan-400" />
            </button>

            {/* 3. РЕЙТИНГ */}
            <button onClick={() => setShowLeaderboard(true)} className="p-1.5 md:p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors">
              <Trophy className="w-5 h-5 text-amber-400" />
            </button>

            {/* 4. ПРОФИЛЬ (Компактный на мобилах) */}
            <button onClick={() => setShowDashboard(true)} className="flex items-center gap-2 pl-2 border-l border-slate-700/50">
              <div className="flex flex-col items-end">
                {/* Скрываем имя на мобилах, оставляем только ранг */}
                <span className={`text-[10px] md:text-xs font-bold uppercase ${currentRank?.color}`}>
                  {currentRank?.title.split(' ')[0]} {/* Берем только первое слово ранга для компактности */}
                </span>
                <span className="hidden md:block text-white font-medium text-sm leading-none">
                  {profile?.username}
                </span>
                {/* Полоска опыта */}
                <div className="w-12 md:w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              
              {/* Аватар юзера */}
              <div className="p-1.5 md:p-2 bg-slate-800 rounded-lg border border-slate-700">
                 <User className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              </div>
            </button>

          </div>
        </div>
      </header>

      {/* === ОСНОВНОЙ КОНТЕНТ === */}
      <main className="relative z-0 pb-24 md:pb-20">
        {view === 'map' && (
          <>
            <LabMap onSectorSelect={handleSectorSelect} />
            
            {/* КНОПКИ ГЛАВНОГО ЭКРАНА (Адаптивные) */}
            <div className="fixed bottom-6 left-0 right-0 px-4 z-40 flex justify-center gap-3">
              
              <button 
                onClick={() => setShowJoinCode(true)}
                className="flex-1 max-w-[160px] group flex items-center justify-center gap-2 bg-slate-800 border-2 border-slate-600 px-4 py-3 rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                <Keyboard className="w-5 h-5 text-slate-400" />
                <span className="font-bold text-slate-300 text-sm uppercase">КОД</span>
              </button>

              <button 
                onClick={() => setView('pvp')}
                className="flex-[2] max-w-[240px] group relative flex items-center justify-center gap-2 bg-slate-900 border-2 border-red-600 px-6 py-3 rounded-2xl shadow-lg shadow-red-900/20 active:scale-95 transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-red-600/10" />
                <Zap className="w-6 h-6 text-red-500 fill-current animate-pulse" />
                <span className="font-black text-white text-lg tracking-widest italic">PVP</span>
              </button>
            </div>
          </>
        )}
        
        {view === 'modules' && selectedSector && <ModuleViewer sector={selectedSector} onBack={handleBackToMap} onStartExperiment={handleStartExperiment} />}
        {view === 'reactor' && selectedModule && <Reactor module={selectedModule} onBack={handleBackToModules} />}
        {view === 'pvp' && <PvPMode onBack={handleBackToMap} />}
        {view === 'tournament_lobby' && activeTournamentId && <TournamentLobby tournamentId={activeTournamentId} onBattleStart={() => setView('pvp')} />}
      </main>

      {/* МОДАЛКИ */}
      {showCompanionSetup && <CompanionSetup onComplete={() => setShowCompanionSetup(false)} />}
      {showOnboarding && <Onboarding onComplete={finishOnboarding} />}
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
      {showDashboard && <Dashboard onClose={() => setShowDashboard(false)} />}
      {showAdmin && <AdminGenerator onClose={() => setShowAdmin(false)} />}
      {showArchive && <VideoArchive onClose={() => setShowArchive(false)} />}
      {showTournamentAdmin && <TournamentAdmin onClose={() => setShowTournamentAdmin(false)} />}
      {showJoinCode && <JoinTournamentModal onJoin={joinTournament} onClose={() => setShowJoinCode(false)} />}
      {showCompanion && <CompanionLair onClose={() => setShowCompanion(false)} />}

      {profile?.is_admin && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-3">
          <button onClick={() => setShowTournamentAdmin(true)} className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-full text-amber-400 shadow-lg backdrop-blur-sm"><Crown className="w-6 h-6" /></button>
          <button onClick={() => setShowAdmin(true)} className="p-3 bg-slate-800/90 border border-cyan-500/30 rounded-full text-cyan-400 shadow-lg backdrop-blur-sm"><Settings className="w-6 h-6" /></button>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
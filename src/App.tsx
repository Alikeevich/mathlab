import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { LabMap } from './components/LabMap';
import { ModuleViewer } from './components/ModuleViewer';
import { Reactor } from './components/Reactor';
import { Dashboard } from './components/Dashboard';
import { Sector, Module } from './lib/supabase';
// ИКОНКИ (Menu убрали, оно теперь внутри Header)
import { Settings, Zap, Crown, Keyboard, Lock, RotateCcw } from 'lucide-react';
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
import { LevelUpManager } from './components/LevelUpManager';
import { ReconnectModal } from './components/ReconnectModal';
import { LegalModal } from './components/LegalModal';
import PixelBlast from './components/PixelBlast';

// ИМПОРТ ХЕДЕРА
import { Header } from './components/Header';

type View = 'map' | 'modules' | 'reactor' | 'pvp' | 'tournament_lobby';

function MainApp() {
  const { user, loading, profile } = useAuth();
  const [view, setView] = useState<View>('map');
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  
  const [isGuest, setIsGuest] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [showDashboard, setShowDashboard] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showTournamentAdmin, setShowTournamentAdmin] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [showCompanion, setShowCompanion] = useState(false);
  const [showCompanionSetup, setShowCompanionSetup] = useState(false);
  
  const [showReconnect, setShowReconnect] = useState(false);
  const [reconnectData, setReconnectData] = useState<{ type: 'tournament' | 'pvp', id?: string } | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showLegal, setShowLegal] = useState<'privacy' | 'terms' | null>(null);

  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);

  // === ФУНКЦИЯ ВХОДА В ТУРНИР ===
  async function joinTournament(code: string) {
    if (!user) return;
    const { data: tour } = await supabase.from('tournaments').select('id, status').eq('code', code).single();
    if (tour) {
      await supabase.from('tournament_participants').upsert({ tournament_id: tour.id, user_id: user.id });
      setShowJoinCode(false);
      window.history.replaceState({}, document.title, "/");
      setActiveTournamentId(tour.id);
      setView('tournament_lobby');
    } else {
      alert("Турнир не найден!");
    }
  }

  // === РУЧНОЙ ПЕРЕЗАХОД ===
  async function manualReconnect() {
    if (!user) return;
    setIsReconnecting(true);
    try {
      const { data: tourPart } = await supabase.from('tournament_participants').select('tournament_id, tournaments(status)').eq('user_id', user.id).neq('tournaments.status', 'finished').maybeSingle();
      if (tourPart && tourPart.tournaments) { setActiveTournamentId(tourPart.tournament_id); setView('tournament_lobby'); return; }
      const { data: duel } = await supabase.from('duels').select('id').eq('status', 'active').is('tournament_id', null).or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`).maybeSingle();
      if (duel) { setView('pvp'); return; }
      alert("Активных игр не найдено.");
    } catch (e) { console.error(e); } finally { setIsReconnecting(false); }
  }

  // === ПРОВЕРКИ ===
  useEffect(() => {
    if (!user) return;
    const tCode = new URLSearchParams(window.location.search).get('t');
    if (tCode) joinTournament(tCode);
  }, [user]);

  useEffect(() => {
    async function checkActiveSession() {
      if (!user) return;
      const { data: part } = await supabase.from('tournament_participants').select('tournament_id, tournaments(status)').eq('user_id', user.id).neq('tournaments.status', 'finished').maybeSingle();
      if (part && part.tournaments) { setReconnectData({ type: 'tournament', id: part.tournament_id }); setShowReconnect(true); return; }
      const { data: duel } = await supabase.from('duels').select('id').eq('status', 'active').is('tournament_id', null).or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`).maybeSingle();
      if (duel) setView('pvp');
    }
    checkActiveSession();
  }, [user]);

  const handleReconnectConfirm = () => {
    if (reconnectData?.type === 'tournament' && reconnectData.id) { setActiveTournamentId(reconnectData.id); setView('tournament_lobby'); }
    setShowReconnect(false);
  };
  const handleReconnectCancel = async () => { setShowReconnect(false); };

  useEffect(() => {
    async function checkHosting() {
      if (!user || !profile?.is_admin) return;
      const { data } = await supabase.from('tournaments').select('id').eq('created_by', user.id).in('status', ['waiting', 'active']).maybeSingle();
      if (data) setShowTournamentAdmin(true);
    }
    checkHosting();
  }, [user, profile]);

  useEffect(() => {
    if (!profile) return;
    if (profile.total_experiments === 0 && profile.clearance_level === 0) {
      const hasSeen = localStorage.getItem('onboarding_seen');
      if (!hasSeen) { setShowOnboarding(true); return; }
    }
    if (!profile.companion_name) setShowCompanionSetup(true);
  }, [profile, showOnboarding]);

  function finishOnboarding() { localStorage.setItem('onboarding_seen', 'true'); setShowOnboarding(false); }

  function handleSectorSelect(sector: Sector) { setSelectedSector(sector); setView('modules'); }
  function handleStartExperiment(module: Module) { setSelectedModule(module); setView('reactor'); }
  function handleBackToMap() {
    if (activeTournamentId && view === 'pvp') { setView('tournament_lobby'); } 
    else { setView('map'); setSelectedSector(null); setActiveTournamentId(null); }
  }
  function handleBackToModules() { setView('modules'); setSelectedModule(null); }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-cyan-400">Загрузка...</div>;

  if (!user && !isGuest && !showAuthModal) {
    return (
      <>
        <LandingPage onStartDemo={() => setIsGuest(true)} onLogin={() => setShowAuthModal(true)} onOpenLegal={(type) => setShowLegal(type)} />
        {showLegal && <LegalModal type={showLegal} onClose={() => setShowLegal(null)} />}
      </>
    );
  }

  if (!user && showAuthModal) return <div className="relative"><button onClick={() => setShowAuthModal(false)} className="absolute top-4 left-4 text-white z-50 p-2 bg-slate-800 rounded-full border border-slate-700">← Назад</button><Auth onOpenLegal={(type) => setShowLegal(type)} />{showLegal && <LegalModal type={showLegal} onClose={() => setShowLegal(null)} />}</div>;

  return (
    <div className="min-h-screen bg-slate-900 relative selection:bg-cyan-500/30">
      
      <div className="absolute inset-0 z-0">
        <PixelBlast variant="circle" pixelSize={6} color="#B19EEF" patternScale={3} patternDensity={1.2} pixelSizeJitter={0.5} enableRipples rippleSpeed={0.4} rippleThickness={0.12} rippleIntensityScale={1.5} liquid liquidStrength={0.12} liquidRadius={1.2} liquidWobbleSpeed={5} speed={0.6} edgeFade={0.25} transparent />
        <div className="absolute inset-0 bg-slate-900/50 pointer-events-none" />
      </div>

      <div className="relative z-10 h-full flex flex-col">
        
        {/* === ЗДЕСЬ ТЕПЕРЬ ПОДКЛЮЧЕН HEADER === */}
        <Header 
          user={user} 
          profile={profile} 
          onBackToMap={handleBackToMap}
          onShowCompanion={() => setShowCompanion(true)}
          onShowArchive={() => setShowArchive(true)}
          onShowLeaderboard={() => setShowLeaderboard(true)}
          onShowDashboard={() => setShowDashboard(true)}
          onExitGuest={() => setIsGuest(false)}
          onShowAuth={() => setShowAuthModal(true)}
        />

        <main className="relative z-0 pb-24 md:pb-20 flex-1">
          {view === 'map' && (
            <>
              <LabMap onSectorSelect={handleSectorSelect} />
              <div className="fixed bottom-6 left-0 right-0 px-4 z-40 flex justify-center gap-3 w-full max-w-lg mx-auto">
                {user ? (
                   <>
                    <button onClick={manualReconnect} disabled={isReconnecting} className="p-3 md:p-4 bg-slate-800/90 backdrop-blur-md border-2 border-slate-600 rounded-2xl shadow-lg hover:border-cyan-400 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50" title="Перезаход">
                      <RotateCcw className={`w-6 h-6 text-slate-300 ${isReconnecting ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setShowJoinCode(true)} className="flex-1 max-w-[160px] group flex items-center justify-center gap-2 bg-slate-800/90 backdrop-blur-md border-2 border-slate-600 px-4 py-3 rounded-2xl shadow-lg active:scale-95 transition-all">
                      <Keyboard className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" /><span className="font-bold text-slate-300 text-sm uppercase hidden sm:inline">Ввести код</span>
                    </button>
                    <button onClick={() => setView('pvp')} className="flex-[2] max-w-[240px] group relative flex items-center justify-center gap-2 bg-slate-900/90 backdrop-blur-md border-2 border-red-600 px-6 py-3 rounded-2xl shadow-lg shadow-red-900/20 active:scale-95 transition-all overflow-hidden">
                      <div className="absolute inset-0 bg-red-600/10 group-hover:bg-red-600/20 transition-colors" /><Zap className="w-8 h-8 text-red-500 fill-current animate-pulse" /><span className="font-black text-white text-lg tracking-widest italic">PVP ARENA</span>
                    </button>
                   </>
                ) : (
                  <div className="bg-slate-900/90 border border-slate-700 px-6 py-3 rounded-full text-slate-400 text-sm flex items-center gap-2 backdrop-blur-md">
                     <Lock className="w-4 h-4" /> PvP и Турниры доступны после регистрации
                  </div>
                )}
              </div>
            </>
          )}
          
          {view === 'modules' && selectedSector && <ModuleViewer sector={selectedSector} onBack={handleBackToMap} onStartExperiment={handleStartExperiment} />}
          {view === 'reactor' && selectedModule && <Reactor module={selectedModule} onBack={handleBackToModules} onRequestAuth={() => setShowAuthModal(true)} />}
          {user && view === 'pvp' && <PvPMode onBack={handleBackToMap} />}
          {user && view === 'tournament_lobby' && activeTournamentId && <TournamentLobby tournamentId={activeTournamentId} onBattleStart={() => setView('pvp')} />}
        </main>
      </div>

      {/* МОДАЛКИ */}
      {user && (
        <>
          {showCompanionSetup && <CompanionSetup onComplete={() => setShowCompanionSetup(false)} />}
          {showOnboarding && <Onboarding onComplete={finishOnboarding} />}
          {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
          {showDashboard && <Dashboard onClose={() => setShowDashboard(false)} />}
          {showAdmin && <AdminGenerator onClose={() => setShowAdmin(false)} />}
          {showArchive && <VideoArchive onClose={() => setShowArchive(false)} />}
          {showTournamentAdmin && <TournamentAdmin onClose={() => setShowTournamentAdmin(false)} />}
          {showJoinCode && <JoinTournamentModal onJoin={joinTournament} onClose={() => setShowJoinCode(false)} />}
          {showCompanion && <CompanionLair onClose={() => setShowCompanion(false)} />}
          {showReconnect && <ReconnectModal onReconnect={handleReconnectConfirm} onCancel={handleReconnectCancel} />}
          
          <LevelUpManager />

          {profile?.is_admin && (
            <div className="fixed bottom-28 right-4 z-50 flex flex-col gap-3">
              <button onClick={() => setShowTournamentAdmin(true)} className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-full text-amber-400 hover:bg-amber-500 hover:text-black transition-all shadow-lg backdrop-blur-sm"><Crown className="w-6 h-6" /></button>
              <button onClick={() => setShowAdmin(true)} className="p-3 bg-slate-800/90 border border-cyan-500/30 rounded-full text-cyan-400 shadow-lg backdrop-blur-sm"><Settings className="w-6 h-6" /></button>
            </div>
          )}
        </>
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
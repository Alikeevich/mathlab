import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { LabMap } from './components/LabMap';
import { ModuleViewer } from './components/ModuleViewer';
import { Reactor } from './components/Reactor';
import { Dashboard } from './components/Dashboard';
import { Sector, Module } from './lib/supabase';
import { TermsPage } from './components/TermsPage';
import { Crown, Settings, Shield, Zap, Keyboard, Lock, ClipboardList } from 'lucide-react';
import { supabase } from './lib/supabase';
import 'katex/dist/katex.min.css';
import { AdminGenerator } from './components/AdminGenerator';
import { Leaderboard } from './components/Leaderboard';
import { Onboarding } from './components/Onboarding';
import { PvPMode } from './components/PvPMode';
import { VideoArchive } from './components/VideoArchive';
import { TournamentAdmin } from './components/TournamentAdmin';
import { TournamentLobby } from './components/TournamentLobby';
import { JoinTournamentModal } from './components/JoinTournamentModal';
import { CompanionLair } from './components/CompanionLair';
import { CompanionSetup } from './components/CompanionSetup';
import { LevelUpManager } from './components/LevelUpManager';
import { LegalModal } from './components/LegalModal';
import { AdminDashboard } from './components/AdminDashboard';
import PixelBlast from './components/PixelBlast';
import { Header } from './components/Header';
import { StickyReconnect } from './components/StickyReconnect';
import { ErrorAnalyzer } from './components/ErrorAnalyzer';
import { PricingPage } from './components/PricingPage';

type View = 'map' | 'modules' | 'reactor' | 'pvp' | 'tournament_lobby' | 'analyzer';

function MainApp() {
  const { user, loading, profile } = useAuth();
  const [view, setView] = useState<View>('map');
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  
  const [trainingProblemIds, setTrainingProblemIds] = useState<string[] | null>(null);
  
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
  const [showLegal, setShowLegal] = useState<'privacy' | 'terms' | 'refund' | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  const [activeGameSession, setActiveGameSession] = useState<{ duelId: string, tournamentId?: string } | null>(null);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);

  async function joinTournament(code: string) {
    if (!user) return;
    const { data: tour } = await supabase
      .from('tournaments')
      .select('id, status')
      .eq('code', code)
      .single();
    
    if (tour) {
      await supabase
        .from('tournament_participants')
        .upsert({ tournament_id: tour.id, user_id: user.id });
      
      setShowJoinCode(false);
      window.history.replaceState({}, document.title, "/");
      setActiveTournamentId(tour.id);
      setView('tournament_lobby');
    } else {
      alert("Турнир с таким кодом не найден!");
    }
  }

  useEffect(() => {
    async function checkActiveSession() {
      if (!user) return;
      
      const { data: duel } = await supabase
        .from('duels')
        .select('id, tournament_id, status')
        .eq('status', 'active')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .maybeSingle();

      if (duel) {
        setActiveGameSession({ duelId: duel.id, tournamentId: duel.tournament_id });
      } else {
        setActiveGameSession(null);
      }

      if (!duel) {
        const { data: part } = await supabase
          .from('tournament_participants')
          .select('tournament_id, tournaments(status)')
          .eq('user_id', user.id)
          .neq('tournaments.status', 'finished')
          .maybeSingle();

        if (part && part.tournaments) {
          setActiveTournamentId(part.tournament_id);
        }
      }
    }
    
    checkActiveSession();
    
    const channel = supabase
      .channel('global-game-check')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'duels' },
        (payload) => {
          const newData = payload.new;
          if (
            newData.status === 'finished' &&
            (newData.player1_id === user?.id || newData.player2_id === user?.id)
          ) {
            setActiveGameSession(null);
          } else {
            if (newData.player1_id === user?.id || newData.player2_id === user?.id) {
              checkActiveSession();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'duels', filter: `player1_id=eq.${user?.id}` },
        () => checkActiveSession()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'duels', filter: `player2_id=eq.${user?.id}` },
        () => checkActiveSession()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const tCode = new URLSearchParams(window.location.search).get('t');
    if (tCode) joinTournament(tCode);
  }, [user]);

  useEffect(() => {
    async function checkHosting() {
      if (!user) return;
      if (profile?.role === 'teacher' && !profile?.is_admin) {
        const { data } = await supabase
          .from('tournaments')
          .select('id')
          .eq('created_by', user.id)
          .in('status', ['waiting', 'active'])
          .maybeSingle();
        
        if (data) setShowTournamentAdmin(true);
      }
    }
    checkHosting();
  }, [user, profile]);

  useEffect(() => {
    if (!profile) return;
    
    if (profile.total_experiments === 0 && profile.clearance_level === 0) {
      const hasSeen = localStorage.getItem('onboarding_seen');
      if (!hasSeen) {
        setShowOnboarding(true);
        return;
      }
    }
    
    if (!profile.companion_name) {
      setShowCompanionSetup(true);
    }
  }, [profile, showOnboarding]);

  function finishOnboarding() {
    localStorage.setItem('onboarding_seen', 'true');
    setShowOnboarding(false);
  }

  function handleSectorSelect(sector: Sector) {
    setSelectedSector(sector);
    setView('modules');
  }

  function handleStartExperiment(module: Module) {
    setSelectedModule(module);
    setView('reactor');
    setTrainingProblemIds(null);
  }

  function handleBackToMap() {
    setView('map');
    setSelectedSector(null);
    setTrainingProblemIds(null);
  }

  function handleStartErrorTraining(problemIds: string[]) {
    setTrainingProblemIds(problemIds);
    setSelectedModule({
      id: 'error_training',
      sector_id: 0,
      name: 'Работа над ошибками',
      theory_content: '',
      order_index: 0,
      required_modules: []
    });
    setView('reactor');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-cyan-400">
        Загрузка...
      </div>
    );
  }

  if (!user && !isGuest && !showAuthModal) {
    return (
      <>
        <LandingPage
          onStartDemo={() => setIsGuest(true)}
          onLogin={() => setShowAuthModal(true)}
          onOpenLegal={(type) => setShowLegal(type)}
        />
        {showLegal && <LegalModal type={showLegal} onClose={() => setShowLegal(null)} />}
      </>
    );
  }

  if (!user && showAuthModal) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowAuthModal(false)}
          className="absolute top-4 left-4 text-white z-50 p-2 bg-slate-800 rounded-full border border-slate-700"
        >
          ← Назад
        </button>
        <Auth onOpenLegal={(type) => setShowLegal(type)} />
        {showLegal && <LegalModal type={showLegal} onClose={() => setShowLegal(null)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 relative selection:bg-cyan-500/30">
      
      <div className="absolute inset-0 z-0">
        <PixelBlast
          variant="circle"
          pixelSize={6}
          color="#B19EEF"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
        <div className="absolute inset-0 bg-slate-900/50 pointer-events-none" />
      </div>

      <div className="relative z-10 h-full flex flex-col">
        
        {activeGameSession && view !== 'pvp' && view !== 'tournament_lobby' && (
          <StickyReconnect
            duelId={activeGameSession.duelId}
            tournamentId={activeGameSession.tournamentId}
            onReconnect={() => {
              if (activeGameSession.tournamentId) {
                setActiveTournamentId(activeGameSession.tournamentId);
              }
              if (activeGameSession.duelId) {
                setView('pvp');
              } else if (activeGameSession.tournamentId) {
                setView('tournament_lobby');
              }
            }}
            onDiscard={() => {
              setActiveGameSession(null);
            }}
          />
        )}

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
                    <button
                      onClick={() => setShowJoinCode(true)}
                      className="p-3 bg-slate-800/90 backdrop-blur-md border-2 border-slate-600 rounded-2xl shadow-lg active:scale-95 transition-all"
                      title="Код турнира"
                    >
                      <Keyboard className="w-5 h-5 text-slate-400 hover:text-cyan-400 transition-colors" />
                    </button>

                    <button
                      onClick={() => setView('analyzer')}
                      className="flex-1 bg-slate-800/90 backdrop-blur-md border-2 border-amber-500/50 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 group"
                    >
                      <ClipboardList className="w-5 h-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
                      <span className="font-bold text-amber-300 text-xs uppercase hidden sm:inline tracking-wider">
                        Ошибки
                      </span>
                    </button>

                    <button
                      onClick={() => setView('pvp')}
                      className="flex-[2] relative flex items-center justify-center gap-2 bg-slate-900/90 backdrop-blur-md border-2 border-red-600 px-4 py-3 rounded-2xl shadow-lg shadow-red-900/20 active:scale-95 transition-all overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-red-600/10 group-hover:bg-red-600/20 transition-colors" />
                      <Zap className="w-6 h-6 text-red-500 fill-current animate-pulse" />
                      <span className="font-black text-white text-base tracking-widest italic uppercase">
                        PVP
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="bg-slate-900/90 border border-slate-700 px-6 py-3 rounded-full text-slate-400 text-sm flex items-center gap-2 backdrop-blur-md">
                    <Lock className="w-4 h-4" />
                    PvP и Турниры доступны после регистрации
                  </div>
                )}
              </div>
            </>
          )}

          {view === 'modules' && selectedSector && (
            <ModuleViewer
              sector={selectedSector}
              onBack={handleBackToMap}
              onStartExperiment={handleStartExperiment}
            />
          )}

          {view === 'reactor' && selectedModule && (
            <Reactor
              module={selectedModule}
              onBack={handleBackToMap}
              onRequestAuth={() => setShowAuthModal(true)}
              forcedProblemIds={trainingProblemIds}
            />
          )}

          {user && view === 'pvp' && (
            <PvPMode
              onBack={handleBackToMap}
              initialDuelId={activeGameSession?.duelId}
            />
          )}

          {user && view === 'tournament_lobby' && activeTournamentId && (
            <TournamentLobby tournamentId={activeTournamentId} />
          )}

          {user && view === 'analyzer' && (
            <ErrorAnalyzer 
              onBack={handleBackToMap} 
              onStartTraining={handleStartErrorTraining}
            />
          )}
        </main>
      </div>

      {user && (
        <>
          {showCompanionSetup && (
            <CompanionSetup onComplete={() => setShowCompanionSetup(false)} />
          )}
          {showOnboarding && <Onboarding onComplete={finishOnboarding} />}
          {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
          {showDashboard && <Dashboard onClose={() => setShowDashboard(false)} />}
          {showAdmin && <AdminGenerator onClose={() => setShowAdmin(false)} />}
          {showArchive && <VideoArchive onClose={() => setShowArchive(false)} />}
          {showTournamentAdmin && (
            <TournamentAdmin onClose={() => setShowTournamentAdmin(false)} />
          )}
          {showJoinCode && (
            <JoinTournamentModal
              onJoin={joinTournament}
              onClose={() => setShowJoinCode(false)}
            />
          )}
          {showCompanion && <CompanionLair onClose={() => setShowCompanion(false)} />}

          {showAdminDashboard && (
            <AdminDashboard onClose={() => setShowAdminDashboard(false)} />
          )}

          <LevelUpManager />

          {(profile?.role === 'admin' || profile?.role === 'teacher') && (
            <div className="fixed bottom-28 right-4 z-50 flex flex-col gap-3">
              <button
                onClick={() => setShowTournamentAdmin(true)}
                className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-full text-amber-400 hover:bg-amber-500 hover:text-black transition-all shadow-lg backdrop-blur-sm"
                title="Турниры"
              >
                <Crown className="w-6 h-6" />
              </button>

              {profile?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setShowAdmin(true)}
                    className="p-3 bg-slate-800/90 border border-cyan-500/30 rounded-full text-cyan-400 shadow-lg backdrop-blur-sm hover:bg-cyan-500 hover:text-black transition-all"
                    title="Генератор задач"
                  >
                    <Settings className="w-6 h-6" />
                  </button>

                  <button
                    onClick={() => setShowAdminDashboard(true)}
                    className="p-3 bg-red-600/20 border border-red-500/50 rounded-full text-red-400 shadow-lg backdrop-blur-sm hover:bg-red-600 hover:text-white transition-all"
                    title="Админ-центр"
                  >
                    <Shield className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// === ИЗМЕНЕННАЯ ФУНКЦИЯ APP ===
function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ВАЖНО: AuthProvider теперь оборачивает ВСЁ, включая логику роутинга
  return (
    <AuthProvider>
      {(() => {
        if (path === '/terms-and-conditions' || path === '/terms') {
          return <TermsPage />;
        }
        if (path === '/pricing') {
          return <PricingPage />;
        }
        return <MainApp />;
      })()}
    </AuthProvider>
  );
}

export default App;
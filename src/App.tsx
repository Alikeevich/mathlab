import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { LabMap } from './components/LabMap';
import { ModuleViewer } from './components/ModuleViewer';
import { Reactor } from './components/Reactor';
import { Dashboard } from './components/Dashboard';
import { Sector, Module } from './lib/supabase';
// ИКОНКИ
import { Menu, User, Settings, Trophy, Zap, MonitorPlay, Crown, Keyboard, Lock, Home, RotateCcw } from 'lucide-react';
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
import PixelBlast from './components/PixelBlast';

type View = 'map' | 'modules' | 'reactor' | 'pvp' | 'tournament_lobby';

function MainApp() {
  const { user, loading, profile } = useAuth();
  const [view, setView] = useState<View>('map');
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  
  // Состояния доступа
  const [isGuest, setIsGuest] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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
  
  // Состояния восстановления
  const [showReconnect, setShowReconnect] = useState(false);
  const [reconnectData, setReconnectData] = useState<{ type: 'tournament' | 'pvp', id?: string } | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Флаг, чтобы проверка запускалась только один раз
  const [sessionChecked, setSessionChecked] = useState(false);

  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);

  // === ФУНКЦИЯ ВХОДА В ТУРНИР ===
  async function joinTournament(code: string) {
    if (!user) return;
    
    const { data: tour } = await supabase
      .from('tournaments')
      .select('id, status')
      .eq('code', code)
      .single();

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

  // === РУЧНОЙ ПЕРЕЗАХОД ===
  async function manualReconnect() {
    if (!user) return;
    setIsReconnecting(true);

    try {
      // 1. ТУРНИР
      const { data: tourPart } = await supabase
        .from('tournament_participants')
        .select('tournament_id, tournaments(status)')
        .eq('user_id', user.id)
        .neq('tournaments.status', 'finished')
        .maybeSingle();

      if (tourPart && tourPart.tournaments) {
        setActiveTournamentId(tourPart.tournament_id);
        setView('tournament_lobby');
        return;
      }

      // 2. PVP
      const { data: duel } = await supabase
        .from('duels')
        .select('id')
        .eq('status', 'active')
        .is('tournament_id', null)
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .maybeSingle();

      if (duel) {
        setView('pvp');
        return;
      }

      alert("Активных игр не найдено.");
    } catch (e) {
      console.error(e);
    } finally {
      setIsReconnecting(false);
    }
  }

  // === ПРОВЕРКИ ПРИ ЗАГРУЗКЕ ===

  // 1. URL (код турнира)
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const tCode = params.get('t');
    if (tCode) {
      joinTournament(tCode);
    }
  }, [user]);

  // 2. АВТО-РЕКОННЕКТ (ИСПРАВЛЕННЫЙ)
  useEffect(() => {
    async function checkActiveSession() {
      // Если юзера нет, или мы уже проверили сессию, или мы уже в игре/лобби — не проверяем заново
      if (!user || sessionChecked || view === 'tournament_lobby' || view === 'pvp') return;

      setSessionChecked(true); // Помечаем, что проверка прошла

      // А. Проверяем ТУРНИР
      const { data: part } = await supabase
        .from('tournament_participants')
        .select('tournament_id, tournaments(status)')
        .eq('user_id', user.id)
        .neq('tournaments.status', 'finished') 
        .maybeSingle();

      if (part && part.tournaments) {
        setReconnectData({ type: 'tournament', id: part.tournament_id });
        setShowReconnect(true); 
        return;
      }

      // Б. Проверяем обычное PVP
      const { data: duel } = await supabase
        .from('duels')
        .select('id')
        .eq('status', 'active')
        .is('tournament_id', null) 
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .maybeSingle();

      if (duel) {
        setView('pvp');
      }
    }
    
    checkActiveSession();
  }, [user, sessionChecked, view]); // Добавили зависимости

  const handleReconnectConfirm = () => {
    if (reconnectData?.type === 'tournament' && reconnectData.id) {
      setActiveTournamentId(reconnectData.id);
      setView('tournament_lobby');
    }
    setShowReconnect(false);
  };
  
  const handleReconnectCancel = async () => {
     setShowReconnect(false);
     // Не сбрасываем sessionChecked, чтобы не спросило снова до перезагрузки
  };

  // 3. Авто-админка
  useEffect(() => {
    async function checkHosting() {
      if (!user || !profile?.is_admin) return;
      const { data } = await supabase.from('tournaments').select('id').eq('created_by', user.id).in('status', ['waiting', 'active']).maybeSingle();
      if (data) setShowTournamentAdmin(true);
    }
    checkHosting();
  }, [user, profile]);

  // 4. Онбординг
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

  const currentRank = profile ? getRank(profile.clearance_level, profile.is_admin) : { title: 'Гость', color: 'text-slate-400' };
  const progressPercent = profile ? getLevelProgress(profile.total_experiments) : 0;

  function handleSectorSelect(sector: Sector) { setSelectedSector(sector); setView('modules'); }
  function handleStartExperiment(module: Module) { setSelectedModule(module); setView('reactor'); }
  
  function handleBackToMap() {
    // ВАЖНОЕ ИСПРАВЛЕНИЕ НАВИГАЦИИ
    // Если мы в турнире (не важно, в бою или в лобби) и нажимаем "Назад" в шапке -> выходим на карту
    // Чтобы вернуться в турнир, юзер нажмет кнопку "Перезаход" (кружок)
    setView('map');
    setSelectedSector(null);
    setActiveTournamentId(null);
    // setSessionChecked(false); // Можно раскомментировать, если хотим, чтобы снова спросило при возврате, но лучше нет
  }
  
  function handleBackToModules() { setView('modules'); setSelectedModule(null); }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-cyan-400">Загрузка...</div>;

  if (!user && !isGuest && !showAuthModal) return <LandingPage onStartDemo={() => setIsGuest(true)} onLogin={() => setShowAuthModal(true)} />;

  if (!user && showAuthModal) return <div className="relative"><button onClick={() => setShowAuthModal(false)} className="absolute top-4 left-4 text-white z-50 p-2 bg-slate-800 rounded-full border border-slate-700">← Назад</button><Auth /></div>;

  return (
    <div className="min-h-screen bg-slate-900 relative selection:bg-cyan-500/30">
      
      <div className="absolute inset-0 z-0">
        <PixelBlast variant="circle" pixelSize={6} color="#B19EEF" patternScale={3} patternDensity={1.2} pixelSizeJitter={0.5} enableRipples rippleSpeed={0.4} rippleThickness={0.12} rippleIntensityScale={1.5} liquid liquidStrength={0.12} liquidRadius={1.2} liquidWobbleSpeed={5} speed={0.6} edgeFade={0.25} transparent />
        <div className="absolute inset-0 bg-slate-900/50 pointer-events-none" />
      </div>

      <div className="relative z-10 h-full flex flex-col">
        <header className="relative border-b border-cyan-500/20 bg-slate-900/50 backdrop-blur-sm z-10">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
            
            {/* Кнопка "НАЗАД / МЕНЮ" */}
            <button onClick={handleBackToMap} className="flex items-center gap-3 hover:opacity-80 transition-opacity group min-w-fit">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg group-hover:shadow-lg group-hover:shadow-cyan-500/20 transition-all">
                <Menu className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <h1 className="text-xl font-bold text-white leading-tight">MathLab</h1>
                <p className="text-cyan-400/60 text-xs">Научный центр</p>
              </div>
            </button>

            <div className="flex items-center gap-2 md:gap-4">
              {user ? (
                <>
                   {/* СУРИКАТ */}
                   {profile?.companion_name && (
                     <button 
                       onClick={() => setShowCompanion(true)}
                       className="relative group p-1 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors mr-2"
                       title={`Домик ${profile.companion_name}`}
                     >
                       <div className="w-8 h-8 flex items-center justify-center bg-black/20 rounded-lg overflow-hidden">
                          <img src="/meerkat/avatar.png" alt="Pet" className="w-full h-full object-contain group-hover:scale-110 transition-transform" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerText = '🦦'; }} />
                       </div>
                       {profile.companion_hunger < 30 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-slate-900 rounded-full animate-ping" />}
                     </button>
                   )}

                   <button onClick={() => setShowArchive(true)} className="p-1.5 md:p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors group" title="Архив Знаний"><MonitorPlay className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" /></button>
                   <button onClick={() => setShowLeaderboard(true)} className="p-1.5 md:p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors group" title="Рейтинг"><Trophy className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" /></button>
                   
                   <button onClick={() => setShowDashboard(true)} className="flex items-center gap-2 pl-2 border-l border-slate-700/50">
                      <div className="flex flex-col items-end">
                        <span className={`text-[10px] md:text-xs font-bold uppercase ${currentRank?.color}`}>{currentRank?.title.split(' ')[0]}</span>
                        <span className="hidden md:block text-white font-medium text-sm leading-none">{profile?.username}</span>
                        <div className="w-12 md:w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1"><div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} /></div>
                      </div>
                      <div className="p-1.5 md:p-2 bg-slate-800 rounded-lg border border-slate-700"><User className="w-4 h-4 md:w-5 md:h-5 text-slate-400" /></div>
                   </button>
                </>
              ) : (
                <div className="flex gap-3 items-center">
                  <button onClick={() => setIsGuest(false)} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-400 hover:text-white transition-colors" title="На главную"><Home className="w-5 h-5" /></button>
                  <button onClick={() => setShowAuthModal(true)} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-cyan-900/20">Войти</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="relative z-0 pb-24 md:pb-20 flex-1">
          {view === 'map' && (
            <>
              <LabMap onSectorSelect={handleSectorSelect} />
              
              <div className="fixed bottom-6 left-0 right-0 px-4 z-40 flex justify-center gap-3">
                {user ? (
                   <>
                    {/* КНОПКА ПЕРЕЗАХОДА (Крутится если грузит) */}
                    <button 
                      onClick={manualReconnect}
                      disabled={isReconnecting}
                      className="p-3 md:p-4 bg-slate-800 border-2 border-slate-600 rounded-2xl shadow-lg hover:border-cyan-400 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                      title="Проверить активные игры"
                    >
                      <RotateCcw className={`w-6 h-6 text-slate-300 ${isReconnecting ? 'animate-spin' : ''}`} />
                    </button>

                    <button 
                      onClick={() => setShowJoinCode(true)}
                      className="flex-1 max-w-[160px] group flex items-center justify-center gap-2 bg-slate-800 border-2 border-slate-600 px-4 py-3 rounded-2xl shadow-lg active:scale-95 transition-all"
                    >
                      <Keyboard className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                      <span className="font-bold text-slate-300 text-sm uppercase hidden sm:inline">Ввести код</span>
                    </button>

                    <button 
                      onClick={() => setView('pvp')}
                      className="flex-[2] max-w-[240px] group relative flex items-center justify-center gap-2 bg-slate-900 border-2 border-red-600 px-6 py-3 rounded-2xl shadow-lg shadow-red-900/20 active:scale-95 transition-all overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-red-600/10 group-hover:bg-red-600/20 transition-colors" />
                      <Zap className="w-8 h-8 text-red-500 fill-current animate-pulse" />
                      <span className="font-black text-white text-lg tracking-widest italic">PVP ARENA</span>
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
          
          {user && view === 'tournament_lobby' && activeTournamentId && (
            <TournamentLobby 
              tournamentId={activeTournamentId} 
              onBattleStart={() => setView('pvp')} 
            />
          )}
        </main>
      </div>

      {/* МОДАЛКИ (ТОЛЬКО ДЛЯ USER) */}
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
          
          {showReconnect && (
            <ReconnectModal 
              onReconnect={handleReconnectConfirm} 
              onCancel={handleReconnectCancel} 
            />
          )}
          
          <LevelUpManager />

          {profile?.is_admin && (
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
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
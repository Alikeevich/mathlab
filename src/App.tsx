import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { LabMap } from './components/LabMap';
import { ModuleViewer } from './components/ModuleViewer';
import { Reactor } from './components/Reactor';
import { Dashboard } from './components/Dashboard';
import { Sector, Module } from './lib/supabase';
import { Menu, User, Settings } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { AdminGenerator } from './components/AdminGenerator';

type View = 'map' | 'modules' | 'reactor';

function MainApp() {
  const { user, loading, profile } = useAuth();
  const [view, setView] = useState<View>('map');
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  
  // Состояние для админки уже есть
  const [showAdmin, setShowAdmin] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900 flex items-center justify-center">
        <div className="text-cyan-400 text-lg animate-pulse font-mono">Инициализация системы...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  function handleSectorSelect(sector: Sector) {
    setSelectedSector(sector);
    setView('modules');
  }

  function handleStartExperiment(module: Module) {
    setSelectedModule(module);
    setView('reactor');
  }

  function handleBackToMap() {
    setView('map');
    setSelectedSector(null);
  }

  function handleBackToModules() {
    setView('modules');
    setSelectedModule(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.05),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d410_1px,transparent_1px),linear-gradient(to_bottom,#06b6d410_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <header className="relative border-b border-cyan-500/20 bg-slate-900/50 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <button
            onClick={handleBackToMap}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg group-hover:shadow-lg group-hover:shadow-cyan-500/20 transition-all">
              <Menu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Алгебраическая Лаборатория</h1>
              <p className="text-cyan-400/60 text-xs">Научный центр математических исследований</p>
            </div>
          </button>

          <button
            onClick={() => setShowDashboard(true)}
            className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-cyan-500/30 rounded-lg transition-all"
          >
            <User className="w-5 h-5 text-cyan-400" />
            <div className="text-left">
              <div className="text-white font-medium text-sm">{profile?.username}</div>
              <div className="text-cyan-400/60 text-xs">LVL {profile?.clearance_level}</div>
            </div>
          </button>
        </div>
      </header>

      <main className="relative z-0 pb-20">
        {view === 'map' && <LabMap onSectorSelect={handleSectorSelect} />}
        {view === 'modules' && selectedSector && (
          <ModuleViewer
            sector={selectedSector}
            onBack={handleBackToMap}
            onStartExperiment={handleStartExperiment}
          />
        )}
        {view === 'reactor' && selectedModule && (
          <Reactor module={selectedModule} onBack={handleBackToModules} />
        )}
      </main>

      {/* Модальное окно профиля */}
      {showDashboard && <Dashboard onClose={() => setShowDashboard(false)} />}
      
      {/* Модальное окно Админки (Терминал Архитектора) */}
      {showAdmin && <AdminGenerator onClose={() => setShowAdmin(false)} />}

      {/* --- СЕКРЕТНАЯ КНОПКА (Плавает в углу) --- */}
      <button
        onClick={() => setShowAdmin(true)}
        className="fixed bottom-6 right-6 z-50 p-3 bg-slate-800/90 backdrop-blur-md border border-cyan-500/30 rounded-full shadow-lg shadow-cyan-500/10 hover:bg-slate-700 hover:scale-110 hover:border-cyan-400 transition-all group"
        title="Терминал Архитектора"
      >
        <Settings className="w-6 h-6 text-cyan-400 group-hover:rotate-90 transition-transform duration-700" />
      </button>

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

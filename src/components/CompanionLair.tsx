import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Utensils, Zap, Sparkles, Shirt, Crown, Star } from 'lucide-react';
import { CosmeticShop } from './CosmeticShop';

type Props = {
  onClose: () => void;
};

export function CompanionLair({ onClose }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [animationState, setAnimationState] = useState<'idle' | 'eating' | 'happy' | 'crying'>('idle');
  const [hunger, setHunger] = useState(profile?.companion_hunger || 100);
  const [showShop, setShowShop] = useState(false);
  
  // Состояния для одежды
  const [hatSrc, setHatSrc] = useState<string | null>(null);
  const [bodySrc, setBodySrc] = useState<string | null>(null);

  // === 1. СИНХРОНИЗАЦИЯ ГОЛОДА ===
  useEffect(() => {
    async function syncHunger() {
      if (!profile) return;
      const lastUpdate = profile.last_fed_at ? new Date(profile.last_fed_at).getTime() : Date.now();
      const now = Date.now();
      const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60);
      const hungerLoss = Math.floor(hoursPassed * 5);

      if (hungerLoss > 0) {
        const newHunger = Math.max(0, (profile.companion_hunger || 100) - hungerLoss);
        setHunger(newHunger);
        await supabase.from('profiles').update({ 
          companion_hunger: newHunger,
          last_fed_at: new Date().toISOString()
        }).eq('id', profile.id);
        refreshProfile();
      } else {
        setHunger(profile.companion_hunger);
      }
    }
    syncHunger();
    const interval = setInterval(syncHunger, 60000);
    return () => clearInterval(interval);
  }, []);

  // === 2. АВТО-ОПРЕДЕЛЕНИЕ ЭМОЦИИ ===
  useEffect(() => {
    if (animationState === 'eating' || animationState === 'happy') return;
    if (hunger < 30) {
      setAnimationState('crying');
    } else {
      setAnimationState('idle');
    }
  }, [hunger, animationState]);

  // === 3. ПОДГРУЗКА ОДЕЖДЫ ===
  useEffect(() => {
    const updateCosmetic = (originalUrl: string | null, setFunc: (s: string | null) => void) => {
      if (!originalUrl) { setFunc(null); return; }
      if (animationState === 'idle') { setFunc(originalUrl); return; }

      const poseUrl = originalUrl.replace('.png', `_${animationState}.png`);
      const img = new Image();
      img.src = poseUrl;
      img.onload = () => setFunc(poseUrl);
      img.onerror = () => setFunc(originalUrl);
    };
    updateCosmetic(profile?.equipped_hat, setHatSrc);
    updateCosmetic(profile?.equipped_body, setBodySrc);
  }, [profile?.equipped_hat, profile?.equipped_body, animationState]);

  // === ФУНКЦИИ ===
  const feedCompanion = async () => {
    if (hunger >= 100) return;
    setAnimationState('eating');
    const newHunger = Math.min(100, hunger + 20);
    setHunger(newHunger);
    await supabase.from('profiles').update({ companion_hunger: newHunger, last_fed_at: new Date().toISOString() }).eq('id', profile!.id);
    setTimeout(() => setAnimationState('happy'), 500);
    setTimeout(() => setAnimationState('idle'), 1500);
    refreshProfile();
  };

  const handlePet = () => {
    setAnimationState('happy');
    setTimeout(() => setAnimationState('idle'), 1000);
  };

  const getSprite = () => {
    switch (animationState) {
      case 'eating': return '/meerkat/eating.png';
      case 'happy': return '/meerkat/happy.png';
      case 'crying': return '/meerkat/crying.png';
      default: return '/meerkat/idle.png';
    }
  };

  const getAnimationClass = () => {
    switch (animationState) {
      case 'eating': return 'scale-105';
      case 'happy': return 'scale-110';
      case 'crying': return 'animate-bounce';
      default: return 'hover:scale-105 transition-transform';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
      
      {/* КАРТОЧКА */}
      <div className="w-full max-w-md bg-slate-900/90 border border-amber-500/30 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* ФОНОВЫЕ ЭФФЕКТЫ */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.15),transparent_60%)] pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        {/* КНОПКА ЗАКРЫТИЯ */}
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 z-50 p-2 bg-black/40 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors border border-white/5"
        >
          <X className="w-5 h-5" />
        </button>

        {/* === СЦЕНА (ВЕРХНЯЯ ЧАСТЬ) === */}
        <div className="relative h-80 w-full flex flex-col items-center justify-center shrink-0">
          
          {/* УРОВЕНЬ (ПЛАШКА) */}
          <div className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-amber-500/30 px-3 py-1.5 rounded-full">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-amber-100 font-bold text-xs">LVL {profile?.companion_level}</span>
          </div>

          {/* ПРОЖЕКТОР */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 h-12 bg-amber-500/20 blur-2xl rounded-full" />

          {/* ПЕРСОНАЖ */}
          <div 
             className={`relative z-10 w-64 h-64 flex items-center justify-center cursor-pointer ${getAnimationClass()}`}
             onClick={handlePet}
          >
             <img src={getSprite()} alt="Pet" className="absolute inset-0 w-full h-full object-contain z-10 drop-shadow-2xl" />
             {bodySrc && <img src={bodySrc} className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none" />}
             {hatSrc && <img src={hatSrc} className="absolute inset-0 w-full h-full object-contain z-30 pointer-events-none" />}
          </div>

          {/* ОБЛАЧКО ГОЛОДА */}
          {hunger < 30 && (
            <div className="absolute top-20 right-10 z-30 animate-bounce">
              <div className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg relative">
                Хочу есть! 🍖
                <div className="absolute bottom-[-4px] left-0 w-3 h-3 bg-red-500 transform rotate-45" />
              </div>
            </div>
          )}
        </div>

        {/* === ПАНЕЛЬ УПРАВЛЕНИЯ (НИЖНЯЯ ЧАСТЬ) === */}
        <div className="flex-1 bg-slate-950/50 backdrop-blur-md rounded-t-[2.5rem] p-6 border-t border-white/5 overflow-y-auto custom-scrollbar">
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-white">{profile?.companion_name}</h2>
            <p className="text-slate-500 text-xs uppercase tracking-widest font-mono">Ваш верный спутник</p>
          </div>

          {/* СТАТИСТИКА (HUD) */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* ШКАЛА ГОЛОДА */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                  <Utensils className="w-3 h-3 text-orange-400" /> Сытость
                </div>
                <span className={hunger < 30 ? 'text-red-400' : 'text-emerald-400 font-mono'}>{hunger}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ease-out ${hunger < 30 ? 'bg-red-500' : 'bg-gradient-to-r from-orange-500 to-yellow-500'}`} 
                  style={{ width: `${hunger}%` }} 
                />
              </div>
            </div>

            {/* ШКАЛА XP */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                  <Zap className="w-3 h-3 text-cyan-400" /> Опыт
                </div>
                <span className="text-cyan-400 font-mono">{profile?.companion_xp}/100</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700 ease-out" 
                  style={{ width: `${profile?.companion_xp || 0}%` }} 
                />
              </div>
            </div>
          </div>

          {/* КНОПКИ ДЕЙСТВИЙ */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={feedCompanion}
              disabled={hunger >= 100}
              className="py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-white font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <Utensils className="w-6 h-6 text-orange-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-slate-400 group-hover:text-white">Покормить</span>
            </button>
            
            <button 
              onClick={() => setShowShop(!showShop)}
              className={`py-4 border rounded-2xl font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group ${
                showShop 
                  ? 'bg-cyan-900/30 border-cyan-500 text-cyan-300' 
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
              }`}
            >
              <Shirt className={`w-6 h-6 group-hover:scale-110 transition-transform ${showShop ? 'text-cyan-400' : 'text-purple-400'}`} />
              <span className={`text-xs ${showShop ? 'text-cyan-300' : 'text-slate-400 group-hover:text-white'}`}>
                {showShop ? 'Закрыть' : 'Гардероб'}
              </span>
            </button>
          </div>

          {/* МАГАЗИН (ВЫЕЗЖАЕТ СНИЗУ) */}
          {showShop && (
             <div className="mt-4 animate-in slide-in-from-bottom-5 duration-300">
                <CosmeticShop />
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
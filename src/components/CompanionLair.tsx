import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Utensils, Zap, Sparkles } from 'lucide-react';
import { CosmeticShop } from './CosmeticShop';

type Props = {
  onClose: () => void;
};

export function CompanionLair({ onClose }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [animationState, setAnimationState] = useState<'idle' | 'eating' | 'happy' | 'crying'>('idle');
  const [hunger, setHunger] = useState(profile?.companion_hunger || 100);
  const [showShop, setShowShop] = useState(false);
  
  // Состояния для фоллбэка (если нет картинки для позы, используем обычную)
  const [hatSrc, setHatSrc] = useState<string | null>(null);
  const [bodySrc, setBodySrc] = useState<string | null>(null);

  // === 1. УМНАЯ СИНХРОНИЗАЦИЯ (Осталась без изменений) ===
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

  // === АВТОМАТИЧЕСКОЕ ОПРЕДЕЛЕНИЕ СОСТОЯНИЯ ===
  useEffect(() => {
    // Если идет активная анимация (ест/рад) - не трогаем
    if (animationState === 'eating' || animationState === 'happy') return;

    // Иначе ставим состояние по голоду
    if (hunger < 30) {
      setAnimationState('crying');
    } else {
      setAnimationState('idle');
    }
  }, [hunger, animationState]); // Следим за голодом

  // === УМНАЯ ПОДГРУЗКА ОДЕЖДЫ ===
  // Эта функция пытается найти картинку для текущей позы
  // Например: cap_crying.png. Если не находит - оставляет cap.png
  useEffect(() => {
    const updateCosmetic = (originalUrl: string | null, setFunc: (s: string | null) => void) => {
      if (!originalUrl) {
        setFunc(null);
        return;
      }
      
      // Если поза обычная - сразу ставим оригинал
      if (animationState === 'idle') {
        setFunc(originalUrl);
        return;
      }

      // Пытаемся создать путь типа: /cosmetics/cap_crying.png
      const poseUrl = originalUrl.replace('.png', `_${animationState}.png`);

      // Проверяем, существует ли файл
      const img = new Image();
      img.src = poseUrl;
      img.onload = () => setFunc(poseUrl); // Если есть - ставим его
      img.onerror = () => setFunc(originalUrl); // Если нет - ставим обычный (фоллбэк)
    };

    updateCosmetic(profile?.equipped_hat, setHatSrc);
    updateCosmetic(profile?.equipped_body, setBodySrc);

  }, [profile?.equipped_hat, profile?.equipped_body, animationState]);


  // === 2. ФУНКЦИЯ КОРМЛЕНИЯ ===
  const feedCompanion = async () => {
    if (hunger >= 100) return;
    
    setAnimationState('eating');
    const newHunger = Math.min(100, hunger + 20);
    setHunger(newHunger);

    await supabase.from('profiles').update({ 
      companion_hunger: newHunger,
      last_fed_at: new Date().toISOString()
    }).eq('id', profile!.id);

    setTimeout(() => setAnimationState('happy'), 500);
    setTimeout(() => setAnimationState('idle'), 1500); // Вернется в idle, а useEffect выше проверит, не нужно ли плакать
    
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
      case 'happy': return 'animate-pulse scale-110';
      case 'crying': return 'animate-bounce'; // Дрожит когда плачет
      default: return 'hover:scale-105 transition-transform';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[80] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            Домик {profile?.companion_name}
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </h2>
          <div className="text-slate-400 text-xs font-mono uppercase tracking-widest mt-1">
            Уровень {profile?.companion_level} • XP {profile?.companion_xp}/100
          </div>
        </div>

        {/* Сцена */}
        <div className="relative h-72 bg-slate-950/50 rounded-2xl border-2 border-slate-700 flex items-center justify-center mb-6 overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.1),transparent_70%)]" />

          {/* ПЕРСОНАЖ И ОДЕЖДА */}
          <div 
             className={`relative z-10 transition-all duration-300 cursor-pointer ${getAnimationClass()} h-56 w-56 flex items-center justify-center`}
             onClick={handlePet}
          >
             {/* 1. БАЗА */}
             <img 
               src={getSprite()} 
               alt="Сурикат" 
               className="absolute inset-0 w-full h-full object-contain z-10" 
             />

             {/* 2. ТЕЛО (Динамическое) */}
             {bodySrc && (
               <img 
                 src={bodySrc} 
                 className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none"
               />
             )}

             {/* 3. ГОЛОВА (Динамическая) */}
             {hatSrc && (
               <img 
                 src={hatSrc} 
                 className="absolute inset-0 w-full h-full object-contain z-30 pointer-events-none"
               />
             )}
          </div>

          {hunger < 30 && (
            <div className="absolute top-4 right-10 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-xl animate-bounce shadow-lg">
              Покорми меня! 🍖
            </div>
          )}
        </div>

        {/* Показатели */}
        <div className="space-y-4 mb-8">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1"><Utensils className="w-3 h-3" /> Сытость</span>
              <span>{hunger}%</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className={`h-full transition-all duration-500 ${hunger < 30 ? 'bg-red-500' : 'bg-green-500'}`} 
                style={{ width: `${hunger}%` }} 
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Энергия роста</span>
              <span>{profile?.companion_xp}%</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className="h-full bg-amber-400 transition-all duration-500 shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                style={{ width: `${profile?.companion_xp || 0}%` }} 
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={feedCompanion}
            disabled={hunger >= 100}
            className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Utensils className="w-5 h-5 text-orange-400" />
            Покормить
          </button>
          
          <button 
            onClick={() => setShowShop(!showShop)}
            className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all"
          >
            <div className="text-xl">👕</div>
            {showShop ? 'Закрыть' : 'Гардероб'}
          </button>
        </div>
        
        {showShop && <CosmeticShop />}

      </div>
    </div>
  );
}
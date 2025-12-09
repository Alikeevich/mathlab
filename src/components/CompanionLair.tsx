import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Utensils, Zap, Sparkles } from 'lucide-react';

type Props = {
  onClose: () => void;
};

export function CompanionLair({ onClose }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [animationState, setAnimationState] = useState<'idle' | 'eating' | 'happy'>('idle');
  
  // Локальное состояние голода для плавности
  const [hunger, setHunger] = useState(profile?.companion_hunger || 100);
  
  // === АВТО-СИНХРОНИЗАЦИЯ ГОЛОДА ===
  useEffect(() => {
    async function syncHunger() {
      if (!profile) return;

      const lastFed = profile.last_fed_at ? new Date(profile.last_fed_at).getTime() : Date.now();
      const now = Date.now();
      // Сколько часов прошло (для теста можно умножить на 60, чтобы голодал за минуты)
      const hoursPassed = (now - lastFed) / (1000 * 60 * 60); 
      
      // Формула: -5 сытости в час
      // Если прошло 2 часа -> 100 - 10 = 90
      let calculatedHunger = Math.max(0, 100 - Math.floor(hoursPassed * 5));

      // Если в базе значение неактуальное (например там 100, а реально 90)
      // Мы обновляем базу, чтобы везде было синхронно
      if (calculatedHunger !== profile.companion_hunger) {
        // Обновляем локально
        setHunger(calculatedHunger);
        
        // Обновляем в базе (тихо)
        await supabase.from('profiles').update({ 
          companion_hunger: calculatedHunger 
        }).eq('id', profile.id);
        
        // Обновляем контекст приложения
        refreshProfile();
      } else {
        setHunger(profile.companion_hunger);
      }
    }

    syncHunger();
    
    // Запускаем таймер, чтобы голод падал прямо на глазах, если долго сидеть в меню
    const interval = setInterval(syncHunger, 60000); // Каждую минуту проверка
    return () => clearInterval(interval);
  }, [profile?.last_fed_at]); // Зависим от времени кормления

  // ФУНКЦИЯ КОРМЛЕНИЯ
  const feedCompanion = async () => {
    if (hunger >= 100) return;
    
    setAnimationState('eating');
    
    // +20 к сытости, но не больше 100
    const newHunger = Math.min(100, hunger + 20);
    setHunger(newHunger);

    // ВАЖНО: Обновляем и сытость, и ВРЕМЯ ПОСЛЕДНЕГО КОРМЛЕНИЯ
    await supabase.from('profiles').update({ 
      companion_hunger: newHunger,
      last_fed_at: new Date().toISOString()
    }).eq('id', profile!.id);

    setTimeout(() => setAnimationState('happy'), 500);
    setTimeout(() => setAnimationState('idle'), 1500);
    
    refreshProfile();
  };

  // ФУНКЦИЯ ПОГЛАЖИВАНИЯ
  const handlePet = () => {
    setAnimationState('happy');
    setTimeout(() => setAnimationState('idle'), 1000);
  };

  const getSprite = () => {
    if (animationState === 'eating') return '/meerkat/eating.png';
    if (animationState === 'happy') return '/meerkat/happy.png';
    if (hunger < 30) return '/meerkat/crying.png';
    return '/meerkat/idle.png';
  };

  const getAnimationClass = () => {
    switch (animationState) {
      case 'eating': return 'scale-105'; // Просто чуть увеличивается, БЕЗ ПРЫЖКОВ
      default: return hunger < 30 ? 'animate-pulse opacity-80' : 'hover:scale-105 transition-transform';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
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

          {/* ПЕРСОНАЖ */}
          <div 
             className={`relative z-10 transition-all duration-300 cursor-pointer ${getAnimationClass()}`}
             onClick={handlePet}
          >
             <img 
               src={getSprite()} 
               alt="Сурикат" 
               className="w-56 h-56 object-contain drop-shadow-2xl" 
             />
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
            className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all opacity-50 cursor-not-allowed"
          >
            <div className="text-xl">👕</div>
            Нарядить
          </button>
        </div>

      </div>
    </div>
  );
}